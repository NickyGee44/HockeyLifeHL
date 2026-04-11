'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Trophy } from 'lucide-react';
import type { TeamStanding } from '@/lib/types';
import type { PlayoffPreview } from '@/lib/playoffs/preview';

interface StandingsPlayoffsSectionProps {
  previews: PlayoffPreview[];
  standings: TeamStanding[];
}

type PanelKey = 'preview' | 'odds';

function TeamMark({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string;
  logoUrl: string | null;
  size?: 'sm' | 'md';
}) {
  const classes = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className={`${classes} rounded-full object-contain bg-white/5 p-1`} />;
  }

  return (
    <div
      className={`${classes} rounded-full flex items-center justify-center text-xs font-black`}
      style={{ backgroundColor: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
      aria-label={name}
      title={name}
    >
      {name.charAt(0)}
    </div>
  );
}

function MatchupTeam({ team }: { team: PlayoffPreview['firstRound'][number]['highSeed'] }) {
  if (!team) {
    return (
      <div className="flex items-center justify-center py-4 opacity-35">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-white/10" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-secondary)]">Bye</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3 px-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11px] font-black tabular-nums text-[var(--color-text-secondary)]">#{team.rank}</span>
        <TeamMark name={team.teamName} logoUrl={team.logoUrl} />
      </div>
      <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">{team.points} pts</span>
    </div>
  );
}

function RoundColumn({ round, isFirstRound }: { round: PlayoffPreview['rounds'][number]; isFirstRound: boolean }) {
  return (
    <div className="min-w-[170px] flex-1">
      <p className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
        {round.label}
      </p>
      <div className="space-y-4">
        {round.series.map((series) => (
          <div key={`${round.roundNumber}-${series.seriesNumber}`} className="rounded-2xl border border-white/10 bg-black/10 overflow-hidden">
            <div className="border-b border-white/10 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
              Series {series.seriesNumber}
            </div>
            {isFirstRound ? (
              <>
                <MatchupTeam team={series.highSeed} />
                <div className="mx-3 h-px bg-white/10" />
                <MatchupTeam team={series.lowSeed} />
              </>
            ) : (
              <div className="flex min-h-[113px] items-center justify-center px-4 py-5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] opacity-75">
                Winner advances
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayoffPreviewCards({ previews }: { previews: PlayoffPreview[] }) {
  return (
    <div className="space-y-4">
      {previews.map((preview) => (
        <section key={preview.divisionId ?? 'league'} className="rounded-[1.5rem] border border-white/10 bg-[var(--color-surface)]/60 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">Playoff Preview</p>
              <h3 className="mt-1 text-lg font-black text-[var(--color-text-primary)]">{preview.divisionName ?? 'League Bracket'}</h3>
            </div>
            <span className="rounded-full border border-[var(--league-primary)]/25 bg-[var(--league-primary)]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--league-primary)]">
              {preview.playoffTeamCount} Teams
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-4 pb-1">
              {preview.rounds.map((round, index) => (
                <RoundColumn key={`${preview.divisionId ?? 'league'}-${round.roundNumber}`} round={round} isFirstRound={index === 0} />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function PlayoffOddsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--color-surface)]/60">
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">Playoff Odds</p>
        <h3 className="mt-1 text-lg font-black text-[var(--color-text-primary)]">If the season ended today</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
              <th className="px-4 py-3 sm:px-5">Team</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Chance of finishing 1st</th>
              <th className="px-4 py-3 sm:px-5">Chance of making playoffs</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team) => (
              <tr key={team.team_id} className="border-b border-white/5 last:border-b-0">
                <td className="px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-3">
                    <TeamMark name={team.team_name} logoUrl={team.team_logo} size="sm" />
                    <span className="hidden min-w-0 truncate font-semibold text-[var(--color-text-primary)] sm:inline">{team.team_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{team.wins}-{team.losses}-{team.ties}</td>
                <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">100%</td>
                <td className="px-4 py-3 sm:px-5 font-semibold text-[var(--color-text-primary)]">100%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StandingsPlayoffsSection({ previews, standings }: StandingsPlayoffsSectionProps) {
  const [activePanel, setActivePanel] = useState<PanelKey>('preview');
  const hasMultiplePreviewCards = previews.length > 1;

  const panels = useMemo(
    () => ({
      preview: <PlayoffPreviewCards previews={previews} />,
      odds: <PlayoffOddsTable standings={standings} />,
    }),
    [previews, standings],
  );

  return (
    <section className="mt-10 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--color-surface)]/75 shadow-[0_32px_120px_-48px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--league-primary)_18%,transparent),transparent_55%)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Playoffs</h2>
              <div className="inline-flex md:hidden rounded-full border border-white/10 bg-black/15 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActivePanel('preview')}
                  className={`rounded-full px-3 py-1.5 transition-colors ${activePanel === 'preview' ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]' : 'text-[var(--color-text-secondary)]'}`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel('odds')}
                  className={`rounded-full px-3 py-1.5 transition-colors ${activePanel === 'odds' ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]' : 'text-[var(--color-text-secondary)]'}`}
                >
                  Odds
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              A live snapshot of how the playoff field lines up today.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2"><Trophy className="h-3.5 w-3.5" /> Preview</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-2"><BarChart3 className="h-3.5 w-3.5" /> Odds</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="md:hidden">{panels[activePanel]}</div>
        <div className={`hidden md:grid gap-6 ${hasMultiplePreviewCards ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]' : 'lg:grid-cols-2'}`}>
          <div>{panels.preview}</div>
          <div>{panels.odds}</div>
        </div>
      </div>
    </section>
  );
}
