import { cn } from '@hockey-life/ui';
import { getBenchPlayers, isGoaliePosition, type GameTeamLineupLayout, type LineupRosterPlayer } from '@/lib/lineups/types';

function PlayerBadge({
  player,
  accentColor,
}: {
  player: LineupRosterPlayer;
  accentColor: string;
}) {
  return (
    <div className="pointer-events-none flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-black text-white shadow-[0_14px_34px_rgba(2,6,23,0.35)]"
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.26), transparent 38%), ${accentColor}`,
          borderColor: 'rgba(255,255,255,0.55)',
        }}
      >
        #{player.jerseyNumber ?? '00'}
      </div>
      <div className="rounded-full border border-white/15 bg-slate-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
        {player.fullName || 'Player'}
      </div>
    </div>
  );
}

function BenchPlayerPill({ player }: { player: LineupRosterPlayer }) {
  const statusTone =
    player.availability === 'confirmed'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
      : player.availability === 'tentative'
        ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
        : player.availability === 'out'
          ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
          : 'border-white/10 bg-white/[0.04] text-neutral-200';

  return (
    <div className={cn('rounded-2xl border px-3 py-2 text-left', statusTone)}>
      <p className="text-sm font-semibold text-inherit">{player.fullName || 'Player'}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-inherit/80">
        #{player.jerseyNumber ?? '--'}
        {player.position ? ` · ${isGoaliePosition(player.position) ? 'Goalie' : player.position}` : ''}
      </p>
    </div>
  );
}

export function LineupRinkBoard({
  layout,
  teamName,
  accentColor,
  className,
  showBench = true,
  emptyLabel = 'Drag skaters onto the ice to build your lineup.',
  rinkRef,
  benchRef,
  renderPlacedPlayer,
  renderBenchPlayer,
}: {
  layout: GameTeamLineupLayout;
  teamName: string;
  accentColor?: string | null;
  className?: string;
  showBench?: boolean;
  emptyLabel?: string;
  rinkRef?: React.Ref<HTMLDivElement>;
  benchRef?: React.Ref<HTMLDivElement>;
  renderPlacedPlayer?: (player: LineupRosterPlayer) => React.ReactNode;
  renderBenchPlayer?: (player: LineupRosterPlayer) => React.ReactNode;
}) {
  const rosterById = new Map(layout.roster.map((player) => [player.playerId, player]));
  const benchPlayers = getBenchPlayers(layout);
  const paintColor = accentColor || '#0ea5e9';

  return (
    <div className={cn('rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.35)] backdrop-blur-xl', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Tonight&apos;s Look</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-white">{teamName}</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
          {layout.placedPlayers.length} on ice
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(224,242,254,0.92)_26%,_rgba(191,219,254,0.92)_55%,_rgba(224,242,254,0.95)_100%)] px-3 py-4 shadow-inner shadow-slate-950/15">
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-red-500/65" />
          <div className="absolute left-0 right-0 top-[23%] h-[4px] bg-sky-500/75" />
          <div className="absolute left-0 right-0 bottom-[23%] h-[4px] bg-sky-500/75" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-red-500/55" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/75" />
          <div className="absolute left-1/2 top-[16%] h-28 w-36 -translate-x-1/2 rounded-b-[999px] border-x-[3px] border-b-[3px] border-red-500/40" />
          <div className="absolute left-1/2 bottom-[16%] h-28 w-36 -translate-x-1/2 rounded-t-[999px] border-x-[3px] border-t-[3px] border-red-500/40" />
          <div className="absolute left-1/2 top-[10%] h-12 w-20 -translate-x-1/2 rounded-b-[999px] border-x-[3px] border-b-[3px] border-sky-500/45" />
          <div className="absolute left-1/2 bottom-[10%] h-12 w-20 -translate-x-1/2 rounded-t-[999px] border-x-[3px] border-t-[3px] border-sky-500/45" />
        </div>

        <div ref={rinkRef} className="relative aspect-[4/5] w-full" data-lineup-rink="true">
          {layout.placedPlayers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-slate-600">
              {emptyLabel}
            </div>
          )}

          {layout.placedPlayers.map((placedPlayer) => {
            const rosterPlayer = rosterById.get(placedPlayer.playerId);
            if (!rosterPlayer) return null;

            return (
              <div
                key={placedPlayer.playerId}
                className="absolute top-0 left-0"
                style={{ left: `${placedPlayer.x}%`, top: `${placedPlayer.y}%` }}
              >
                {renderPlacedPlayer
                  ? renderPlacedPlayer(rosterPlayer)
                  : <PlayerBadge player={rosterPlayer} accentColor={paintColor} />}
              </div>
            );
          })}
        </div>
      </div>

      {showBench && (
        <div ref={benchRef} className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4" data-lineup-bench="true">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Unassigned Roster</p>
              <h4 className="mt-2 text-sm font-bold text-white">In players and available spares not yet assigned</h4>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
              {benchPlayers.length} unassigned
            </div>
          </div>

          {benchPlayers.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">All in players and spares are already assigned to jerseys.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {benchPlayers.map((player) => (
                <div key={player.playerId}>
                  {renderBenchPlayer ? renderBenchPlayer(player) : <BenchPlayerPill player={player} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
