'use client';

import { useMemo, useState } from 'react';
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

/* Grey shield SVG for TBD placeholders */
function TBDShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 48" fill="none" className={className} aria-label="TBD">
      <path
        d="M20 2L4 10V24C4 34 20 46 20 46C20 46 36 34 36 24V10L20 2Z"
        fill="currentColor"
        opacity="0.18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.25"
      />
    </svg>
  );
}

function BracketTeam({ team }: { team: PlayoffPreview['firstRound'][number]['highSeed'] }) {
  if (!team) {
    return (
      <div className="flex items-center justify-center py-3 opacity-35">
        <div className="h-10 w-10 rounded-full bg-white/10" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 px-2">
      <span className="text-[10px] font-black tabular-nums text-[var(--color-text-secondary)] w-4 text-right">
        #{team.rank}
      </span>
      <TeamMark name={team.teamName} logoUrl={team.logoUrl} />
    </div>
  );
}

function TBDSlot() {
  return (
    <div className="flex items-center justify-center py-4">
      <TBDShield className="w-8 h-10 text-white/40" />
    </div>
  );
}

function ChampionshipSlot() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative">
        <TBDShield className="w-10 h-12 text-white/40" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/trophy.png"
          alt="Championship"
          className="absolute -top-3 -right-3 w-8 h-8 drop-shadow-[0_2px_6px_rgba(255,215,0,0.5)]"
        />
      </div>
    </div>
  );
}

function RoundColumn({ round, isFirstRound, isChampionship }: { round: PlayoffPreview['rounds'][number]; isFirstRound: boolean; isChampionship: boolean }) {
  return (
    <div className="min-w-[140px] flex-1 flex flex-col">
      <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
        {round.label}
      </p>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {round.series.map((series) => (
          <div
            key={`${round.roundNumber}-${series.seriesNumber}`}
            className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden"
          >
            {isFirstRound ? (
              <>
                <BracketTeam team={series.highSeed} />
                <div className="mx-2 h-px bg-white/8" />
                <BracketTeam team={series.lowSeed} />
              </>
            ) : isChampionship ? (
              <ChampionshipSlot />
            ) : (
              <TBDSlot />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayoffBrackets({ previews }: { previews: PlayoffPreview[] }) {
  return (
    <div className="space-y-6">
      {previews.map((preview) => (
        <div key={preview.divisionId ?? 'league'}>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="text-sm font-black text-[var(--color-text-primary)]">{preview.divisionName ?? 'League Bracket'}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {preview.playoffTeamCount} Teams
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="flex min-w-max items-stretch gap-3 pb-1">
              {preview.rounds.map((round, index) => (
                <RoundColumn
                  key={`${preview.divisionId ?? 'league'}-${round.roundNumber}`}
                  round={round}
                  isFirstRound={index === 0}
                  isChampionship={index === preview.rounds.length - 1 && index > 0}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayoffOddsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Record</th>
            <th className="px-4 py-3">Chance of finishing 1st</th>
            <th className="px-4 py-3">Chance of making playoffs</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team) => (
            <tr key={team.team_id} className="border-b border-white/5 last:border-b-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <TeamMark name={team.team_name} logoUrl={team.team_logo} size="sm" />
                  <span className="hidden min-w-0 truncate font-semibold text-[var(--color-text-primary)] sm:inline">{team.team_name}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{team.wins}-{team.losses}-{team.ties}</td>
              <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">100%</td>
              <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">100%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StandingsPlayoffsSection({ previews, standings }: StandingsPlayoffsSectionProps) {
  const [activePanel, setActivePanel] = useState<PanelKey>('preview');
  const hasMultiplePreviewCards = previews.length > 1;

  const panels = useMemo(
    () => ({
      preview: <PlayoffBrackets previews={previews} />,
      odds: <PlayoffOddsTable standings={standings} />,
    }),
    [previews, standings],
  );

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Playoffs</h2>

        <div className="inline-flex rounded-full border border-white/10 bg-black/15 p-1 text-xs font-semibold">
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

      <div className="md:hidden">{panels[activePanel]}</div>
      <div className={`hidden md:grid gap-6 ${hasMultiplePreviewCards ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]' : 'lg:grid-cols-2'}`}>
        <div>{panels.preview}</div>
        <div>{panels.odds}</div>
      </div>
    </section>
  );
}
