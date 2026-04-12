'use client';

import { useMemo, useState } from 'react';
import type { TeamStanding } from '@/lib/types';
import type { PlayoffPreview } from '@/lib/playoffs/preview';

interface StandingsPlayoffsSectionProps {
  previews: PlayoffPreview[];
  standings: TeamStanding[];
}

type PanelKey = 'preview' | 'odds';

/* ── Seed entry (logo + seed label, no shield) ── */

function SeedEntry({
  seed,
}: {
  seed: { teamName: string; logoUrl: string | null; rank: number } | null;
}) {
  if (!seed) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center">
          <span className="text-xs text-white/30">TBD</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
        {seed.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seed.logoUrl} alt={seed.teamName} className="h-14 w-14 object-contain" />
        ) : (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black"
            style={{ backgroundColor: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
            aria-label={seed.teamName}
            title={seed.teamName}
          >
            {seed.teamName.charAt(0)}
          </div>
        )}
      </div>
      <span className="whitespace-nowrap text-[11px] font-bold text-white/50">#{seed.rank}</span>
    </div>
  );
}

/* ── Shield badges (later rounds) ── */

function ShieldPlaceholder({
  variant = 'grey',
  size = 'md',
}: {
  variant?: 'grey' | 'gold';
  size?: 'md' | 'lg';
}) {
  const isGold = variant === 'gold';
  const className = size === 'lg' ? 'h-16 w-14' : 'h-12 w-10';
  const fill = isGold ? 'rgba(211,162,72,0.22)' : 'rgba(255,255,255,0.08)';
  const stroke = isGold ? 'rgba(226,185,92,0.75)' : 'rgba(255,255,255,0.18)';
  const text = isGold ? 'text-[#f1d38b]' : 'text-white/28';

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 40 48" fill="none" className="h-full w-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]" aria-hidden="true">
        <path d="M20 2L4 10V24C4 34 20 46 20 46C20 46 36 34 36 24V10L20 2Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase tracking-[0.24em] ${text}`}>
        TBD
      </span>
    </div>
  );
}

/* ── 4‑team bracket layout ── */

function FourTeamBracket({
  preview,
}: {
  preview: PlayoffPreview;
}) {
  const firstRound = preview.rounds[0];
  if (!firstRound) return null;

  const seriesA = firstRound.series[0]; // #1 vs #4
  const seriesB = firstRound.series[1]; // #2 vs #3

  /* Collect round labels */
  const semifinalLabel = firstRound.label;
  const finalLabel = preview.rounds[1]?.label ?? 'Final';

  /*
   * Layout geometry (fixed positions, absolute placement):
   *
   *   SEEDS (left)          SEMI SHIELDS (mid)        TROPHY (center)        WINNER (right)
   *   ─────────────         ────────────────          ──────────────         ──────────────
   *   Seed #1  ──┐
   *              ├── shield A ──┐
   *   Seed #4  ──┘              │
   *                             ├── 🏆 ── shield W
   *   Seed #2  ──┐              │
   *              ├── shield B ──┘
   *   Seed #3  ──┘
   */

  /* Vertical positions (px from top of bracket area) */
  const seed1Y = 0;
  const seed4Y = 80;
  const shieldAY = 28;       /* vertically centered between seed1 & seed4 */
  const seed2Y = 160;
  const seed3Y = 240;
  const shieldBY = 188;      /* vertically centered between seed2 & seed3 */
  const championshipY = 102; /* championship badge sits between the semifinal badges */
  const trophyY = 102;       /* trophy sits just to the right of the championship badge */
  const winnerY = 110;

  /* Horizontal positions */
  const seedX = 0;
  const lineStartX = 100;    /* right edge of seed entries */
  const shieldX = 170;
  const championshipX = 300;
  const trophyX = 364;
  const winnerX = 444;

  const bracketHeight = 280;
  const bracketWidth = 520;

  return (
    <div className="relative" style={{ height: bracketHeight, width: bracketWidth, minWidth: bracketWidth }}>
      {/* ── Round labels ── */}
      <div
        className="absolute text-[10px] font-bold uppercase tracking-[0.2em] text-white/30"
        style={{ left: seedX, top: -22 }}
      >
        {semifinalLabel}
      </div>
      <div
        className="absolute text-[10px] font-bold uppercase tracking-[0.2em] text-white/30"
        style={{ left: championshipX - 8, top: -22 }}
      >
        {finalLabel}
      </div>

      {/* ── Seed entries (left column) ── */}
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

      {/* ── Semifinal shield placeholders (middle column) ── */}
      <div className="absolute" style={{ left: shieldX, top: shieldAY }}>
        <ShieldPlaceholder />
      </div>
      <div className="absolute" style={{ left: shieldX, top: shieldBY }}>
        <ShieldPlaceholder />
      </div>

      {/* ── Championship badge + trophy ── */}
      <div className="absolute" style={{ left: championshipX, top: championshipY }}>
        <ShieldPlaceholder variant="gold" size="lg" />
      </div>
      <div className="absolute flex items-center justify-center" style={{ left: trophyX, top: trophyY }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/trophy.png"
          alt="Championship trophy"
          className="h-[72px] w-[72px] object-contain drop-shadow-[0_8px_22px_rgba(255,215,0,0.55)]"
        />
      </div>

      {/* ── Winner shield placeholder (far right) ── */}
      <div className="absolute" style={{ left: winnerX, top: winnerY }}>
        <ShieldPlaceholder />
      </div>

      {/* ── SVG connector lines ── */}
      <svg
        className="pointer-events-none absolute inset-0"
        width={bracketWidth}
        height={bracketHeight}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Seed #1 → vertical bar */}
        <line x1={lineStartX} y1={seed1Y + 7} x2={lineStartX} y2={seed4Y + 7} stroke="white" strokeOpacity={0.15} strokeWidth={1} />
        {/* Horizontal from seed #1 */}
        <line x1={lineStartX - 4} y1={seed1Y + 7} x2={lineStartX} y2={seed1Y + 7} stroke="white" strokeOpacity={0.15} strokeWidth={1} />
        {/* Horizontal from seed #4 */}
        <line x1={lineStartX - 4} y1={seed4Y + 7} x2={lineStartX} y2={seed4Y + 7} stroke="white" strokeOpacity={0.15} strokeWidth={1} />
        {/* Bar midpoint → shield A */}
        <line x1={lineStartX} y1={shieldAY + 6} x2={shieldX} y2={shieldAY + 6} stroke="white" strokeOpacity={0.15} strokeWidth={1} />

        {/* Seed #2 → vertical bar */}
        <line x1={lineStartX} y1={seed2Y + 7} x2={lineStartX} y2={seed3Y + 7} stroke="white" strokeOpacity={0.15} strokeWidth={1} />
        {/* Horizontal from seed #2 */}
        <line x1={lineStartX - 4} y1={seed2Y + 7} x2={lineStartX} y2={seed2Y + 7} stroke="white" strokeOpacity={0.15} strokeWidth={1} />
        {/* Horizontal from seed #3 */}
        <line x1={lineStartX - 4} y1={seed3Y + 7} x2={lineStartX} y2={seed3Y + 7} stroke="white" strokeOpacity={0.15} strokeWidth={1} />
        {/* Bar midpoint → shield B */}
        <line x1={lineStartX} y1={shieldBY + 6} x2={shieldX} y2={shieldBY + 6} stroke="white" strokeOpacity={0.15} strokeWidth={1} />

        {/* Shield A / B → championship badge */}
        <line x1={shieldX + 52} y1={shieldAY + 6} x2={shieldX + 52} y2={shieldBY + 6} stroke="white" strokeOpacity={0.12} strokeWidth={1} />
        <line x1={shieldX + 48} y1={shieldAY + 6} x2={shieldX + 52} y2={shieldAY + 6} stroke="white" strokeOpacity={0.12} strokeWidth={1} />
        <line x1={shieldX + 48} y1={shieldBY + 6} x2={shieldX + 52} y2={shieldBY + 6} stroke="white" strokeOpacity={0.12} strokeWidth={1} />
        <line x1={shieldX + 52} y1={championshipY + 18} x2={championshipX} y2={championshipY + 18} stroke="white" strokeOpacity={0.12} strokeWidth={1} />

        {/* Championship badge → trophy */}
        <line x1={championshipX + 58} y1={championshipY + 18} x2={trophyX} y2={championshipY + 18} stroke="white" strokeOpacity={0.14} strokeWidth={1} />

        {/* Trophy → winner shield */}
        <line x1={trophyX + 72} y1={winnerY + 14} x2={winnerX} y2={winnerY + 14} stroke="white" strokeOpacity={0.12} strokeWidth={1} />
      </svg>
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

          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0d0f14] px-8 pb-6 pt-10">
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
