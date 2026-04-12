'use client';

import { useMemo, useState } from 'react';
import type { TeamStanding } from '@/lib/types';
import type { PlayoffPreview } from '@/lib/playoffs/preview';

interface StandingsPlayoffsSectionProps {
  previews: PlayoffPreview[];
  standings: TeamStanding[];
}

type PanelKey = 'preview' | 'odds';

/* ── Bracket logo (no shields in round 1) ── */

function BracketLogo({
  name,
  logoUrl,
  size = 'lg',
}: {
  name: string;
  logoUrl: string | null;
  size?: 'lg' | 'sm';
}) {
  const dim = size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  const text = size === 'lg' ? 'text-lg' : 'text-sm';

  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className={`${dim} object-contain`} />;
  }

  return (
    <div
      className={`${dim} flex items-center justify-center rounded-full ${text} font-black`}
      style={{ backgroundColor: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
      aria-label={name}
      title={name}
    >
      {name.charAt(0)}
    </div>
  );
}

/* ── First‑round matchup (no shields, bigger logos, connected lines) ── */

function FirstRoundSeries({
  series,
  showOutgoingConnector,
}: {
  series: PlayoffPreview['rounds'][number]['series'][number];
  showOutgoingConnector: boolean;
}) {
  return (
    <div className="relative flex items-center" style={{ minHeight: 160 }}>
      {/* Matchup column */}
      <div className="relative flex flex-col items-center gap-10 pr-8">
        {/* High seed */}
        <div className="relative flex items-center">
          <div className="flex h-14 w-14 items-center justify-center">
            {series.highSeed ? (
              <BracketLogo name={series.highSeed.teamName} logoUrl={series.highSeed.logoUrl} size="lg" />
            ) : (
              <span className="text-xs text-white/30">TBD</span>
            )}
          </div>
          {series.highSeed && (
            <span className="ml-2 whitespace-nowrap text-[11px] font-bold text-white/60">
              #{series.highSeed.rank}
            </span>
          )}
          {/* Horizontal connector from high seed */}
          <div className="absolute left-full top-1/2 ml-2 h-px w-5 -translate-y-1/2 bg-gradient-to-r from-white/30 to-white/15" />
        </div>

        {/* Low seed */}
        <div className="relative flex items-center">
          <div className="flex h-14 w-14 items-center justify-center">
            {series.lowSeed ? (
              <BracketLogo name={series.lowSeed.teamName} logoUrl={series.lowSeed.logoUrl} size="lg" />
            ) : (
              <span className="text-xs text-white/30">BYE</span>
            )}
          </div>
          {series.lowSeed && (
            <span className="ml-2 whitespace-nowrap text-[11px] font-bold text-white/60">
              #{series.lowSeed.rank}
            </span>
          )}
          {/* Horizontal connector from low seed */}
          <div className="absolute left-full top-1/2 ml-2 h-px w-5 -translate-y-1/2 bg-gradient-to-r from-white/30 to-white/15" />
        </div>

        {/* Vertical bar joining the two connectors */}
        <div
          className="absolute w-px bg-white/20"
          style={{ right: -1, top: '50%', height: 'calc(50% + 28px)', transform: 'translateY(-50%)' }}
        />
        <div
          className="absolute w-px bg-white/20"
          style={{ right: -1, top: 'calc(25% - 2px)', height: 'calc(50% + 4px)' }}
        />

        {/* Outgoing horizontal connector to next round */}
        {showOutgoingConnector && (
          <div
            className="absolute h-px w-6 bg-white/20"
            style={{ right: -25, top: '50%', transform: 'translateY(-50%)' }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Later round placeholder node ── */

function LaterRoundNode({
  isChampionship,
  showOutgoingConnector,
}: {
  isChampionship: boolean;
  showOutgoingConnector: boolean;
}) {
  return (
    <div className="relative flex items-center justify-center px-6" style={{ minHeight: 160 }}>
      {/* Incoming connector */}
      <div className="absolute left-0 top-1/2 h-px w-6 -translate-y-1/2 bg-white/20" />

      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        {isChampionship ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/trophy.png"
            alt="Championship"
            className="h-10 w-10 object-contain drop-shadow-[0_4px_12px_rgba(255,215,0,0.4)]"
          />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">TBD</span>
        )}
      </div>

      {/* Outgoing connector */}
      {showOutgoingConnector && (
        <div className="absolute right-0 top-1/2 h-px w-6 -translate-y-1/2 bg-white/20" />
      )}
    </div>
  );
}

/* ── Round column ── */

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
    <div className="flex flex-col justify-around gap-2" style={{ minWidth: isFirstRound ? 180 : 120 }}>
      {/* Round label */}
      <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
        {round.label}
      </div>
      {round.series.map((series) => (
        <div key={`${round.roundNumber}-${series.seriesNumber}`} className="flex flex-1 items-center">
          {isFirstRound ? (
            <FirstRoundSeries series={series} showOutgoingConnector={showOutgoingConnector} />
          ) : (
            <LaterRoundNode isChampionship={isChampionship} showOutgoingConnector={showOutgoingConnector} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Bracket wrapper ── */

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

          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0d0f14] p-6 pb-4">
            <div className="flex min-w-max items-stretch gap-1">
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

/* ── Odds table ── */

function OddsTeamLogo({
  name,
  logoUrl,
  rank,
}: {
  name: string;
  logoUrl: string | null;
  rank: number;
}) {
  return (
    <div className="relative inline-flex h-14 w-14 items-center justify-center">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="h-14 w-14 object-contain" />
      ) : (
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black"
          style={{ backgroundColor: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
          aria-label={name}
          title={name}
        >
          {name.charAt(0)}
        </div>
      )}
      {/* Rank badge */}
      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white/70 ring-1 ring-white/10">
        {rank}
      </span>
    </div>
  );
}

function PlayoffOddsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            <th className="px-4 py-3 text-center">Team</th>
            <th className="px-4 py-3 text-center">Record</th>
            <th className="px-4 py-3 text-center">Odds of Finishing 1st</th>
            <th className="px-4 py-3 text-center">Odds of Making Playoffs</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => (
            <tr key={team.team_id} className="border-b border-white/5 last:border-b-0">
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-3">
                  <OddsTeamLogo name={team.team_name} logoUrl={team.team_logo} rank={index + 1} />
                  <span className="hidden min-w-0 truncate font-semibold text-[var(--color-text-primary)] sm:inline">{team.team_name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center font-semibold text-[var(--color-text-primary)]">{team.wins}-{team.losses}-{team.ties}</td>
              <td className="px-4 py-3 text-center font-semibold text-[var(--color-text-primary)]">100%</td>
              <td className="px-4 py-3 text-center font-semibold text-[var(--color-text-primary)]">100%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main section ── */

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
