import { TeamLogo } from '@/components/shared/TeamLogo';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { TeamWithStats, PlayerStat } from '@/lib/types';
import { Users } from 'lucide-react';

interface PlayerStatsComparisonProps {
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  homeLeaders: PlayerStat[];
  awayLeaders: PlayerStat[];
}

/**
 * PlayerStatsComparison - Bar chart style player comparison
 *
 * Displays top players from each team with horizontal progress bars
 * comparing their stats. Shows player name, jersey number, and stat value.
 */
export function PlayerStatsComparison({
  homeTeam,
  awayTeam,
  homeLeaders,
  awayLeaders,
}: PlayerStatsComparisonProps) {
  // Find max value for scaling progress bars
  const allValues = [...homeLeaders, ...awayLeaders].map((p) => p.value);
  const maxValue = Math.max(...allValues, 1);

  // Parse team colors
  const awayColors = awayTeam.colors?.split(',') || [];
  const homeColors = homeTeam.colors?.split(',') || [];
  const awayPrimary = awayColors[0] || 'var(--league-primary)';
  const homePrimary = homeColors[0] || 'var(--league-primary)';

  const hasLeaders = homeLeaders.length > 0 || awayLeaders.length > 0;

  if (!hasLeaders) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-bold">Player Leaders</h3>
        </div>
        <div className="p-8 text-center">
          <Users className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            No player statistics available yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-bold">Points Leaders</h3>
      </div>
      <div className="p-6">
        {/* Team Headers */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <TeamLogo
              logoUrl={awayTeam.logo}
              teamName={awayTeam.name}
              teamColor={awayPrimary}
              size="sm"
            />
            <span className="font-semibold text-sm">{awayTeam.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">{homeTeam.name}</span>
            <TeamLogo
              logoUrl={homeTeam.logo}
              teamName={homeTeam.name}
              teamColor={homePrimary}
              size="sm"
            />
          </div>
        </div>

        {/* Player Comparison Rows */}
        <div className="space-y-6">
          {Array.from({ length: Math.max(homeLeaders.length, awayLeaders.length, 3) }).map(
            (_, index) => {
              const awayPlayer = awayLeaders[index];
              const homePlayer = homeLeaders[index];

              return (
                <div key={index} className="flex items-center gap-4">
                  {/* Away Player (Left) */}
                  <div className="flex-1">
                    {awayPlayer ? (
                      <PlayerStatRow
                        player={awayPlayer}
                        maxValue={maxValue}
                        color={awayPrimary}
                        align="left"
                      />
                    ) : (
                      <div className="h-12" />
                    )}
                  </div>

                  {/* Rank Badge */}
                  <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>

                  {/* Home Player (Right) */}
                  <div className="flex-1">
                    {homePlayer ? (
                      <PlayerStatRow
                        player={homePlayer}
                        maxValue={maxValue}
                        color={homePrimary}
                        align="right"
                      />
                    ) : (
                      <div className="h-12" />
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

interface PlayerStatRowProps {
  player: PlayerStat;
  maxValue: number;
  color: string;
  align: 'left' | 'right';
}

function PlayerStatRow({ player, maxValue, color, align }: PlayerStatRowProps) {
  const isLeft = align === 'left';

  return (
    <div className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'}`}>
      <div
        className={`flex items-center gap-2 mb-1 ${isLeft ? '' : 'flex-row-reverse'}`}
      >
        {/* Player avatar */}
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.player_name}
            className="w-7 h-7 rounded-full object-cover border-2 flex-shrink-0"
            style={{ borderColor: color }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {player.player_name.charAt(0)}
          </div>
        )}
        <span className="font-medium text-sm truncate max-w-[100px]">
          {player.player_name}
        </span>
        {player.jersey_number && (
          <span className="text-xs text-[var(--color-text-muted)]">
            #{player.jersey_number}
          </span>
        )}
        <span className="font-bold text-lg" style={{ color }}>
          {player.value}
        </span>
      </div>
      <div className={`w-full ${isLeft ? '' : 'transform scale-x-[-1]'}`}>
        <ProgressBar value={player.value} maxValue={maxValue} color={color} height="sm" />
      </div>
    </div>
  );
}

export default PlayerStatsComparison;
