'use client';

import { useRef, useState } from 'react';
import { Trophy, X, Loader2, AlertCircle } from 'lucide-react';
import { previewPlayoffSeeding, type PlayoffPreview, type PreviewTeam } from '@/lib/actions/playoffs';

interface SeedPreviewButtonProps {
  leagueId: string;
  seasonId: string;
  seasonName: string;
}

type State = 'idle' | 'loading' | 'open' | 'error';

function getRoundLabel(roundFromEnd: number, totalRounds: number): string {
  if (roundFromEnd === 1) return 'Championship';
  if (roundFromEnd === 2) return 'Semifinals';
  if (roundFromEnd === 3) return 'Quarterfinals';
  return `Round ${totalRounds - roundFromEnd + 1}`;
}

function PreviewTeamRow({ team, seed }: { team: PreviewTeam | null; seed?: number }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 opacity-30">
        <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
        <span className="text-sm text-[var(--color-text-secondary)] italic">BYE</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {seed !== undefined && (
        <span className="text-xs font-bold text-[var(--color-text-secondary)] w-4 flex-shrink-0 tabular-nums">
          {seed}
        </span>
      )}
      {team.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logoUrl} alt={team.teamName} className="w-5 h-5 rounded object-contain flex-shrink-0" />
      ) : (
        <div
          className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
          style={{ backgroundColor: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
        >
          {team.teamName.charAt(0)}
        </div>
      )}
      <span className="text-sm font-medium text-[var(--color-text-primary)] truncate flex-1 min-w-0">
        {team.teamName}
      </span>
      <span className="text-xs text-[var(--color-text-secondary)] flex-shrink-0 tabular-nums ml-2">
        {team.points} pts
      </span>
      {team.divisionName && (
        <span className="text-[10px] text-[var(--color-text-secondary)] opacity-60 flex-shrink-0 hidden sm:inline">
          {team.divisionName}
        </span>
      )}
    </div>
  );
}

function PreviewBracket({ preview }: { preview: PlayoffPreview }) {
  const subsequentRounds = preview.totalRounds - 1;

  return (
    <div className="space-y-6">
      {/* First Round */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-3">
          {preview.totalRounds === 1 ? 'Championship' : 'First Round'}
        </h3>
        <div className="space-y-2">
          {preview.firstRound.map((series) => (
            <div
              key={series.seriesNumber}
              className="rounded-xl border border-white/10 bg-[var(--color-surface)] overflow-hidden"
            >
              <PreviewTeamRow team={series.highSeed} seed={series.highSeed?.rank} />
              <div className="h-px bg-white/10 mx-3" />
              <PreviewTeamRow team={series.lowSeed} seed={series.lowSeed?.rank} />
            </div>
          ))}
        </div>
      </div>

      {/* Subsequent rounds — TBD placeholders */}
      {subsequentRounds > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)] mb-3">
            Later Rounds
          </h3>
          <div className="space-y-2">
            {Array.from({ length: subsequentRounds }, (_, i) => {
              const roundFromEnd = subsequentRounds - i;
              const label = getRoundLabel(roundFromEnd, preview.totalRounds);
              const seriesCount = Math.pow(2, i);
              return (
                <div
                  key={i}
                  className="rounded-xl border border-white/5 bg-[var(--color-surface)]/50 px-3 py-2 flex items-center justify-between opacity-50"
                >
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {seriesCount} {seriesCount === 1 ? 'series' : 'series'} — winners advance
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SeedPreviewButton({ leagueId, seasonId, seasonName }: SeedPreviewButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>('idle');
  const [preview, setPreview] = useState<PlayoffPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleClick() {
    setState('loading');
    const result = await previewPlayoffSeeding(leagueId, seasonId);
    if (!result.success) {
      setErrorMsg(result.error);
      setState('error');
      dialogRef.current?.showModal();
      return;
    }
    setPreview(result.data);
    setState('open');
    dialogRef.current?.showModal();
  }

  function handleClose() {
    dialogRef.current?.close();
    setState('idle');
    setPreview(null);
    setErrorMsg('');
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--league-primary)]/40 text-[var(--league-primary)] hover:bg-[var(--league-primary)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trophy className="w-4 h-4" />
        )}
        Preview Seeding
      </button>

      {/* Native dialog */}
      <dialog
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--color-background)] text-[var(--color-text-primary)] shadow-2xl backdrop:bg-black/60 p-0 open:flex open:flex-col"
        onClick={(e) => {
          // Close on backdrop click
          if (e.target === dialogRef.current) handleClose();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') handleClose();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-black text-[var(--color-text-primary)]">
              Playoff Seeding Preview
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Based on current standings — {seasonName}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[var(--color-text-secondary)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
          {/* Note banner */}
          <div className="mb-5 px-4 py-3 rounded-lg border border-[var(--league-primary)]/20 bg-[var(--league-primary)]/5 text-sm text-[var(--color-text-secondary)]">
            This is a preview only. The official bracket is set by the league administrator.
          </div>

          {state === 'error' && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {state === 'open' && preview && (
            <PreviewBracket preview={preview} />
          )}
        </div>
      </dialog>
    </>
  );
}
