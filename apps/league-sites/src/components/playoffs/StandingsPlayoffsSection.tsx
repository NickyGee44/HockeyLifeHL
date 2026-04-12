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
  const classes = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className={`${classes} object-contain`} />;
  }

  return (
    <div
      className={`${classes} flex items-center justify-center rounded-full text-xs font-black`}
      style={{ backgroundColor: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
      aria-label={name}
      title={name}
    >
      {name.charAt(0)}
    </div>
  );
}

function ShieldFrame({ className = 'h-14 w-12', tone = 'filled' }: { className?: string; tone?: 'filled' | 'muted' }) {
  const fill = tone === 'filled' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)';
  const stroke = tone === 'filled' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.26)';

  return (
    <svg viewBox="0 0 40 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 2L4 10V24C4 34 20 46 20 46C20 46 36 34 36 24V10L20 2Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ShieldNode({
  team,
  muted = false,
  trophy = false,
}: {
  team?: PlayoffPreview['firstRound'][number]['highSeed'] | null;
  muted?: boolean;
  trophy?: boolean;
}) {
  return (
    <div className="relative flex h-14 w-12 items-center justify-center">
      <ShieldFrame tone={muted ? 'muted' : 'filled'} />
      <div className="absolute inset-0 flex items-center justify-center">
        {team ? <TeamMark name={team.teamName} logoUrl={team.logoUrl} size="md" /> : <span className="sr-only">TBD</span>}
      </div>
      {trophy && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/trophy.png"
          alt="Championship"
          className="absolute -right-4 -top-3 h-10 w-10 object-contain drop-shadow-[0_6px_16px_rgba(255,215,0,0.35)]"
        />
      )}
    </div>
  );
}

function FirstRoundSeries({ series, showOutgoingConnector }: { series: PlayoffPreview['rounds'][number]['series'][number]; showOutgoingConnector: boolean }) {
  return (
    <div className="relative flex min-h-[150px] items-center">
      <div className="relative flex flex-col items-center gap-8 pr-7">
        <div className="relative">
          <ShieldNode team={series.highSeed} />
          <div className="absolute left-full top-1/2 h-px w-4 -translate-y-1/2 bg-[#8f8366]" />
        </div>
        <div className="relative">
          <ShieldNode team={series.lowSeed} />
          <div className="absolute left-full top-1/2 h-px w-4 -translate-y-1/2 bg-[#8f8366]" />
        </div>

        <div className="absolute right-3 top-[28px] h-[94px] w-px bg-[#8f8366]" />
        {showOutgoingConnector && <div className="absolute right-3 top-1/2 h-px w-4 -translate-y-1/2 bg-[#8f8366]" />}
      </div>
    </div>
  );
}

function LaterRoundSeries({
  isChampionship,
  showOutgoingConnector,
}: {
  isChampionship: boolean;
  showOutgoingConnector: boolean;
}) {
  return (
    <div className="relative flex min-h-[150px] items-center justify-center px-5">
      <div className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-[#8f8366]" />
      <ShieldNode muted trophy={isChampionship} />
      {showOutgoingConnector && <div className="absolute right-0 top-1/2 h-px w-5 -translate-y-1/2 bg-[#8f8366]" />}
    </div>
  );
}

function RoundColumn({
  round,
  isFirstRound,
  isChampionship,
  showOutgoingConnector,
}: {
  round: PlayoffPreview['rounds'][number];
  isFirstRound: boolean;
  isChampionship: boolean;
  showOutgoingConnector: boolean;
}) {
  return (
    <div className="flex min-w-[90px] flex-col justify-around gap-4">
      {round.series.map((series) => (
        <div key={`${round.roundNumber}-${series.seriesNumber}`} className="flex flex-1 items-center">
          {isFirstRound ? (
            <FirstRoundSeries series={series} showOutgoingConnector={showOutgoingConnector} />
          ) : (
            <LaterRoundSeries isChampionship={isChampionship} showOutgoingConnector={showOutgoingConnector} />
          )}
        </div>
      ))}
    </div>
  );
}

function PlayoffBrackets({ previews }: { previews: PlayoffPreview[] }) {
  return (
    <div className="space-y-8">
      {previews.map((preview) => (
        <div key={preview.divisionId ?? 'league'}>
          {preview.divisionName && (
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-sm font-black text-[var(--color-text-primary)]">{preview.divisionName}</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {preview.playoffTeamCount} Teams
              </span>
            </div>
          )}

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max items-stretch gap-2">
              {preview.rounds.map((round, index) => (
                <RoundColumn
                  key={`${preview.divisionId ?? 'league'}-${round.roundNumber}`}
                  round={round}
                  isFirstRound={index === 0}
                  isChampionship={index === preview.rounds.length - 1 && index > 0}
                  showOutgoingConnector={index < preview.rounds.length - 1}
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

  const panels = useMemo(
    () => ({
      preview: <PlayoffBrackets previews={previews} />,
      odds: <PlayoffOddsTable standings={standings} />,
    }),
    [previews, standings],
  );

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-center justify-between gap-4">
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

      <div>{panels[activePanel]}</div>
    </section>
  );
}
