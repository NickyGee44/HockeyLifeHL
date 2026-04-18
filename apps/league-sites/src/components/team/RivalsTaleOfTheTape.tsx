'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TaleOfTheTapeRival, TeamStrengthLabel } from '@/lib/team-page';

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

function getWinnerColor(leftWins: boolean, rightWins: boolean, leftColor: string, rightColor: string) {
  if (leftWins) return leftColor;
  if (rightWins) return rightColor;
  return 'var(--color-text-muted)';
}

function ComparisonRow({
  label,
  leftValue,
  rightValue,
  leftDisplay,
  rightDisplay,
  leftColor,
  rightColor,
  higherIsBetter = true,
}: {
  label: string;
  leftValue: number;
  rightValue: number;
  leftDisplay: string;
  rightDisplay: string;
  leftColor: string;
  rightColor: string;
  higherIsBetter?: boolean;
}) {
  const max = Math.max(Math.abs(leftValue), Math.abs(rightValue), 1);
  const leftPct = (Math.abs(leftValue) / max) * 100;
  const rightPct = (Math.abs(rightValue) / max) * 100;

  const leftWins = higherIsBetter ? leftValue > rightValue : leftValue < rightValue;
  const rightWins = higherIsBetter ? rightValue > leftValue : rightValue < leftValue;
  const winnerColor = getWinnerColor(leftWins, rightWins, leftColor, rightColor);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: leftWins ? leftColor : 'var(--color-text-secondary)' }}
        >
          {leftDisplay}
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: winnerColor }}
        >
          {label}
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: rightWins ? rightColor : 'var(--color-text-secondary)' }}
        >
          {rightDisplay}
        </span>
      </div>
      <div className="flex h-1.5 items-center gap-1">
        <div className="flex h-full flex-1 justify-end">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${leftPct}%`,
              backgroundColor: leftWins
                ? leftColor
                : 'color-mix(in srgb, var(--color-text-muted) 40%, transparent)',
            }}
          />
        </div>
        <div className="flex h-full flex-1 justify-start">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${rightPct}%`,
              backgroundColor: rightWins
                ? rightColor
                : 'color-mix(in srgb, var(--color-text-muted) 40%, transparent)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

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

function LeaderComparisonRow({
  label,
  leftName,
  rightName,
  leftValue,
  rightValue,
  leftColor,
  rightColor,
  leftSuffix,
  rightSuffix,
  higherIsBetter = true,
}: {
  label: string;
  leftName: string;
  rightName: string;
  leftValue: number;
  rightValue: number;
  leftColor: string;
  rightColor: string;
  leftSuffix?: string;
  rightSuffix?: string;
  higherIsBetter?: boolean;
}) {
  const leftWins = higherIsBetter ? leftValue > rightValue : leftValue < rightValue;
  const rightWins = higherIsBetter ? rightValue > leftValue : rightValue < leftValue;
  const winnerColor = getWinnerColor(leftWins, rightWins, leftColor, rightColor);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5">
      <div className="min-w-0">
        <p
          className="truncate text-sm font-semibold"
          style={{ color: leftWins ? leftColor : 'var(--color-text-primary)' }}
        >
          {leftName}
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]">{leftSuffix || '\u00A0'}</p>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: winnerColor }}>
        {label}
      </span>
      <div className="min-w-0 text-right">
        <p
          className="truncate text-sm font-semibold"
          style={{ color: rightWins ? rightColor : 'var(--color-text-primary)' }}
        >
          {rightName}
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]">{rightSuffix || '\u00A0'}</p>
      </div>
    </div>
  );
}

function TeamLogo({
  name,
  logo,
  slug,
  leagueSlug,
  side,
  primaryColor,
}: {
  name: string;
  logo: string | null;
  slug: string;
  leagueSlug: string;
  side: 'left' | 'right';
  primaryColor: string;
}) {
  const inner = logo ? (
    <div
      className="relative flex h-[132px] w-[132px] items-center justify-center md:h-[176px] md:w-[176px]"
      style={{
        filter: `drop-shadow(0 0 24px color-mix(in srgb, ${primaryColor} 42%, transparent)) drop-shadow(0 14px 30px rgba(0,0,0,0.45))`,
      }}
    >
      <div
        className="absolute inset-[18%] rounded-full blur-2xl"
        style={{ background: `color-mix(in srgb, ${primaryColor} 42%, transparent)` }}
      />
      <Image
        src={logo}
        alt={name}
        width={164}
        height={164}
        className="relative h-[122px] w-[122px] object-contain md:h-[163px] md:w-[163px]"
      />
    </div>
  ) : (
    <div
      className="flex h-[122px] w-[122px] items-center justify-center rounded-3xl text-4xl font-black md:h-[163px] md:w-[163px]"
      style={{
        backgroundColor: `color-mix(in srgb, ${primaryColor} 16%, transparent)`,
        color: primaryColor,
        boxShadow: `0 0 32px color-mix(in srgb, ${primaryColor} 34%, transparent)`,
      }}
    >
      {name.charAt(0)}
    </div>
  );

  const nameEl = (
    <p className={`mt-2 max-w-[140px] truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] ${side === 'right' ? 'text-right' : 'text-left'}`}>
      {name}
    </p>
  );

  if (slug) {
    return (
      <Link href={`/${leagueSlug}/teams/${slug}`} className="group flex flex-col items-center transition-transform hover:scale-[1.03]">
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

function formatTendyMeta(gamesPlayed: number, gaa: number | null) {
  if (gamesPlayed <= 0 || gaa == null) return 'No goalie data';
  return `${gamesPlayed} GP · ${gaa.toFixed(2)} GAA`;
}

export function RivalsTaleOfTheTape({
  matchups,
  leagueSlug,
  teamLogoOverride,
}: {
  matchups: TaleOfTheTapeRival[];
  leagueSlug: string;
  teamLogoOverride?: string | null;
}) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % matchups.length);
  }, [matchups.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + matchups.length) % matchups.length);
  }, [matchups.length]);

  useEffect(() => {
    if (matchups.length <= 1) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next, matchups.length]);

  if (matchups.length === 0) return null;

  const m = matchups[index];
  const teamLogo = teamLogoOverride ?? m.team.logo;

  return (
    <div>
      <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Rivalry Matchup · {m.gamesPlayed} {m.gamesPlayed === 1 ? 'game' : 'games'} this season
      </p>

      <div className="league-reading-panel rounded-[28px] px-5 py-7 md:px-8 md:py-8">
        <div className="mb-7 flex items-center justify-center gap-4 md:gap-10">
          <TeamLogo
            name={m.team.name}
            logo={teamLogo}
            slug=""
            leagueSlug={leagueSlug}
            side="left"
            primaryColor={m.team.primaryColor}
          />
          <div className="flex flex-col items-center gap-1">
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
            primaryColor={m.rival.primaryColor}
          />
        </div>

        <div className="mx-auto max-w-xl space-y-4">
          <ComparisonRow
            label="Record"
            leftValue={parseWins(m.team.overallRecord)}
            rightValue={parseWins(m.rival.overallRecord)}
            leftDisplay={m.team.overallRecord}
            rightDisplay={m.rival.overallRecord}
            leftColor={m.team.primaryColor}
            rightColor={m.rival.primaryColor}
          />
          <ComparisonRow
            label="H2H"
            leftValue={parseWins(m.h2hRecord)}
            rightValue={parseWins(m.h2hRecordRival)}
            leftDisplay={m.h2hRecord}
            rightDisplay={m.h2hRecordRival}
            leftColor={m.team.primaryColor}
            rightColor={m.rival.primaryColor}
          />
          <ComparisonRow
            label="Goals For"
            leftValue={m.team.goalsFor}
            rightValue={m.rival.goalsFor}
            leftDisplay={String(m.team.goalsFor)}
            rightDisplay={String(m.rival.goalsFor)}
            leftColor={m.team.primaryColor}
            rightColor={m.rival.primaryColor}
          />
          <ComparisonRow
            label="Goals Against"
            leftValue={m.team.goalsAgainst}
            rightValue={m.rival.goalsAgainst}
            leftDisplay={String(m.team.goalsAgainst)}
            rightDisplay={String(m.rival.goalsAgainst)}
            leftColor={m.team.primaryColor}
            rightColor={m.rival.primaryColor}
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Diff"
            leftValue={m.team.goalDifferential}
            rightValue={m.rival.goalDifferential}
            leftDisplay={formatDiff(m.team.goalDifferential)}
            rightDisplay={formatDiff(m.rival.goalDifferential)}
            leftColor={m.team.primaryColor}
            rightColor={m.rival.primaryColor}
          />

          <div className="border-t border-white/8" />

          <LeaderComparisonRow
            label="Sniper"
            leftName={m.team.sniper.name}
            rightName={m.rival.sniper.name}
            leftValue={m.team.sniper.goals}
            rightValue={m.rival.sniper.goals}
            leftColor={m.team.primaryColor}
            rightColor={m.rival.primaryColor}
            leftSuffix={`${m.team.sniper.goals} G`}
            rightSuffix={`${m.rival.sniper.goals} G`}
          />
          <LeaderComparisonRow
            label="Playmaker"
            leftName={m.team.playmaker.name}
            rightName={m.rival.playmaker.name}
            leftValue={m.team.playmaker.assists}
            rightValue={m.rival.playmaker.assists}
            leftColor={m.team.primaryColor}
            rightColor={m.rival.primaryColor}
            leftSuffix={`${m.team.playmaker.assists} A`}
            rightSuffix={`${m.rival.playmaker.assists} A`}
          />
          <LeaderComparisonRow
            label="Tendy"
            leftName={`${m.team.tendy.emoji} ${m.team.tendy.name}`}
            rightName={`${m.rival.tendy.emoji} ${m.rival.tendy.name}`}
            leftValue={m.team.tendy.goalsAgainstAverage ?? Number.POSITIVE_INFINITY}
            rightValue={m.rival.tendy.goalsAgainstAverage ?? Number.POSITIVE_INFINITY}
            leftColor={m.team.primaryColor}
            rightColor={m.rival.primaryColor}
            leftSuffix={formatTendyMeta(m.team.tendy.gamesPlayed, m.team.tendy.goalsAgainstAverage)}
            rightSuffix={formatTendyMeta(m.rival.tendy.gamesPlayed, m.rival.tendy.goalsAgainstAverage)}
            higherIsBetter={false}
          />

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

        {matchups.length > 1 && (
          <div className="mt-7 flex items-center justify-between px-1">
            <button
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--league-primary)]"
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
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--league-primary)]"
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

function parseWins(record: string): number {
  const parts = record.split('-');
  return Number(parts[0]) || 0;
}
