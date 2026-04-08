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
      <svg viewBox="0 0 220 240" className="h-auto w-full drop-shadow-[0_8px_22px_rgba(0,0,0,0.4)]">
        {/* Body — long-sleeve hockey jersey shape */}
        <path
          d="
            M 70 30
            L 95 22
            Q 110 38 125 22
            L 150 30
            L 175 50
            L 195 110
            L 195 165
            Q 185 175 170 168
            L 160 100
            L 160 215
            Q 110 225 60 215
            L 60 100
            L 50 168
            Q 35 175 25 165
            L 25 110
            L 45 50
            Z
          "
          fill={primaryColor}
          stroke={secondaryColor}
          strokeWidth="2.5"
        />

        {/* Shoulder yokes */}
        <path d="M 70 30 L 95 22 Q 105 35 110 50 L 70 60 Z" fill={secondaryColor} />
        <path d="M 150 30 L 125 22 Q 115 35 110 50 L 150 60 Z" fill={secondaryColor} />

        {/* Sleeve cuff stripes */}
        <rect x="22" y="155" width="16" height="14" rx="1" fill={secondaryColor} />
        <rect x="182" y="155" width="16" height="14" rx="1" fill={secondaryColor} />

        {/* Bottom hem stripe */}
        <rect x="60" y="208" width="100" height="8" fill={secondaryColor} />

        {/* Collar */}
        <path
          d="M 95 22 Q 110 38 125 22 L 122 18 Q 110 32 98 18 Z"
          fill={secondaryColor}
          opacity="0.7"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[34%] flex flex-col items-center">
        <span className="max-w-[60%] truncate text-[10px] font-bold uppercase tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] sm:text-[11px]">
          {name}
        </span>
        <span className="text-2xl font-black leading-none text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)] sm:text-[28px]">
          {number ?? '—'}
        </span>
      </div>
    </div>
  );
}

function EmptyJersey({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="relative w-[110px] sm:w-[124px] md:w-[134px]">
      <svg viewBox="0 0 220 240" className="h-auto w-full opacity-40">
        <path
          d="
            M 70 30
            L 95 22
            Q 110 38 125 22
            L 150 30
            L 175 50
            L 195 110
            L 195 165
            Q 185 175 170 168
            L 160 100
            L 160 215
            Q 110 225 60 215
            L 60 100
            L 50 168
            Q 35 175 25 165
            L 25 110
            L 45 50
            Z
          "
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeDasharray="6 4"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-2xl text-[var(--color-text-muted)]">+</span>
      </div>
    </div>
  );
}
