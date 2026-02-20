'use client';

import { useState, useRef, useCallback } from 'react';
import type { GameData, PlayerData } from '@/lib/actions/scorekeeper';
import { batchAddEvents } from '@/lib/actions/scorekeeper';
import { EventEditSheet } from './EventEditSheet';

interface ScoreSheetUploadProps {
  gameId: string;
  game: GameData;
  onComplete: () => void;
  onClose: () => void;
}

export interface ExtractedGoal {
  period: number;
  timeMinutes: number;
  timeSeconds: number;
  teamType: 'home' | 'away';
  scorerJersey: number;
  assist1Jersey: number | null;
  assist2Jersey: number | null;
  confidence?: number;
}

export interface ExtractedPenalty {
  period: number;
  timeMinutes: number;
  timeSeconds: number;
  teamType: 'home' | 'away';
  playerJersey: number;
  type: string;
  minutes: number;
  confidence?: number;
}

export type ExtractedEvent =
  | { kind: 'goal'; data: ExtractedGoal; id: string }
  | { kind: 'penalty'; data: ExtractedPenalty; id: string };

type UploadState = 'select' | 'preview' | 'analyzing' | 'review' | 'saving';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ScoreSheetUpload({ gameId, game, onComplete, onClose }: ScoreSheetUploadProps) {
  const [state, setState] = useState<UploadState>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ addedCount: number; errors: string[] } | null>(null);
  const [sheetLayout, setSheetLayout] = useState<'home-left' | 'home-right' | 'unknown'>('unknown');
  const [editingEvent, setEditingEvent] = useState<ExtractedEvent | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(file: File | null) {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be under 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setState('preview');
  }

  async function handleAnalyze() {
    if (!selectedFile) return;

    setState('analyzing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('gameId', gameId);
      formData.append('homeTeamName', game.homeTeam.name);
      formData.append('awayTeamName', game.awayTeam.name);
      formData.append('homeRoster', JSON.stringify(
        game.homeTeam.roster.map((p: PlayerData) => ({
          jerseyNumber: p.jerseyNumber,
          fullName: p.fullName,
        }))
      ));
      formData.append('awayRoster', JSON.stringify(
        game.awayTeam.roster.map((p: PlayerData) => ({
          jerseyNumber: p.jerseyNumber,
          fullName: p.fullName,
        }))
      ));
      formData.append('sheetLayout', sheetLayout);

      const response = await fetch('/api/scorekeeper/analyze-scoresheet', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Analysis failed');
      }

      const result = await response.json();

      const events: ExtractedEvent[] = [];
      let idCounter = 0;

      (result.goals || []).forEach((g: ExtractedGoal) => {
        events.push({ kind: 'goal', data: g, id: `evt-${idCounter++}` });
      });

      (result.penalties || []).forEach((p: ExtractedPenalty) => {
        events.push({ kind: 'penalty', data: p, id: `evt-${idCounter++}` });
      });

      // Sort by period then time
      events.sort((a, b) => {
        const aData = a.kind === 'goal' ? a.data : a.data;
        const bData = b.kind === 'goal' ? b.data : b.data;
        if (aData.period !== bData.period) return aData.period - bData.period;
        const aTime = aData.timeMinutes * 60 + aData.timeSeconds;
        const bTime = bData.timeMinutes * 60 + bData.timeSeconds;
        return aTime - bTime;
      });

      setExtractedEvents(events);
      setState('review');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze score sheet');
      setState('preview');
    }
  }

  function handleRemoveEvent(id: string) {
    setExtractedEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const handleUpdateEvent = useCallback((id: string, updated: ExtractedEvent) => {
    setExtractedEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    setEditingEvent(null);
  }, []);

  async function handleSaveAll() {
    if (extractedEvents.length === 0) return;

    setState('saving');
    setError(null);

    const mapped = extractedEvents.map((evt) => {
      if (evt.kind === 'goal') {
        const g = evt.data;
        return {
          type: 'goal' as const,
          teamType: g.teamType,
          period: g.period,
          gameTimeSeconds: g.timeMinutes * 60 + g.timeSeconds,
          scorerJersey: g.scorerJersey,
          assist1Jersey: g.assist1Jersey,
          assist2Jersey: g.assist2Jersey,
        };
      } else {
        const p = evt.data;
        return {
          type: 'penalty' as const,
          teamType: p.teamType,
          period: p.period,
          gameTimeSeconds: p.timeMinutes * 60 + p.timeSeconds,
          playerJersey: p.playerJersey,
          penaltyType: p.type,
          penaltyMinutes: p.minutes,
        };
      }
    });

    try {
      const result = await batchAddEvents(gameId, mapped);
      setSaveResult({ addedCount: result.addedCount, errors: result.errors });

      if (result.success) {
        // Brief delay to show result before closing
        setTimeout(() => onComplete(), 1200);
      } else {
        setError('Some events failed to save');
        setState('review');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save events');
      setState('review');
    }
  }

  function findPlayerName(teamType: 'home' | 'away', jersey: number | null): string | null {
    if (jersey == null) return null;
    const roster = teamType === 'home' ? game.homeTeam.roster : game.awayTeam.roster;
    const player = roster.find((p: PlayerData) => p.jerseyNumber === jersey);
    return player?.fullName || null;
  }

  function handleBack() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setState('select');
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Score Sheet Upload
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* SELECT state */}
        {state === 'select' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-full max-w-sm border-2 border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                Take a photo of the score sheet or choose from your gallery
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] font-semibold transition-all hover:opacity-90 active:scale-95"
                >
                  Take Photo
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-primary)] font-medium border border-[var(--color-border)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-95"
                >
                  Choose from Gallery
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        )}

        {/* PREVIEW state */}
        {state === 'preview' && previewUrl && (
          <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
            <div className="w-full rounded-xl overflow-hidden border border-[var(--color-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Score sheet preview"
                className="w-full h-auto"
              />
            </div>

            {/* Team Side Selector */}
            <div className="w-full">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2 text-center">
                Which side is the home team on?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSheetLayout('home-left')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                    sheetLayout === 'home-left'
                      ? 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] border-transparent'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]'
                  }`}
                >
                  ← Left: {game.homeTeam.shortName || game.homeTeam.name}
                </button>
                <button
                  onClick={() => setSheetLayout('home-right')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                    sheetLayout === 'home-right'
                      ? 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] border-transparent'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)]'
                  }`}
                >
                  {game.homeTeam.shortName || game.homeTeam.name}: Right →
                </button>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={handleBack}
                className="flex-1 py-3 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-primary)] font-medium border border-[var(--color-border)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-95"
              >
                Back
              </button>
              <button
                onClick={handleAnalyze}
                className="flex-1 py-3 rounded-xl bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] font-semibold transition-all hover:opacity-90 active:scale-95"
              >
                Analyze Score Sheet
              </button>
            </div>
          </div>
        )}

        {/* ANALYZING state */}
        {state === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-10 h-10 border-3 border-[var(--color-border)] border-t-[var(--league-primary,#d4af37)] rounded-full animate-spin" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              Analyzing score sheet...
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              This may take a few seconds
            </p>
          </div>
        )}

        {/* REVIEW state */}
        {state === 'review' && (
          <div className="max-w-lg mx-auto">
            {extractedEvents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  No events found in the score sheet.
                </p>
                <button
                  onClick={handleBack}
                  className="mt-4 px-4 py-2 rounded-lg text-sm text-[var(--color-text-primary)] bg-[var(--color-surface)] border border-[var(--color-border)]"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  Found {extractedEvents.length} event{extractedEvents.length !== 1 ? 's' : ''}. Tap an event to edit, or remove incorrect entries.
                </p>

                {/* Group by period */}
                {Array.from(
                  extractedEvents.reduce((map, evt) => {
                    const period = evt.kind === 'goal' ? evt.data.period : evt.data.period;
                    if (!map.has(period)) map.set(period, []);
                    map.get(period)!.push(evt);
                    return map;
                  }, new Map<number, ExtractedEvent[]>())
                )
                  .sort(([a], [b]) => a - b)
                  .map(([period, periodEvents]) => (
                    <div key={period} className="mb-4">
                      <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                        Period {period}
                      </h3>
                      <div className="space-y-1.5">
                        {periodEvents.map((evt) => (
                          <ReviewEventRow
                            key={evt.id}
                            event={evt}
                            homeTeamName={game.homeTeam.shortName || game.homeTeam.name}
                            awayTeamName={game.awayTeam.shortName || game.awayTeam.name}
                            findPlayerName={findPlayerName}
                            onRemove={() => handleRemoveEvent(evt.id)}
                            onEdit={() => setEditingEvent(evt)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                <div className="flex gap-3 mt-6 sticky bottom-0 py-4 bg-[var(--color-background)]">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-primary)] font-medium border border-[var(--color-border)] transition-all hover:bg-[var(--color-surface-hover)] active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAll}
                    className="flex-1 py-3 rounded-xl bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] font-semibold transition-all hover:opacity-90 active:scale-95"
                  >
                    Save All ({extractedEvents.length} events)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SAVING state */}
        {state === 'saving' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            {saveResult ? (
              <>
                <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-[var(--color-text-primary)] font-medium">
                  Saved {saveResult.addedCount} event{saveResult.addedCount !== 1 ? 's' : ''}
                </p>
                {saveResult.errors.length > 0 && (
                  <div className="text-xs text-yellow-400 text-center">
                    {saveResult.errors.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-10 h-10 border-3 border-[var(--color-border)] border-t-[var(--league-primary,#d4af37)] rounded-full animate-spin" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Saving {extractedEvents.length} event{extractedEvents.length !== 1 ? 's' : ''}...
                </p>
              </>
            )}
          </div>
        )}
        {/* Event Edit Sheet */}
        {editingEvent && (
          <EventEditSheet
            event={editingEvent}
            game={game}
            onSave={(updated) => handleUpdateEvent(editingEvent.id, updated)}
            onClose={() => setEditingEvent(null)}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ReviewEventRow sub-component
// =============================================================================

function ReviewEventRow({
  event,
  homeTeamName,
  awayTeamName,
  findPlayerName,
  onRemove,
  onEdit,
}: {
  event: ExtractedEvent;
  homeTeamName: string;
  awayTeamName: string;
  findPlayerName: (teamType: 'home' | 'away', jersey: number | null) => string | null;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const isGoal = event.kind === 'goal';
  const data = event.data;
  const teamName = data.teamType === 'home' ? homeTeamName : awayTeamName;
  const time = `${data.timeMinutes}:${data.timeSeconds.toString().padStart(2, '0')}`;
  const confidence = data.confidence;
  const isLowConfidence = confidence != null && confidence < 0.7;

  let label: string;
  let hasWarning = false;

  if (isGoal) {
    const g = data as ExtractedGoal;
    const scorerName = findPlayerName(g.teamType, g.scorerJersey);
    if (!scorerName) hasWarning = true;
    label = `GOAL - #${g.scorerJersey} ${scorerName || '(unknown)'}`;
    if (g.assist1Jersey != null) {
      const a1Name = findPlayerName(g.teamType, g.assist1Jersey);
      if (!a1Name) hasWarning = true;
      label += ` (A: #${g.assist1Jersey} ${a1Name || '?'}`;
      if (g.assist2Jersey != null) {
        const a2Name = findPlayerName(g.teamType, g.assist2Jersey);
        if (!a2Name) hasWarning = true;
        label += `, #${g.assist2Jersey} ${a2Name || '?'}`;
      }
      label += ')';
    }
  } else {
    const p = data as ExtractedPenalty;
    const playerName = findPlayerName(p.teamType, p.playerJersey);
    if (!playerName) hasWarning = true;
    label = `PENALTY - #${p.playerJersey} ${playerName || '(unknown)'} - ${p.type} (${p.minutes}min)`;
  }

  // Left border color: orange for jersey warning, yellow for low confidence, transparent otherwise
  const borderColor = hasWarning
    ? 'border-l-orange-400'
    : isLowConfidence
      ? 'border-l-yellow-400'
      : 'border-l-transparent';

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color-surface)] group border-l-[3px] ${borderColor}`}>
      {/* Icon */}
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
          isGoal ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
        }`}
      >
        {isGoal ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2z" />
          </svg>
        )}
      </div>

      {/* Content — tappable for edit */}
      <button
        onClick={onEdit}
        className="flex-1 min-w-0 text-left"
      >
        <div className="text-sm text-[var(--color-text-primary)] truncate">
          {label}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {time}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {teamName}
          </span>
          {hasWarning && (
            <span className="text-[10px] font-bold text-orange-400">
              Jersey not found
            </span>
          )}
          {isLowConfidence && !hasWarning && (
            <span className="text-[10px] font-bold text-yellow-400">
              Check this
            </span>
          )}
        </div>
      </button>

      {/* Edit button (pencil) */}
      <button
        onClick={onEdit}
        className="flex-shrink-0 p-2 rounded-lg hover:bg-[var(--color-surface-hover,var(--color-surface))] text-[var(--color-text-secondary)] transition-all"
        aria-label="Edit event"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      </button>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-2 rounded-lg hover:bg-red-500/10 text-[var(--color-text-secondary)] hover:text-red-400 transition-all"
        aria-label="Remove event"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
