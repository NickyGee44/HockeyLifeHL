'use client';

interface LineupPlayer {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  position?: string | null;
}

interface TeamLineupViewProps {
  skaters: LineupPlayer[];
  goalies: LineupPlayer[];
  primaryColor: string;
  secondaryColor: string;
}

const FORWARD_SLOTS = 6;
const DEFENCE_SLOTS = 4;

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}

function isDefence(position?: string | null): boolean {
  if (!position) return false;
  const p = position.toLowerCase();
  return p === 'd' || p === 'defence' || p === 'defense' || p === 'ld' || p === 'rd';
}

/** Perceived luminance — used to pick readable name color against team primary. */
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

export function TeamLineupView({ skaters, goalies, primaryColor, secondaryColor }: TeamLineupViewProps) {
  const defenders = skaters.filter((p) => isDefence(p.position));
  const forwards = skaters.filter((p) => !isDefence(p.position));

  const forwardLineup = Array.from({ length: FORWARD_SLOTS }, (_, i) => forwards[i] || null);
  const defenceLineup = Array.from({ length: DEFENCE_SLOTS }, (_, i) => defenders[i] || null);
  const goalie = goalies[0] || null;

  return (
    <div className="mt-2 space-y-8">
      {/* FORWARDS */}
      <div>
        <h3 className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Forwards
        </h3>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5">
          {forwardLineup.map((player, i) => (
            <JerseySlot
              key={`fwd-${i}`}
              player={player}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          ))}
        </div>
      </div>

      {/* DEFENCE + GOALIE always side-by-side */}
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
}: {
  player: LineupPlayer | null;
  primaryColor: string;
  secondaryColor: string;
}) {
  return (
    <div className="flex flex-col items-center">
      {player ? (
        <Jersey
          name={getLastName(player.name)}
          number={player.jerseyNumber}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      ) : (
        <EmptyJersey primaryColor={primaryColor} />
      )}
    </div>
  );
}

// Shared jersey silhouette — BACK view. Sharp armpits, bell hem, wide sleeves with cuffs.
const JERSEY_PATH = `
  M 95 25
  Q 110 38 125 25
  L 150 30
  L 195 58
  L 208 168
  L 160 172
  L 158 90
  L 178 212
  Q 110 222 42 212
  L 62 90
  L 60 172
  L 12 168
  L 25 58
  L 70 30
  Z
`;

/**
 * Hockey jersey — back view, bold illustrated style.
 * - Heavy dark outline
 * - Secondary-color cuff + hem stripes with dark borders
 * - NAME across upper back
 * - Large varsity NUMBER with dark outline
 */
function Jersey({
  name,
  number,
  primaryColor,
  secondaryColor,
}: {
  name: string;
  number: number | null;
  primaryColor: string;
  secondaryColor: string;
}) {
  const outline = '#111111';
  const nameColor = isLightColor(primaryColor) ? '#111111' : '#ffffff';

  const displayName = name.toUpperCase().slice(0, 12);
  const nameFontSize = displayName.length > 10 ? 12 : displayName.length > 7 ? 14 : 16;

  return (
    <div className="relative w-[110px] sm:w-[124px] md:w-[134px]">
      <svg
        viewBox="0 0 220 220"
        className="h-auto w-full drop-shadow-[0_8px_22px_rgba(0,0,0,0.4)]"
      >
        {/* Jersey silhouette */}
        <path
          d={JERSEY_PATH}
          fill={primaryColor}
          stroke={outline}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Back collar shadow */}
        <path
          d="M 95 25 Q 110 38 125 25 Q 110 33 95 25 Z"
          fill="rgba(0,0,0,0.28)"
        />

        {/* Left cuff stripe */}
        <path
          d="M 14 150 L 60 150 L 61 170 L 13 172 Z"
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Right cuff stripe */}
        <path
          d="M 160 150 L 206 150 L 207 172 L 159 170 Z"
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Hem stripe */}
        <path
          d="M 46 188 L 174 188 L 178 212 Q 110 222 42 212 Z"
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Name */}
        <text
          x="110"
          y="80"
          textAnchor="middle"
          fontSize={nameFontSize}
          fontWeight={900}
          fill={nameColor}
          stroke={outline}
          strokeWidth="0.5"
          style={{
            paintOrder: 'stroke fill',
            fontFamily: 'Impact, "Oswald", "Arial Black", sans-serif',
            letterSpacing: '0.5px',
          }}
        >
          {displayName}
        </text>

        {/* Number — varsity, secondary fill with heavy dark outline */}
        <text
          x="110"
          y="158"
          textAnchor="middle"
          fontSize={68}
          fontWeight={900}
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="4.5"
          style={{
            paintOrder: 'stroke fill',
            fontFamily: 'Impact, "Oswald", "Arial Black", sans-serif',
          }}
        >
          {number ?? '—'}
        </text>
      </svg>
    </div>
  );
}

function EmptyJersey({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="relative w-[110px] sm:w-[124px] md:w-[134px]">
      <svg viewBox="0 0 220 220" className="h-auto w-full opacity-40">
        <path
          d={JERSEY_PATH}
          fill="none"
          stroke={primaryColor}
          strokeWidth="3"
          strokeDasharray="6 4"
          strokeLinejoin="round"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-2xl text-[var(--color-text-muted)]">+</span>
      </div>
    </div>
  );
}
