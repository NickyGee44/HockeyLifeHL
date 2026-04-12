'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { TeamStanding } from '@/lib/types';
import type { PlayoffPreview } from '@/lib/playoffs/preview';
import type { TeamPlayoffOdds } from '@/lib/playoffs/odds';

interface StandingsPlayoffsSectionProps {
  previews: PlayoffPreview[];
  standings: TeamStanding[];
  odds: TeamPlayoffOdds[];
}

type PanelKey = 'preview' | 'odds';

const BRACKET_GOLD = '#8f7a4b';
const BRACKET_GOLD_SOFT = 'rgba(143,122,75,0.26)';

function ShieldGlyph({ variant = 'grey' }: { variant?: 'grey' | 'gold' }) {
  const isGold = variant === 'gold';

  return (
    <svg viewBox="0 0 40 48" fill="none" className="h-8 w-7" aria-hidden="true">
      <path
        d="M20 2L4 10V24C4 34 20 46 20 46C20 46 36 34 36 24V10L20 2Z"
        fill={isGold ? 'rgba(212,170,84,0.26)' : 'rgba(255,255,255,0.10)'}
        stroke={isGold ? 'rgba(227,191,111,0.88)' : 'rgba(255,255,255,0.22)'}
        strokeWidth="1.6"
      />
    </svg>
  );
}

function BracketSquare({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex h-[78px] w-[78px] items-center justify-center rounded-[18px] border-[2px] bg-[#171410] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_28px_rgba(0,0,0,0.26)] ${className}`}
      style={{ borderColor: BRACKET_GOLD, backgroundColor: '#16130f' }}
    >
      <div className="absolute inset-[7px] rounded-[13px] border" style={{ borderColor: BRACKET_GOLD_SOFT }} />
      {children}
    </div>
  );
}

function SeedEntry({
  seed,
}: {
  seed: { teamName: string; logoUrl: string | null; rank: number } | null;
}) {
  if (!seed) {
    return (
      <div className="relative h-[78px] w-[78px]">
        <BracketSquare>
          <ShieldGlyph />
        </BracketSquare>
      </div>
    );
  }

  return (
    <div className="relative h-[78px] w-[78px]">
      <BracketSquare>
        {seed.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seed.logoUrl} alt={seed.teamName} className="relative z-10 h-12 w-12 object-contain" />
        ) : (
          <div
            className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full text-lg font-black"
            style={{ backgroundColor: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
            aria-label={seed.teamName}
            title={seed.teamName}
          >
            {seed.teamName.charAt(0)}
          </div>
        )}
      </BracketSquare>
      <span
        className="absolute -bottom-1 -right-1 z-20 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-black leading-none text-[#efe2bd]"
        style={{ backgroundColor: '#2a2114', border: `2px solid ${BRACKET_GOLD}` }}
      >
        {seed.rank}
      </span>
    </div>
  );
}

function ShieldPlaceholder() {
  return (
    <BracketSquare>
      <ShieldGlyph />
    </BracketSquare>
  );
}

function FourTeamBracket({
  preview,
}: {
  preview: PlayoffPreview;
}) {
  const firstRound = preview.rounds[0];
  if (!firstRound) return null;

  const seriesA = firstRound.series[0];
  const seriesB = firstRound.series[1];
  const semifinalLabel = firstRound.label;
  const finalLabel = preview.rounds[1]?.label ?? 'Final';

  const node = 78;
  const midNode = 78;
  const trophyW = 120;
  const winnerNode = 78;

  const seedX = 0;
  const semiX = 156;
  const trophyX = 292;
  const winnerX = 442;

  const seed1Y = 4;
  const seed4Y = 114;
  const seed2Y = 248;
  const seed3Y = 358;
  const semi1Y = 60;
  const semi2Y = 304;
  const championY = 176;
  const trophyY = 154;
  const winnerY = 184;

  const seedCenterX = seedX + node;
  const semiCenterX = semiX;
  const semiRightX = semiX + midNode;
  const trophyRightX = trophyX + trophyW;
  const winnerLeftX = winnerX;

  const seed1CenterY = seed1Y + node / 2;
  const seed4CenterY = seed4Y + node / 2;
  const seed2CenterY = seed2Y + node / 2;
  const seed3CenterY = seed3Y + node / 2;
  const semi1CenterY = semi1Y + midNode / 2;
  const semi2CenterY = semi2Y + midNode / 2;
  const championCenterY = championY + winnerNode / 2;
  const winnerCenterY = winnerY + winnerNode / 2;

  const bracketHeight = 446;
  const bracketWidth = 520;

  return (
    <div className="relative" style={{ height: bracketHeight, width: bracketWidth, minWidth: bracketWidth }}>
      <div className="absolute text-[10px] font-bold uppercase tracking-[0.22em] text-white/34" style={{ left: seedX, top: -24 }}>
        {semifinalLabel}
      </div>
      <div className="absolute text-[10px] font-bold uppercase tracking-[0.22em] text-white/34" style={{ left: trophyX + 4, top: -24 }}>
        {finalLabel}
      </div>

      <div className="absolute" style={{ left: seedX, top: seed1Y }}>
        <SeedEntry seed={seriesA?.highSeed ?? null} />
      </div>
      <div className="absolute" style={{ left: seedX, top: seed4Y }}>
        <SeedEntry seed={seriesA?.lowSeed ?? null} />
      </div>
      <div className="absolute" style={{ left: seedX, top: seed2Y }}>
        <SeedEntry seed={seriesB?.highSeed ?? null} />
      </div>
      <div className="absolute" style={{ left: seedX, top: seed3Y }}>
        <SeedEntry seed={seriesB?.lowSeed ?? null} />
      </div>

      <div className="absolute" style={{ left: semiX, top: semi1Y }}>
        <ShieldPlaceholder />
      </div>
      <div className="absolute" style={{ left: semiX, top: semi2Y }}>
        <ShieldPlaceholder />
      </div>

      <div className="absolute flex items-center justify-center" style={{ left: trophyX, top: trophyY }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trophy.png" alt="Championship trophy" className="h-[120px] w-[120px] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)]" />
      </div>
      <div className="absolute" style={{ left: winnerX, top: winnerY }}>
        <ShieldPlaceholder />
      </div>

      <svg className="pointer-events-none absolute inset-0" width={bracketWidth} height={bracketHeight} fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke={BRACKET_GOLD} strokeOpacity="0.95" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <line x1={seedCenterX} y1={seed1CenterY} x2={seedCenterX + 18} y2={seed1CenterY} />
          <line x1={seedCenterX} y1={seed4CenterY} x2={seedCenterX + 18} y2={seed4CenterY} />
          <line x1={seedCenterX + 18} y1={seed1CenterY} x2={seedCenterX + 18} y2={seed4CenterY} />
          <line x1={seedCenterX + 18} y1={semi1CenterY} x2={semiCenterX} y2={semi1CenterY} />

          <line x1={seedCenterX} y1={seed2CenterY} x2={seedCenterX + 18} y2={seed2CenterY} />
          <line x1={seedCenterX} y1={seed3CenterY} x2={seedCenterX + 18} y2={seed3CenterY} />
          <line x1={seedCenterX + 18} y1={seed2CenterY} x2={seedCenterX + 18} y2={seed3CenterY} />
          <line x1={seedCenterX + 18} y1={semi2CenterY} x2={semiCenterX} y2={semi2CenterY} />

          <line x1={semiRightX} y1={semi1CenterY} x2={semiRightX + 20} y2={semi1CenterY} />
          <line x1={semiRightX} y1={semi2CenterY} x2={semiRightX + 20} y2={semi2CenterY} />
          <line x1={semiRightX + 20} y1={semi1CenterY} x2={semiRightX + 20} y2={semi2CenterY} />
          <line x1={semiRightX + 20} y1={championCenterY} x2={trophyX - 12} y2={championCenterY} />

          <line x1={trophyRightX} y1={winnerCenterY} x2={winnerLeftX} y2={winnerCenterY} />
        </g>
      </svg>
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

          <div className="overflow-x-auto pb-2 pt-3">
            <FourTeamBracket preview={preview} />
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

function formatOdds(value: number): string {
  const percentage = value * 100;
  if (percentage <= 0) return '<1%';
  if (percentage >= 100) return '100%';
  if (percentage >= 10) return `${Math.round(percentage)}%`;
  return `${percentage.toFixed(1)}%`;
}

function OddsBar({ value, color }: { value: number; color: string }) {
  const percentage = value * 100;

  return (
    <div className="mx-auto h-1.5 w-16 rounded-full bg-white/8">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(2, Math.min(100, percentage))}%`, backgroundColor: color }}
      />
    </div>
  );
}

function PlayoffOddsTable({ standings, odds }: { standings: TeamStanding[]; odds: TeamPlayoffOdds[] }) {
  const oddsMap = useMemo(() => {
    const m = new Map<string, TeamPlayoffOdds>();
    for (const o of odds) m.set(o.teamId, o);
    return m;
  }, [odds]);

  const everyoneMakesPlayoffs = useMemo(
    () => odds.length > 0 && odds.every((entry) => entry.oddsOfMakingPlayoffs >= 0.999),
    [odds],
  );

  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      const oa = oddsMap.get(a.team_id);
      const ob = oddsMap.get(b.team_id);

      if (!everyoneMakesPlayoffs) {
        const playoffDiff = (ob?.oddsOfMakingPlayoffs ?? 0) - (oa?.oddsOfMakingPlayoffs ?? 0);
        if (playoffDiff !== 0) return playoffDiff;
      }

      return (ob?.oddsOfFinishingFirst ?? 0) - (oa?.oddsOfFinishingFirst ?? 0);
    });
  }, [standings, oddsMap, everyoneMakesPlayoffs]);

  return (
    <div className="overflow-x-auto">
      {everyoneMakesPlayoffs && (
        <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
          All teams currently qualify, so 1st-place odds are the meaningful number.
        </div>
      )}

      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            <th className="px-4 py-3 text-center">Team</th>
            <th className="px-4 py-3 text-center">Record</th>
            <th className="px-4 py-3 text-center">1st Place</th>
            {!everyoneMakesPlayoffs && <th className="px-4 py-3 text-center">Make Playoffs</th>}
          </tr>
        </thead>
        <tbody>
          {sortedStandings.map((team, index) => {
            const teamOdds = oddsMap.get(team.team_id);
            const firstPct = teamOdds?.oddsOfFinishingFirst ?? 0;
            const playoffPct = teamOdds?.oddsOfMakingPlayoffs ?? 0;

            return (
              <tr key={team.team_id} className="border-b border-white/5 last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <OddsTeamLogo name={team.team_name} logoUrl={team.team_logo} rank={index + 1} />
                    <span className="hidden min-w-0 truncate font-semibold text-[var(--color-text-primary)] sm:inline">{team.team_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-[var(--color-text-primary)]">
                  {team.wins}-{team.losses}-{team.ties}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-[var(--color-text-primary)]">{formatOdds(firstPct)}</span>
                  <OddsBar value={firstPct} color="var(--league-primary, #8f7a4b)" />
                </td>
                {!everyoneMakesPlayoffs && (
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-[var(--color-text-primary)]">{formatOdds(playoffPct)}</span>
                    <OddsBar value={playoffPct} color={playoffPct >= 0.5 ? '#4ade80' : playoffPct >= 0.2 ? '#facc15' : '#f87171'} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main section ── */

export function StandingsPlayoffsSection({ previews, standings, odds }: StandingsPlayoffsSectionProps) {
  const [activePanel, setActivePanel] = useState<PanelKey>('preview');

  const panels = useMemo(
    () => ({
      preview: <PlayoffBrackets previews={previews} />,
      odds: <PlayoffOddsTable standings={standings} odds={odds} />,
    }),
    [odds, previews, standings],
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
