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

/**
 * Hockey jersey SVG — BACK view (where player name + number live)
 * - wide level shoulders
 * - full long sleeves with cuff stripes
 * - bell-shaped torso with hem stripe
 * - simple rounded back collar (no laces)
 * - shoulder yokes in secondary color
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
  return (
    <div className="relative w-[110px] sm:w-[124px] md:w-[134px]">
      <svg viewBox="0 0 220 220" className="h-auto w-full drop-shadow-[0_8px_22px_rgba(0,0,0,0.4)]">
        <defs>
          {/* Clip the hem stripe to the jersey body shape so it follows the curve */}
          <clipPath id="jerseyClip">
            <path
              d="
                M 95 22
                Q 110 32 125 22
                L 160 32
                L 195 48
                L 208 178
                L 175 178
                L 168 88
                L 165 200
                Q 110 215 55 200
                L 52 88
                L 45 178
                L 12 178
                L 25 48
                L 60 32
                Z
              "
            />
          </clipPath>
        </defs>

        {/* Body — main jersey shape */}
        <path
          d="
            M 95 22
            Q 110 32 125 22
            L 160 32
            L 195 48
            L 208 178
            L 175 178
            L 168 88
            L 165 200
            Q 110 215 55 200
            L 52 88
            L 45 178
            L 12 178
            L 25 48
            L 60 32
            Z
          "
          fill={primaryColor}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Left shoulder yoke — curves over shoulder onto upper sleeve */}
        <path
          d="
            M 95 22
            Q 110 32 110 50
            L 80 58
            L 52 78
            L 35 70
            L 25 48
            L 60 32
            Z
          "
          fill={secondaryColor}
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="1"
        />

        {/* Right shoulder yoke — mirror */}
        <path
          d="
            M 125 22
            Q 110 32 110 50
            L 140 58
            L 168 78
            L 185 70
            L 195 48
            L 160 32
            Z
          "
          fill={secondaryColor}
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="1"
        />

        {/* Cuff stripes — left sleeve */}
        <rect x="14" y="148" width="32" height="6" fill={secondaryColor} />
        <rect x="14" y="160" width="32" height="6" fill={secondaryColor} />

        {/* Cuff stripes — right sleeve */}
        <rect x="174" y="148" width="32" height="6" fill={secondaryColor} />
        <rect x="174" y="160" width="32" height="6" fill={secondaryColor} />

        {/* Hem stripe — clipped to body shape so it follows the curve */}
        <rect
          x="0"
          y="172"
          width="220"
          height="14"
          fill={secondaryColor}
          clipPath="url(#jerseyClip)"
        />

        {/* Back collar — rounded bump, no laces */}
        <path
          d="M 95 22 Q 110 34 125 22 Q 118 28 110 28 Q 102 28 95 22 Z"
          fill="rgba(0,0,0,0.22)"
        />
        <path
          d="M 95 22 Q 110 34 125 22"
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Name (top, arched area) + number (large, center back) */}
      <div className="pointer-events-none absolute inset-x-0 top-[28%] flex flex-col items-center">
        <span className="max-w-[58%] truncate text-[10px] font-bold uppercase tracking-[0.05em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] sm:text-[11px]">
          {name}
        </span>
        <span className="mt-1 text-[30px] font-black leading-none text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)] sm:text-[36px] md:text-[40px]">
          {number ?? '—'}
        </span>
      </div>
    </div>
  );
}

function EmptyJersey({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="relative w-[110px] sm:w-[124px] md:w-[134px]">
      <svg viewBox="0 0 220 220" className="h-auto w-full opacity-40">
        <path
          d="
            M 95 22
            Q 110 32 125 22
            L 160 32
            L 195 48
            L 208 178
            L 175 178
            L 168 88
            L 165 200
            Q 110 215 55 200
            L 52 88
            L 45 178
            L 12 178
            L 25 48
            L 60 32
            Z
          "
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.5"
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
