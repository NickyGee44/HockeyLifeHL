import Link from 'next/link';
import { TeamLogo } from '@/components/shared/TeamLogo';
import type { TeamWithStats, TeamSeasonStats } from '@/lib/types';
import { BarChart3 } from 'lucide-react';

interface TeamStatsComparisonProps {
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  homeStats: TeamSeasonStats | null;
  awayStats: TeamSeasonStats | null;
  leagueSlug: string;
}

interface StatRowProps {
  label: string;
  awayValue: number | string | null;
  homeValue: number | string | null;
  awayColor: string;
  homeColor: string;
  higherIsBetter?: boolean;
}

/**
 * TeamStatsComparison - Team stats sidebar comparison
 *
 * Shows team statistics side by side with the better value highlighted.
 */
export function TeamStatsComparison({
  homeTeam,
  awayTeam,
  homeStats,
  awayStats,
  leagueSlug,
}: TeamStatsComparisonProps) {
  // Parse team colors
  const awayColors = awayTeam.colors?.split(',') || [];
  const homeColors = homeTeam.colors?.split(',') || [];
  const awayPrimary = awayColors[0] || 'var(--league-primary)';
  const homePrimary = homeColors[0] || 'var(--league-primary)';

  const hasStats = homeStats || awayStats;

  if (!hasStats) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--league-primary)]" />
            Team Stats
          </h3>
        </div>
        <div className="p-6 text-center">
          <BarChart3 className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            No team statistics available yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--league-primary)]" />
          Team Stats
        </h3>
      </div>
      <div className="p-4">
        {/* Team Headers */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--color-border)]">
          <Link
            href={`/${leagueSlug}/teams/${awayTeam.slug}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <TeamLogo
              logoUrl={awayTeam.logo}
              teamName={awayTeam.name}
              teamColor={awayPrimary}
              size="sm"
            />
            <span className="font-semibold text-xs truncate max-w-[60px]">
              {awayTeam.name.substring(0, 3).toUpperCase()}
            </span>
          </Link>
          <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
            Stats
          </span>
          <Link
            href={`/${leagueSlug}/teams/${homeTeam.slug}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="font-semibold text-xs truncate max-w-[60px]">
              {homeTeam.name.substring(0, 3).toUpperCase()}
            </span>
            <TeamLogo
              logoUrl={homeTeam.logo}
              teamName={homeTeam.name}
              teamColor={homePrimary}
              size="sm"
            />
          </Link>
        </div>

        {/* Stats Rows */}
        <div className="space-y-3">
          <StatRow
            label="Record"
            awayValue={
              awayStats
                ? `${awayStats.wins}-${awayStats.losses}-${awayStats.overtime_losses}`
                : '-'
            }
            homeValue={
              homeStats
                ? `${homeStats.wins}-${homeStats.losses}-${homeStats.overtime_losses}`
                : '-'
            }
            awayColor={awayPrimary}
            homeColor={homePrimary}
          />
          <StatRow
            label="Points"
            awayValue={awayStats?.points ?? null}
            homeValue={homeStats?.points ?? null}
            awayColor={awayPrimary}
            homeColor={homePrimary}
            higherIsBetter
          />
          <StatRow
            label="Goals/Game"
            awayValue={awayStats?.goals_per_game?.toFixed(2) ?? null}
            homeValue={homeStats?.goals_per_game?.toFixed(2) ?? null}
            awayColor={awayPrimary}
            homeColor={homePrimary}
            higherIsBetter
          />
          <StatRow
            label="Goals Against/Game"
            awayValue={awayStats?.goals_against_per_game?.toFixed(2) ?? null}
            homeValue={homeStats?.goals_against_per_game?.toFixed(2) ?? null}
            awayColor={awayPrimary}
            homeColor={homePrimary}
            higherIsBetter={false}
          />
          {(awayStats?.power_play_pct != null ||
            homeStats?.power_play_pct != null) && (
            <StatRow
              label="Power Play %"
              awayValue={
                awayStats?.power_play_pct != null
                  ? `${(awayStats.power_play_pct * 100).toFixed(1)}%`
                  : null
              }
              homeValue={
                homeStats?.power_play_pct != null
                  ? `${(homeStats.power_play_pct * 100).toFixed(1)}%`
                  : null
              }
              awayColor={awayPrimary}
              homeColor={homePrimary}
              higherIsBetter
            />
          )}
          {(awayStats?.penalty_kill_pct != null ||
            homeStats?.penalty_kill_pct != null) && (
            <StatRow
              label="Penalty Kill %"
              awayValue={
                awayStats?.penalty_kill_pct != null
                  ? `${(awayStats.penalty_kill_pct * 100).toFixed(1)}%`
                  : null
              }
              homeValue={
                homeStats?.penalty_kill_pct != null
                  ? `${(homeStats.penalty_kill_pct * 100).toFixed(1)}%`
                  : null
              }
              awayColor={awayPrimary}
              homeColor={homePrimary}
              higherIsBetter
            />
          )}
          <StatRow
            label="Goals For"
            awayValue={awayStats?.goals_for ?? null}
            homeValue={homeStats?.goals_for ?? null}
            awayColor={awayPrimary}
            homeColor={homePrimary}
            higherIsBetter
          />
          <StatRow
            label="Goals Against"
            awayValue={awayStats?.goals_against ?? null}
            homeValue={homeStats?.goals_against ?? null}
            awayColor={awayPrimary}
            homeColor={homePrimary}
            higherIsBetter={false}
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  awayValue,
  homeValue,
  awayColor,
  homeColor,
  higherIsBetter = true,
}: StatRowProps) {
  // Determine which value is better for highlighting
  const awayNum = parseFloat(String(awayValue).replace('%', '')) || 0;
  const homeNum = parseFloat(String(homeValue).replace('%', '')) || 0;

  let awayIsBetter = false;
  let homeIsBetter = false;

  if (awayValue !== null && homeValue !== null && awayValue !== '-' && homeValue !== '-') {
    if (higherIsBetter) {
      awayIsBetter = awayNum > homeNum;
      homeIsBetter = homeNum > awayNum;
    } else {
      awayIsBetter = awayNum < homeNum && awayNum > 0;
      homeIsBetter = homeNum < awayNum && homeNum > 0;
    }
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span
        className={`font-bold text-sm ${awayIsBetter ? '' : 'text-[var(--color-text-secondary)]'}`}
        style={awayIsBetter ? { color: awayColor } : undefined}
      >
        {awayValue ?? '-'}
      </span>
      <span className="text-xs text-[var(--color-text-muted)] text-center flex-1 px-2">
        {label}
      </span>
      <span
        className={`font-bold text-sm ${homeIsBetter ? '' : 'text-[var(--color-text-secondary)]'}`}
        style={homeIsBetter ? { color: homeColor } : undefined}
      >
        {homeValue ?? '-'}
      </span>
    </div>
  );
}

export default TeamStatsComparison;
