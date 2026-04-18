'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TaleOfTheTapeRival, TeamStrengthLabel } from '@/lib/team-page';

// ---------------------------------------------------------------------------
// Background mask — matches the weekly-games hero edge fade
// ---------------------------------------------------------------------------
const TAPE_BG_MASK = [
  'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 4%, rgba(0,0,0,0.8) 12%, black 22%, black 78%, rgba(0,0,0,0.8) 88%, rgba(0,0,0,0.3) 96%, transparent 100%)',
  'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.3) 4%, rgba(0,0,0,0.85) 14%, black 28%, black 72%, rgba(0,0,0,0.85) 86%, rgba(0,0,0,0.3) 96%, transparent 100%)',
].join(',');

function strengthLabel(value: TeamStrengthLabel): string {
  switch (value) {
    case 'offense': return 'Offense';
    case 'defence': return 'Defence';
    case 'goaltending': return 'Goaltending';
    case 'balanced': return 'Balanced';
  }
}

function formatDiff(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

// ---------------------------------------------------------------------------
// Comparison bar: visually shows which side "wins" a metric
// ---------------------------------------------------------------------------
function ComparisonRow({
  label,
  leftValue,
  rightValue,
  leftDisplay,
  rightDisplay,
  higherIsBetter = true,
}: {
  label: string;
  leftValue: number;
  rightValue: number;
  leftDisplay: string;
  rightDisplay: string;
  higherIsBetter?: boolean;
}) {
  const max = Math.max(Math.abs(leftValue), Math.abs(rightValue), 1);
  const leftPct = (Math.abs(leftValue) / max) * 100;
  const rightPct = (Math.abs(rightValue) / max) * 100;

  const leftWins = higherIsBetter ? leftValue > rightValue : leftValue < rightValue;
  const rightWins = higherIsBetter ? rightValue > leftValue : rightValue < leftValue;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-bold tabular-nums ${leftWins ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`}
        >
          {leftDisplay}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {label}
        </span>
        <span
          className={`text-sm font-bold tabular-nums ${rightWins ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`}
        >
          {rightDisplay}
        </span>
      </div>
      <div className="flex h-1.5 items-center gap-1">
        {/* left bar grows right-to-left */}
        <div className="flex h-full flex-1 justify-end">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${leftPct}%`,
              backgroundColor: leftWins
                ? 'var(--league-primary)'
                : 'color-mix(in oklch, var(--color-text-muted) 40%, transparent)',
            }}
          />
        </div>
        {/* right bar grows left-to-right */}
        <div className="flex h-full flex-1 justify-start">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${rightPct}%`,
              backgroundColor: rightWins
                ? 'var(--league-primary)'
                : 'color-mix(in oklch, var(--color-text-muted) 40%, transparent)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text comparison row (for non-numeric values like strength/weakness)
// ---------------------------------------------------------------------------
function getTraitClasses(value: TeamStrengthLabel, tone: 'strength' | 'weakness') {
  if (value === 'balanced') {
    return 'border-white/12 bg-white/6 text-[var(--color-text-secondary)]';
  }

  if (tone === 'strength') {
    return 'border-emerald-400/25 bg-emerald-400/12 text-emerald-200';
  }

  return 'border-rose-400/25 bg-rose-400/12 text-rose-200';
}

function TraitPill({
  value,
  tone,
}: {
  value: TeamStrengthLabel;
  tone: 'strength' | 'weakness';
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${getTraitClasses(value, tone)}`}
    >
      {strengthLabel(value)}
    </span>
  );
}

function TextComparisonRow({
  label,
  leftValue,
  rightValue,
}: {
  label: string;
  leftValue: TeamStrengthLabel;
  rightValue: TeamStrengthLabel;
}) {
  const tone = label.toLowerCase() === 'strength' ? 'strength' : 'weakness';

  return (
    <div className="flex items-center justify-between gap-3">
      <TraitPill value={leftValue} tone={tone} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <TraitPill value={rightValue} tone={tone} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team logo column
// ---------------------------------------------------------------------------
function TeamLogo({
  name,
  logo,
  slug,
  leagueSlug,
  side,
}: {
  name: string;
  logo: string | null;
  slug: string;
  leagueSlug: string;
  side: 'left' | 'right';
}) {
  const inner = logo ? (
    <Image
      src={logo}
      alt={name}
      width={120}
      height={120}
      className="h-[72px] w-[72px] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)] md:h-[96px] md:w-[96px]"
    />
  ) : (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-[var(--league-primary)]/12 text-2xl font-black text-[var(--league-primary)] md:h-[96px] md:w-[96px]">
      {name.charAt(0)}
    </div>
  );

  const nameEl = (
    <p className={`mt-2 max-w-[120px] truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] ${side === 'right' ? 'text-right' : 'text-left'}`}>
      {name}
    </p>
  );

  if (slug) {
    return (
      <Link href={`/${leagueSlug}/teams/${slug}`} className="group flex flex-col items-center transition-transform hover:scale-105">
        {inner}
        {nameEl}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {inner}
      {nameEl}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function RivalsTaleOfTheTape({
  matchups,
  leagueSlug,
  teamLogoOverride,
}: {
  matchups: TaleOfTheTapeRival[];
  leagueSlug: string;
  /** Override the viewed team's logo (from the team object, which may differ from standings) */
  teamLogoOverride?: string | null;
}) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % matchups.length);
  }, [matchups.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + matchups.length) % matchups.length);
  }, [matchups.length]);

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (matchups.length <= 1) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next, matchups.length]);

  if (matchups.length === 0) return null;

  const m = matchups[index];
  const teamLogo = teamLogoOverride ?? m.team.logo;

  return (
    <div className="relative isolate overflow-hidden rounded-[28px]">
      {/* Background image — matches weekly-games style */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 scale-[1.05] bg-cover bg-center opacity-90"
          style={{
            backgroundImage: "url('/homepage/weekly-games-bg.jpg')",
            WebkitMaskImage: TAPE_BG_MASK,
            maskImage: TAPE_BG_MASK,
          }}
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50" />
        {/* Subtle radial glow at center */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 50%, var(--league-primary-alpha-10, rgba(255,255,255,0.04)) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative px-5 py-8 md:px-8 md:py-10">
        {/* Eyebrow */}
        <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
          Rivalry Matchup &middot; {m.gamesPlayed} {m.gamesPlayed === 1 ? 'game' : 'games'} this season
        </p>

        {/* Logo row + VS */}
        <div className="mb-8 flex items-center justify-center gap-6 md:gap-10">
          <TeamLogo
            name={m.team.name}
            logo={teamLogo}
            slug=""
            leagueSlug={leagueSlug}
            side="left"
          />
          <div className="flex flex-col items-center">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              VS
            </span>
          </div>
          <TeamLogo
            name={m.rival.name}
            logo={m.rival.logo}
            slug={m.rival.slug}
            leagueSlug={leagueSlug}
            side="right"
          />
        </div>

        {/* Comparison metrics */}
        <div className="mx-auto max-w-md space-y-4">
          <ComparisonRow
            label="Record"
            leftValue={parseWins(m.team.overallRecord)}
            rightValue={parseWins(m.rival.overallRecord)}
            leftDisplay={m.team.overallRecord}
            rightDisplay={m.rival.overallRecord}
          />
          <ComparisonRow
            label="H2H"
            leftValue={parseWins(m.h2hRecord)}
            rightValue={parseWins(m.h2hRecordRival)}
            leftDisplay={m.h2hRecord}
            rightDisplay={m.h2hRecordRival}
          />
          <ComparisonRow
            label="Goals For"
            leftValue={m.team.goalsFor}
            rightValue={m.rival.goalsFor}
            leftDisplay={String(m.team.goalsFor)}
            rightDisplay={String(m.rival.goalsFor)}
          />
          <ComparisonRow
            label="Goals Against"
            leftValue={m.team.goalsAgainst}
            rightValue={m.rival.goalsAgainst}
            leftDisplay={String(m.team.goalsAgainst)}
            rightDisplay={String(m.rival.goalsAgainst)}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Diff"
            leftValue={m.team.goalDifferential}
            rightValue={m.rival.goalDifferential}
            leftDisplay={formatDiff(m.team.goalDifferential)}
            rightDisplay={formatDiff(m.rival.goalDifferential)}
          />

          {/* Divider */}
          <div className="border-t border-white/8" />

          <TextComparisonRow
            label="Strength"
            leftValue={m.team.strength}
            rightValue={m.rival.strength}
          />
          <TextComparisonRow
            label="Weakness"
            leftValue={m.team.weakness}
            rightValue={m.rival.weakness}
          />
        </div>

        {/* Carousel controls */}
        {matchups.length > 1 && (
          <div className="mt-8 flex items-center justify-between px-1">
            <button
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--league-primary)]"
              aria-label="Previous rival"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {matchups.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-5 bg-[var(--league-primary)]' : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Go to rival ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--league-primary)]"
              aria-label="Next rival"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Extract the win count from a "W-L" or "W-L-T" record string for bar comparison. */
function parseWins(record: string): number {
  const parts = record.split('-');
  return Number(parts[0]) || 0;
}
