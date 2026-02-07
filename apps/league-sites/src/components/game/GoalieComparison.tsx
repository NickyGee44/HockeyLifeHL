import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TeamWithStats, GoalieStats } from '@/lib/types';
import { Shield } from 'lucide-react';

interface GoalieComparisonProps {
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  homeGoalies: GoalieStats[];
  awayGoalies: GoalieStats[];
}

/**
 * GoalieComparison - Side-by-side goalie matchup card
 *
 * Displays each team's goalie(s) with their season stats:
 * record (W-L), GAA, SV%, shutouts, and profile picture.
 */
export function GoalieComparison({
  homeTeam,
  awayTeam,
  homeGoalies,
  awayGoalies,
}: GoalieComparisonProps) {
  const awayColors = awayTeam.colors?.split(',') || [];
  const homeColors = homeTeam.colors?.split(',') || [];
  const awayPrimary = awayColors[0] || 'var(--league-primary)';
  const homePrimary = homeColors[0] || 'var(--league-primary)';

  const hasGoalies = homeGoalies.length > 0 || awayGoalies.length > 0;

  if (!hasGoalies) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--league-primary)]" />
            Goaltenders
          </h3>
        </div>
        <div className="p-8 text-center">
          <Shield className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            No goalie statistics available yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--league-primary)]" />
          Goaltenders
        </h3>
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

        {/* Goalie Matchup Rows */}
        <div className="space-y-6">
          {Array.from({
            length: Math.max(homeGoalies.length, awayGoalies.length, 1),
          }).map((_, index) => {
            const awayGoalie = awayGoalies[index];
            const homeGoalie = homeGoalies[index];

            return (
              <div key={index} className="flex items-start gap-4">
                {/* Away Goalie */}
                <div className="flex-1">
                  {awayGoalie ? (
                    <GoalieCard
                      goalie={awayGoalie}
                      color={awayPrimary}
                      align="left"
                    />
                  ) : (
                    <div className="h-20" />
                  )}
                </div>

                {/* VS Divider */}
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center font-bold text-xs text-[var(--color-text-muted)] mt-4">
                  VS
                </div>

                {/* Home Goalie */}
                <div className="flex-1">
                  {homeGoalie ? (
                    <GoalieCard
                      goalie={homeGoalie}
                      color={homePrimary}
                      align="right"
                    />
                  ) : (
                    <div className="h-20" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface GoalieCardProps {
  goalie: GoalieStats;
  color: string;
  align: 'left' | 'right';
}

function GoalieCard({ goalie, color, align }: GoalieCardProps) {
  const isLeft = align === 'left';
  const record = `${goalie.wins}-${goalie.losses}${goalie.ties ? `-${goalie.ties}` : ''}`;

  return (
    <div className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'}`}>
      {/* Name + Avatar row */}
      <div
        className={`flex items-center gap-3 mb-2 ${isLeft ? '' : 'flex-row-reverse'}`}
      >
        {/* Avatar */}
        {goalie.avatar_url ? (
          <img
            src={goalie.avatar_url}
            alt={goalie.player_name}
            className="w-10 h-10 rounded-full object-cover border-2 flex-shrink-0"
            style={{ borderColor: color }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {goalie.player_name.charAt(0)}
          </div>
        )}
        <div className={`${isLeft ? '' : 'text-right'}`}>
          <div className="flex items-center gap-2">
            {!isLeft && goalie.jersey_number && (
              <span className="text-xs text-[var(--color-text-muted)]">
                #{goalie.jersey_number}
              </span>
            )}
            <span className="font-semibold text-sm">{goalie.player_name}</span>
            {isLeft && goalie.jersey_number && (
              <span className="text-xs text-[var(--color-text-muted)]">
                #{goalie.jersey_number}
              </span>
            )}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {record} &middot; {goalie.games_played} GP
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div
        className={`grid grid-cols-3 gap-3 w-full rounded-lg p-2.5`}
        style={{
          background: 'color-mix(in srgb, var(--color-surface-hover) 60%, transparent)',
        }}
      >
        <StatCell
          label="GAA"
          value={goalie.goals_against_average.toFixed(2)}
          color={color}
          align={isLeft ? 'left' : 'right'}
        />
        <StatCell
          label="SV%"
          value={`${goalie.save_percentage.toFixed(1)}%`}
          color={color}
          align="center"
        />
        <StatCell
          label="SO"
          value={goalie.shutouts.toString()}
          color={color}
          align={isLeft ? 'right' : 'left'}
        />
      </div>
    </div>
  );
}

interface StatCellProps {
  label: string;
  value: string;
  color: string;
  align: 'left' | 'center' | 'right';
}

function StatCell({ label, value, color, align }: StatCellProps) {
  const alignClass =
    align === 'left'
      ? 'text-left'
      : align === 'right'
        ? 'text-right'
        : 'text-center';

  return (
    <div className={alignClass}>
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-medium">
        {label}
      </div>
      <div className="text-base font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export default GoalieComparison;
