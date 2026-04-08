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
    <div className="mt-2 space-y-6">
      {/* FORWARDS */}
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Forwards
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
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

      {/* DEFENCE */}
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Defence
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
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

      {/* GOALIE */}
      <div>
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Goalie
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <JerseySlot
            player={goalie}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
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
    <div className="relative w-full max-w-[110px]">
      <svg viewBox="0 0 200 200" className="h-auto w-full drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
        <path
          d="M 50 35 L 80 25 Q 100 45 120 25 L 150 35 L 175 60 L 165 85 L 150 75 L 150 175 Q 100 185 50 175 L 50 75 L 35 85 L 25 60 Z"
          fill={primaryColor}
          stroke={secondaryColor}
          strokeWidth="2"
        />
        <path d="M 50 35 L 80 25 Q 90 35 95 50 L 60 60 Z" fill={secondaryColor} />
        <path d="M 150 35 L 120 25 Q 110 35 105 50 L 140 60 Z" fill={secondaryColor} />
        <rect x="50" y="172" width="100" height="6" fill={secondaryColor} />
        <path
          d="M 80 25 Q 100 45 120 25 L 115 22 Q 100 38 85 22 Z"
          fill={secondaryColor}
          opacity="0.6"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[28%] flex flex-col items-center">
        <span className="max-w-[80%] truncate text-[9px] font-bold uppercase tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] sm:text-[10px]">
          {name}
        </span>
        <span className="text-xl font-black leading-none text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)] sm:text-2xl">
          {number ?? '—'}
        </span>
      </div>
    </div>
  );
}

function EmptyJersey({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="relative w-full max-w-[110px]">
      <svg viewBox="0 0 200 200" className="h-auto w-full opacity-40">
        <path
          d="M 50 35 L 80 25 Q 100 45 120 25 L 150 35 L 175 60 L 165 85 L 150 75 L 150 175 Q 100 185 50 175 L 50 75 L 35 85 L 25 60 Z"
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
