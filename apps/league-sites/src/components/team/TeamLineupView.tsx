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

/**
 * Jersey silhouette — BACK view, styled to match the reference illustration.
 * viewBox: 0 0 280 240
 * Single continuous outline: collar → right shoulder → sleeve down → cuff →
 * concave armpit → body side → bell hem → mirror on left.
 * This path + stripe polygons were iterated in local rsvg previews before shipping.
 */
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

// Stripe polygons — traced to sit flush against JERSEY_PATH edges (no gaps/overflow).
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
}: {
  name: string;
  number: number | null;
  primaryColor: string;
  secondaryColor: string;
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
        {/* Jersey silhouette */}
        <path
          d={JERSEY_PATH}
          fill={primaryColor}
          stroke={outline}
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Subtle collar shadow */}
        <path
          d="M 120 50 Q 140 65 160 50 Q 140 58 120 50 Z"
          fill="rgba(0,0,0,0.3)"
        />

        {/* Cuff stripes */}
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

        {/* Hem stripe */}
        <path
          d={HEM_STRIPE}
          fill={secondaryColor}
          stroke={outline}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* NAME — upper back */}
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

        {/* NUMBER — large varsity with dark outline */}
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
    </div>
  );
}

function EmptyJersey({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="relative w-[110px] sm:w-[124px] md:w-[134px]">
      <svg viewBox="0 0 280 240" className="h-auto w-full opacity-40">
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
