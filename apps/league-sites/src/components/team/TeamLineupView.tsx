'use client';

import { Check, X } from 'lucide-react';

interface LineupPlayer {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  position?: string | null;
}

type LineupSlotType = 'forward' | 'defence' | 'goalie';

interface TeamLineupViewProps {
  skaters: LineupPlayer[];
  goalies: LineupPlayer[];
  primaryColor: string;
  secondaryColor: string;
  availabilityMap?: Record<string, 'confirmed' | 'tentative' | 'out'>;
  onPlayerClick?: (playerId: string) => void;
  onEmptySlotClick?: (slotType: LineupSlotType) => void;
  highlightEmptySlots?: boolean;
  removeAffordance?: boolean;
  forwardSlots?: number;
  defenceSlots?: number;
}

const DEFAULT_FORWARD_SLOTS = 6;
const DEFAULT_DEFENCE_SLOTS = 4;

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}

function isDefence(position?: string | null): boolean {
  if (!position) return false;
  const p = position.toLowerCase();
  return p === 'd' || p === 'defence' || p === 'defense' || p === 'ld' || p === 'rd';
}

function isLightColor(hex: string): boolean {
  try {
    const clean = hex.replace('#', '').trim();
    if (clean.length !== 6) return true;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
  } catch {
    return true;
  }
}

export function TeamLineupView({
  skaters,
  goalies,
  primaryColor,
  secondaryColor,
  availabilityMap = {},
  onPlayerClick,
  onEmptySlotClick,
  highlightEmptySlots = false,
  removeAffordance = false,
  forwardSlots = DEFAULT_FORWARD_SLOTS,
  defenceSlots = DEFAULT_DEFENCE_SLOTS,
}: TeamLineupViewProps) {
  const defenders = skaters.filter((p) => isDefence(p.position));
  const forwards = skaters.filter((p) => !isDefence(p.position));

  // Forwards are always laid out 3-across with a minimum of 2 rows; defence is
  // always 2-across. Slot counts may grow when there are extra attendees.
  const forwardCapacity = Math.max(forwardSlots, DEFAULT_FORWARD_SLOTS);
  const defenceCapacity = Math.max(defenceSlots, DEFAULT_DEFENCE_SLOTS);

  const forwardLineup = Array.from({ length: forwardCapacity }, (_, i) => forwards[i] || null);
  const defenceLineup = Array.from({ length: defenceCapacity }, (_, i) => defenders[i] || null);
  const goalie = goalies[0] || null;

  return (
    <div className="mt-2 space-y-8">
      <div>
        <h3 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Forwards
        </h3>
        <div className="mx-auto grid w-fit grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {forwardLineup.map((player, i) => (
            <JerseySlot
              key={`fwd-${i}`}
              player={player}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              availability={player ? availabilityMap[player.playerId] : undefined}
              onPlayerClick={onPlayerClick}
              onEmptyClick={onEmptySlotClick ? () => onEmptySlotClick('forward') : undefined}
              highlightEmpty={highlightEmptySlots}
              removeAffordance={removeAffordance}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-row items-start justify-center gap-6 sm:gap-10 md:gap-14">
        <div>
          <h3 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Defence
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
            {defenceLineup.map((player, i) => (
              <JerseySlot
                key={`def-${i}`}
                player={player}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                availability={player ? availabilityMap[player.playerId] : undefined}
                onPlayerClick={onPlayerClick}
                onEmptyClick={onEmptySlotClick ? () => onEmptySlotClick('defence') : undefined}
                highlightEmpty={highlightEmptySlots}
                removeAffordance={removeAffordance}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Goalie
          </h3>
          <div className="flex justify-center">
            <JerseySlot
              player={goalie}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              availability={goalie ? availabilityMap[goalie.playerId] : undefined}
              onPlayerClick={onPlayerClick}
              onEmptyClick={onEmptySlotClick ? () => onEmptySlotClick('goalie') : undefined}
              highlightEmpty={highlightEmptySlots}
              removeAffordance={removeAffordance}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function JerseySlot({
  player,
  primaryColor,
  secondaryColor,
  availability,
  onPlayerClick,
  onEmptyClick,
  highlightEmpty = false,
  removeAffordance = false,
}: {
  player: LineupPlayer | null;
  primaryColor: string;
  secondaryColor: string;
  availability?: 'confirmed' | 'tentative' | 'out';
  onPlayerClick?: (playerId: string) => void;
  onEmptyClick?: () => void;
  highlightEmpty?: boolean;
  removeAffordance?: boolean;
}) {
  if (player && onPlayerClick) {
    return (
      <button
        type="button"
        onClick={() => onPlayerClick(player.playerId)}
        className="group relative flex flex-col items-center rounded-2xl p-1 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)]"
        aria-label={`Remove ${player.name} from lineup`}
      >
        <Jersey
          name={getLastName(player.name)}
          number={player.jerseyNumber}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          availability={availability}
        />
        {removeAffordance ? (
          <span className="pointer-events-none absolute -top-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 ring-2 ring-white/40 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>
    );
  }

  if (!player && onEmptyClick) {
    return (
      <button
        type="button"
        onClick={onEmptyClick}
        className={`flex flex-col items-center rounded-2xl p-1 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)] ${
          highlightEmpty ? 'animate-pulse hover:scale-[1.03]' : 'hover:scale-[1.03]'
        }`}
        aria-label="Place selected player"
      >
        <EmptyJersey primaryColor={primaryColor} emphasize={highlightEmpty} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {player ? (
        <Jersey
          name={getLastName(player.name)}
          number={player.jerseyNumber}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          availability={availability}
        />
      ) : (
        <EmptyJersey primaryColor={primaryColor} />
      )}
    </div>
  );
}

const JERSEY_PATH = `
  M 120 50
  Q 140 62 160 50
  Q 185 54 200 58
  L 260 165
  L 245 195
  L 195 145
  L 215 225
  Q 140 245 65 225
  L 85 145
  L 35 195
  L 20 165
  Q 50 80 80 58
  Q 95 54 120 50
  Z
`;

const LEFT_CUFF_STRIPE = `
  M 22 168
  L 78 154
  L 85 175
  L 32 192
  Z
`;
const RIGHT_CUFF_STRIPE = `
  M 202 154
  L 258 168
  L 248 192
  L 195 175
  Z
`;
const HEM_STRIPE = `
  M 80 205
  L 200 205
  L 215 225
  Q 140 245 65 225
  Z
`;

function Jersey({
  name,
  number,
  primaryColor,
  secondaryColor,
  availability,
}: {
  name: string;
  number: number | null;
  primaryColor: string;
  secondaryColor: string;
  availability?: 'confirmed' | 'tentative' | 'out';
}) {
  const outline = '#111111';
  const nameColor = isLightColor(primaryColor) ? '#111111' : '#ffffff';

  const displayName = name.toUpperCase().slice(0, 12);
  const nameFontSize = displayName.length > 10 ? 13 : displayName.length > 7 ? 15 : 17;

  return (
    <div className="relative w-[110px] sm:w-[124px] md:w-[134px]">
      <svg
        viewBox="0 0 280 240"
        className="h-auto w-full drop-shadow-[0_8px_22px_rgba(0,0,0,0.4)]"
      >
        <path
          d={JERSEY_PATH}
          fill={primaryColor}
          stroke={outline}
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <path
          d="M 120 50 Q 140 65 160 50 Q 140 58 120 50 Z"
          fill="rgba(0,0,0,0.3)"
        />

        <path
          d={LEFT_CUFF_STRIPE}
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d={RIGHT_CUFF_STRIPE}
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        <path
          d={HEM_STRIPE}
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {availability === 'out' ? (
          <>
            <path d={JERSEY_PATH} fill="rgba(148,163,184,0.58)" stroke="none" />
            <path d={LEFT_CUFF_STRIPE} fill="rgba(203,213,225,0.45)" stroke="none" />
            <path d={RIGHT_CUFF_STRIPE} fill="rgba(203,213,225,0.45)" stroke="none" />
            <path d={HEM_STRIPE} fill="rgba(203,213,225,0.45)" stroke="none" />
          </>
        ) : null}

        <text
          x="140"
          y="110"
          textAnchor="middle"
          fontSize={nameFontSize}
          fontWeight={900}
          fill={nameColor}
          style={{
            fontFamily: '"Arial Black", Impact, "Oswald", sans-serif',
            letterSpacing: '1px',
          }}
        >
          {displayName}
        </text>

        <text
          x="140"
          y="185"
          textAnchor="middle"
          fontSize={68}
          fontWeight={900}
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="5"
          style={{
            paintOrder: 'stroke fill',
            fontFamily: '"Arial Black", Impact, "Oswald", sans-serif',
          }}
        >
          {number ?? '—'}
        </text>
      </svg>

      <AvailabilityBadge availability={availability} />
    </div>
  );
}

function AvailabilityBadge({ availability }: { availability?: 'confirmed' | 'tentative' | 'out' }) {
  if (!availability || availability === 'tentative') return null;

  const config =
    availability === 'confirmed'
      ? { icon: Check, className: 'bg-emerald-500 text-white ring-emerald-200/40' }
      : { icon: X, className: 'bg-red-500 text-white ring-red-200/35' };

  const Icon = config.icon;

  return (
    <span className={`absolute bottom-1 right-0 inline-flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-transparent ${config.className}`}>
      <Icon className="h-3 w-3" />
    </span>
  );
}

function EmptyJersey({
  primaryColor,
  emphasize = false,
}: {
  primaryColor: string;
  emphasize?: boolean;
}) {
  return (
    <div className="relative w-[110px] sm:w-[124px] md:w-[134px]">
      <svg
        viewBox="0 0 280 240"
        className={`h-auto w-full ${emphasize ? 'opacity-90' : 'opacity-40'}`}
      >
        <path
          d={JERSEY_PATH}
          fill={emphasize ? `color-mix(in srgb, ${primaryColor} 14%, transparent)` : 'none'}
          stroke={primaryColor}
          strokeWidth={emphasize ? '4' : '3'}
          strokeDasharray="6 4"
          strokeLinejoin="round"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className={`text-3xl font-bold ${emphasize ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-muted)]'}`}>+</span>
      </div>
    </div>
  );
}
