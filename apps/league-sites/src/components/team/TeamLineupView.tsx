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

const FORWARD_SLOTS = 6; // LW, C, RW × 2 lines
const DEFENCE_SLOTS = 4; // LD, RD × 2 pairs
const FORWARD_LABELS = ['LW', 'C', 'RW', 'LW', 'C', 'RW'];
const DEFENCE_LABELS = ['LD', 'RD', 'LD', 'RD'];

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
  // Split skaters into forwards and defence
  const defenders = skaters.filter((p) => isDefence(p.position));
  const forwards = skaters.filter((p) => !isDefence(p.position));

  // Pad/trim to slot counts
  const forwardLineup = Array.from({ length: FORWARD_SLOTS }, (_, i) => forwards[i] || null);
  const defenceLineup = Array.from({ length: DEFENCE_SLOTS }, (_, i) => defenders[i] || null);
  const goalie = goalies[0] || null;

  return (
    <section className="mt-6">
      <h2 className="mb-8 text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
        Our Lineup
      </h2>

      <div className="space-y-10">
        {/* Forward line 1 */}
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {forwardLineup.slice(0, 3).map((player, i) => (
            <JerseySlot
              key={`fwd1-${i}`}
              label={FORWARD_LABELS[i]}
              player={player}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          ))}
        </div>

        {/* Forward line 2 */}
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {forwardLineup.slice(3, 6).map((player, i) => (
            <JerseySlot
              key={`fwd2-${i}`}
              label={FORWARD_LABELS[i + 3]}
              player={player}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          ))}
        </div>

        {/* Defence + Goalie row */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 pt-4">
          <JerseySlot
            label="LD"
            player={defenceLineup[0]}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
          <JerseySlot
            label="RD"
            player={defenceLineup[1]}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
          <JerseySlot
            label="GOALIE"
            player={goalie}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        </div>

        {/* Defence pair 2 (only if there are extra defenders) */}
        {(defenceLineup[2] || defenceLineup[3]) && (
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            <JerseySlot
              label="LD"
              player={defenceLineup[2]}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
            <JerseySlot
              label="RD"
              player={defenceLineup[3]}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
            <div />
          </div>
        )}
      </div>
    </section>
  );
}

function JerseySlot({
  label,
  player,
  primaryColor,
  secondaryColor,
}: {
  label: string;
  player: LineupPlayer | null;
  primaryColor: string;
  secondaryColor: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </span>
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
    <div className="relative w-full max-w-[140px]">
      <svg viewBox="0 0 200 200" className="h-auto w-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        {/* Jersey body */}
        <path
          d="M 50 35 L 80 25 Q 100 45 120 25 L 150 35 L 175 60 L 165 85 L 150 75 L 150 175 Q 100 185 50 175 L 50 75 L 35 85 L 25 60 Z"
          fill={primaryColor}
          stroke={secondaryColor}
          strokeWidth="2"
        />
        {/* Shoulder accents (secondary color) */}
        <path
          d="M 50 35 L 80 25 Q 90 35 95 50 L 60 60 Z"
          fill={secondaryColor}
        />
        <path
          d="M 150 35 L 120 25 Q 110 35 105 50 L 140 60 Z"
          fill={secondaryColor}
        />
        {/* Bottom accent stripe */}
        <rect x="50" y="172" width="100" height="6" fill={secondaryColor} />
        {/* Collar v */}
        <path
          d="M 80 25 Q 100 45 120 25 L 115 22 Q 100 38 85 22 Z"
          fill={secondaryColor}
          opacity="0.6"
        />
      </svg>
      {/* Name + number overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-8">
        <span className="text-[11px] font-bold uppercase tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] md:text-xs">
          {name}
        </span>
        <span className="text-2xl font-black leading-none text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)] md:text-3xl">
          {number ?? '—'}
        </span>
      </div>
    </div>
  );
}

function EmptyJersey({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="relative w-full max-w-[140px]">
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
        <span className="text-3xl text-[var(--color-text-muted)]">+</span>
      </div>
    </div>
  );
}
