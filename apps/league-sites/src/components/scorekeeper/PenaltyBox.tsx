'use client';

import Image from 'next/image';
import type { PlayerData } from '@/lib/actions/scorekeeper';
import type { PenaltyTracker, ActivePenalty } from '@/lib/scorekeeper/penalty-tracker';

const PENALTY_ABBREV: Record<string, string> = {
  'Tripping': 'Trip',
  'Hooking': 'Hook',
  'Holding': 'Hold',
  'Slashing': 'Slash',
  'Interference': 'Int',
  'High Sticking': 'Hi Stk',
  'High Sticking (Double)': 'Hi Stk 2x',
  'Roughing': 'Rough',
  'Cross-Checking': 'X-Check',
  'Boarding': 'Board',
  'Elbowing': 'Elbow',
  'Charging': 'Charge',
  'Delay of Game': 'Delay',
  'Too Many Men': 'TMM',
  'Unsportsmanlike Conduct': 'USC',
  'Spearing': 'Spear',
  'Fighting': 'Fight',
  'Checking from Behind': 'Chk Behind',
  'Game Misconduct': 'Misc',
  'Match Penalty': 'Match',
};

interface PenaltyBoxProps {
  penaltyTracker: PenaltyTracker;
  timeRemaining: number;
  currentPeriod: number;
  homeRoster: PlayerData[];
  awayRoster: PlayerData[];
  homeTeamColor?: string | null;
  awayTeamColor?: string | null;
}

/** Group double-minor halves by parentEventId for display */
interface DisplayPenalty {
  penalty: ActivePenalty;
  /** Second half if this is a double-minor */
  secondHalf?: ActivePenalty;
  remainingSeconds: number;
  player?: PlayerData;
}

function groupPenalties(
  penalties: ActivePenalty[],
  tracker: PenaltyTracker,
  timeRemaining: number,
  currentPeriod: number,
  roster: PlayerData[]
): DisplayPenalty[] {
  const grouped = new Map<string, DisplayPenalty>();

  for (const p of penalties) {
    const remaining = tracker.getRemainingSeconds(p, timeRemaining, currentPeriod);
    const player = roster.find(r => r.id === p.playerId);

    if (p.parentEventId && p.halfIndex === 1) {
      // Second half of double-minor — attach to first half
      // Use second half's remaining as the total (it ends last)
      const existing = grouped.get(p.parentEventId);
      if (existing) {
        existing.secondHalf = p;
        // Total remaining = time until second half expires (not sum of both)
        existing.remainingSeconds = remaining;
        continue;
      }
    }

    const key = p.parentEventId || p.eventId;
    if (!grouped.has(key)) {
      grouped.set(key, { penalty: p, remainingSeconds: remaining, player });
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.remainingSeconds - a.remainingSeconds);
}

function formatPenaltyTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PenaltyBox({
  penaltyTracker,
  timeRemaining,
  currentPeriod,
  homeRoster,
  awayRoster,
  homeTeamColor,
  awayTeamColor,
}: PenaltyBoxProps) {
  const homePenalties = penaltyTracker.getPenaltiesForDisplay('home', timeRemaining, currentPeriod);
  const awayPenalties = penaltyTracker.getPenaltiesForDisplay('away', timeRemaining, currentPeriod);

  if (homePenalties.length === 0 && awayPenalties.length === 0) return null;

  const homeDisplay = groupPenalties(homePenalties, penaltyTracker, timeRemaining, currentPeriod, homeRoster);
  const awayDisplay = groupPenalties(awayPenalties, penaltyTracker, timeRemaining, currentPeriod, awayRoster);

  // Team strength display
  const homeStrength = penaltyTracker.getTeamStrength('home', timeRemaining, currentPeriod);
  const awayStrength = penaltyTracker.getTeamStrength('away', timeRemaining, currentPeriod);
  const strengthLabel = homeStrength !== 5 || awayStrength !== 5
    ? `${homeStrength}v${awayStrength}`
    : null;

  return (
    <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]/30">
      {/* Strength indicator */}
      {strengthLabel && (
        <div className="text-center mb-1.5">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            homeStrength > awayStrength
              ? 'bg-yellow-500/10 text-yellow-400'
              : homeStrength < awayStrength
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-gray-500/10 text-gray-400'
          }`}>
            {homeStrength > awayStrength ? 'PP' : homeStrength < awayStrength ? 'PP' : ''} {strengthLabel}
          </span>
        </div>
      )}

      <div className="flex gap-3 max-w-lg mx-auto">
        {/* Home penalties (left side) */}
        <div className="flex-1 space-y-1">
          {homeDisplay.map(dp => (
            <PenaltyCard
              key={dp.penalty.eventId}
              dp={dp}
              teamColor={homeTeamColor}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px bg-[var(--color-border)] self-stretch" />

        {/* Away penalties (right side) */}
        <div className="flex-1 space-y-1">
          {awayDisplay.map(dp => (
            <PenaltyCard
              key={dp.penalty.eventId}
              dp={dp}
              teamColor={awayTeamColor}
              align="right"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PenaltyCard({
  dp,
  teamColor,
  align = 'left',
}: {
  dp: DisplayPenalty;
  teamColor?: string | null;
  align?: 'left' | 'right';
}) {
  const { penalty, secondHalf, remainingSeconds, player } = dp;
  const isDoubleMinor = !!secondHalf;
  const originalMinutes = isDoubleMinor ? 4 : penalty.penaltyMinutes;
  const isMisconduct = originalMinutes === 10;

  // Severity coloring
  const severityClass = isMisconduct
    ? 'bg-gray-500/10 border-gray-500/30'
    : originalMinutes >= 5
      ? 'bg-red-500/10 border-red-500/30'
      : isDoubleMinor
        ? 'bg-orange-500/10 border-orange-500/30'
        : 'bg-yellow-500/10 border-yellow-500/30';

  const timeColor = isMisconduct
    ? 'text-gray-400'
    : originalMinutes >= 5
      ? 'text-red-400'
      : isDoubleMinor
        ? 'text-orange-400'
        : 'text-yellow-400';

  const abbrev = penalty.penaltyType
    ? (PENALTY_ABBREV[penalty.penaltyType] || penalty.penaltyType.slice(0, 8))
    : '';

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${severityClass} ${
      align === 'right' ? 'flex-row-reverse' : ''
    }`}>
      {/* Player avatar/jersey */}
      {player?.avatarUrl ? (
        <Image
          src={player.avatarUrl}
          alt={player.fullName}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{
            backgroundColor: teamColor ? `${teamColor}20` : 'var(--color-surface)',
            color: teamColor || 'var(--color-text-secondary)',
          }}
        >
          {player?.jerseyNumber ?? '?'}
        </div>
      )}

      {/* Penalty info */}
      <div className={`flex-1 min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
        <div className="text-[10px] text-[var(--color-text-secondary)] truncate leading-tight">
          #{player?.jerseyNumber} {abbrev}
          {isDoubleMinor && <span className="ml-0.5 font-bold">(2x)</span>}
          {isMisconduct && <span className="ml-0.5 opacity-60">no PP</span>}
        </div>
      </div>

      {/* Countdown */}
      <span className={`text-sm font-mono font-bold tabular-nums flex-shrink-0 ${timeColor}`}>
        {formatPenaltyTime(remainingSeconds)}
      </span>
    </div>
  );
}
