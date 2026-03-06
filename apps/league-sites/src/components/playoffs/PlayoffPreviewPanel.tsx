'use client';

import { useMemo, useState, useTransition } from 'react';
import { Trophy, Loader2, RefreshCw, AlertCircle, Layers3, ArrowRight } from 'lucide-react';
import { previewPlayoffSeeding, type PlayoffPreview, type PreviewTeam } from '@/lib/actions/playoffs';
import type { PlayoffPreviewContext, PlayoffPreviewDivisionOption } from '@/lib/playoffs/preview';

interface PlayoffPreviewPanelProps {
  leagueId: string;
  seasonId: string;
  seasonName: string;
  previewContext: PlayoffPreviewContext;
}

function getRoundLabel(roundFromEnd: number, totalRounds: number): string {
  if (roundFromEnd === 1) return 'Championship';
  if (roundFromEnd === 2) return 'Semifinals';
  if (roundFromEnd === 3) return 'Quarterfinals';
  return `Round ${totalRounds - roundFromEnd + 1}`;
}

function PreviewTeamRow({ team, seed }: { team: PreviewTeam | null; seed?: number }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 opacity-35">
        <div className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
        <span className="text-sm text-[var(--color-text-secondary)] italic">BYE</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      {seed !== undefined && (
        <span className="w-5 text-center text-xs font-black tabular-nums text-[var(--color-text-secondary)]">
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
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
        {team.teamName}
      </span>
      <span className="ml-2 flex-shrink-0 text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
        {team.points} pts
      </span>
    </div>
  );
}

function PreviewBracket({ preview }: { preview: PlayoffPreview }) {
  const laterRounds = preview.totalRounds - 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--league-primary)]/30 bg-[var(--league-primary)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--league-primary)]">
          {preview.divisionName ? `${preview.divisionName} Preview` : 'League Preview'}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {preview.playoffTeamCount} teams, {preview.totalRounds} rounds
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {preview.firstRound.map((series) => (
          <div
            key={series.seriesNumber}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--color-surface)]/80"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
                Series {series.seriesNumber}
              </span>
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                First Round
              </span>
            </div>
            <PreviewTeamRow team={series.highSeed} seed={series.highSeed?.rank} />
            <div className="mx-3 h-px bg-white/10" />
            <PreviewTeamRow team={series.lowSeed} seed={series.lowSeed?.rank} />
          </div>
        ))}
      </div>

      {laterRounds > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)]/50 p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
            Later Rounds
          </p>
          <div className="grid gap-2">
            {Array.from({ length: laterRounds }, (_, index) => {
              const roundFromEnd = laterRounds - index;
              const label = getRoundLabel(roundFromEnd, preview.totalRounds);
              return (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-3 py-2"
                >
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
                  <span className="inline-flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    Winners advance
                    <ArrowRight className="w-3.5 h-3.5" />
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

function DivisionChips({
  divisions,
  selectedDivisionId,
  onSelect,
}: {
  divisions: PlayoffPreviewDivisionOption[];
  selectedDivisionId: string;
  onSelect: (divisionId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {divisions.map((division) => {
        const selected = division.id === selectedDivisionId;
        return (
          <button
            key={division.id}
            type="button"
            onClick={() => onSelect(division.id)}
            className={`rounded-full border px-3 py-2 text-left transition-colors ${
              selected
                ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/14 text-[var(--league-primary)]'
                : 'border-white/10 bg-black/10 text-[var(--color-text-secondary)] hover:border-white/20 hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span className="block text-sm font-semibold">{division.name}</span>
            <span className="block text-[11px] opacity-75">{division.teamCount} teams in standings</span>
          </button>
        );
      })}
    </div>
  );
}

export function PlayoffPreviewPanel({
  leagueId,
  seasonId,
  seasonName,
  previewContext,
}: PlayoffPreviewPanelProps) {
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [preview, setPreview] = useState<PlayoffPreview | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const selectedDivision = useMemo(
    () => previewContext.availableDivisions.find((division) => division.id === selectedDivisionId) ?? null,
    [previewContext.availableDivisions, selectedDivisionId],
  );

  const hasPreviewableTeams = previewContext.totalTeams >= 2;
  const canGenerate = hasPreviewableTeams && (!previewContext.requiresDivisionSelection || !!selectedDivisionId);

  const handleGeneratePreview = () => {
    if (!canGenerate) {
      setError(
        previewContext.requiresDivisionSelection
          ? 'Choose a division before generating the preview.'
          : 'At least two teams need standings before a preview can be generated.'
      );
      return;
    }

    setError('');
    startTransition(async () => {
      const result = await previewPlayoffSeeding(
        leagueId,
        seasonId,
        previewContext.requiresDivisionSelection ? selectedDivisionId : undefined,
      );

      if (!result.success) {
        setPreview(null);
        setError(result.error);
        return;
      }

      setPreview(result.data);
    });
  };

  const buttonLabel = preview
    ? previewContext.requiresDivisionSelection
      ? 'Regenerate Division Preview'
      : 'Regenerate Preview'
    : previewContext.requiresDivisionSelection
      ? 'Generate Division Preview'
      : 'Generate Preview';

  return (
    <section className="mb-8 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--color-surface)]/75 shadow-[0_32px_120px_-48px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--league-primary)_18%,transparent),transparent_55%)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--league-primary)]/25 bg-[var(--league-primary)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--league-primary)]">
              <Layers3 className="w-3.5 h-3.5" />
              Preview Only
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
              Projected Playoff Seeding
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              This panel never changes the official bracket. It only projects what the playoff field looks like right now for {seasonName}.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={isPending || !canGenerate}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--league-primary)]/35 bg-[var(--league-primary)]/12 px-4 py-2 text-sm font-semibold text-[var(--league-primary)] transition-colors hover:bg-[var(--league-primary)]/18 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : preview ? <RefreshCw className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            {buttonLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          {previewContext.requiresDivisionSelection ? (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
                Choose Division
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Each division has its own playoff race. Pick a division, then generate a read-only preview.
              </p>
              <div className="mt-4">
                <DivisionChips
                  divisions={previewContext.availableDivisions}
                  selectedDivisionId={selectedDivisionId}
                  onSelect={setSelectedDivisionId}
                />
              </div>
              {!selectedDivision && (
                <p className="mt-3 text-xs text-[var(--color-text-secondary)] opacity-80">
                  No division selected yet.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
                League Snapshot
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                This league currently previews one bracket from the active standings.
              </p>
              <p className="mt-4 text-3xl font-black text-[var(--color-text-primary)]">
                {previewContext.totalTeams}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                Teams with standings
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
              Preview Rules
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li>Uses current standings only.</li>
              <li>Shows projected first-round matchups and later-round placeholders.</li>
              <li>Does not create or overwrite the official playoff bracket.</li>
            </ul>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              <AlertCircle className="mt-0.5 w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
          {preview ? (
            <PreviewBracket preview={preview} />
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 text-center">
              <Trophy className="mb-4 h-10 w-10 text-[var(--league-primary)] opacity-70" />
              <h3 className="text-lg font-black text-[var(--color-text-primary)]">
                {previewContext.requiresDivisionSelection ? 'Division preview not generated yet' : 'Preview not generated yet'}
              </h3>
              <p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
                {previewContext.requiresDivisionSelection
                  ? 'Select a division and generate a bracket preview to see the current playoff race without touching the real bracket.'
                  : 'Generate a bracket preview to see how the current standings project the playoff field.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
