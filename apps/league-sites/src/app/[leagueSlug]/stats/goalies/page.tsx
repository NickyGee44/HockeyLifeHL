import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { getLeagueBySlug, getGoalieLeaders, getCurrentSeason, getSeasons, getPlayerBadgesByIds } from '@/lib/data';
import { GoalieStatsTable } from '@/components/stats/GoalieStatsTable';
import { GoalieStatsFilters } from '@/components/stats/GoalieStatsFilters';
import { SubscriptionWall } from '@/components/shared';

interface GoalieStatsPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    season?: string;
    view?: string;
    sort?: 'wins' | 'save_percentage' | 'goals_against_average' | 'shutouts';
    division?: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Goalie Stats',
  description: 'League goaltender statistics and leaders',
};

export default async function GoalieStatsPage({ params, searchParams }: GoalieStatsPageProps) {
  const { leagueSlug } = await params;
  const { season: seasonFilter, view, sort = 'wins', division: divisionFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const currentSeason = await getCurrentSeason(league.id);
  const isAllTime = view === 'all-time';
  const seasonId = isAllTime ? null : (seasonFilter || currentSeason?.id);
  const effectiveDivisionFilter = isAllTime ? undefined : divisionFilter;

  // Fetch data in parallel, with division filter
  const [seasons, goalieLeaders] = await Promise.all([
    getSeasons(league.id),
    getGoalieLeaders(league.id, seasonId, sort, 50, effectiveDivisionFilter, league.slug),
  ]);

  // Fetch badges for goalies
  const goaliePlayerIds = goalieLeaders
    .map((goalie) => goalie.profile_id)
    .filter((playerId): playerId is string => Boolean(playerId));
  const badges = await getPlayerBadgesByIds(goaliePlayerIds);

  return (
    <SubscriptionWall>
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Back Link */}
      <Link
        href={`/${leagueSlug}/stats`}
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stats
      </Link>

      <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-2xl shadow-lg max-w-5xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)]">
            Goalie Stats
          </h1>
          <Shield className="w-7 h-7 text-[var(--league-primary)]" />
        </div>

        {/* Season Info */}
        {isAllTime ? (
          <p className="text-[var(--color-text-secondary)] mb-4">
            Career goaltending totals across all seasons
          </p>
        ) : currentSeason && !seasonFilter ? (
          <p className="text-[var(--color-text-secondary)] mb-4">
            {currentSeason.name} Season
          </p>
        ) : null}

        {/* Filters (includes division sync) */}
        <GoalieStatsFilters
          seasons={seasons}
          currentFilters={{ season: seasonFilter, view, sort, division: divisionFilter }}
          leagueSlug={leagueSlug}
          disableDivisionFilter={isAllTime}
        />

        {/* Goalie Stats Table */}
        {goalieLeaders.length > 0 ? (
          <GoalieStatsTable
            goalies={goalieLeaders}
            leagueSlug={leagueSlug}
            currentSort={sort}
            badges={badges}
          />
        ) : (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Goalie Stats Available</h3>
            <p className="text-[var(--color-text-secondary)]">
              Goalie statistics will appear once games are recorded.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
          <h3 className="font-semibold mb-3 text-sm">Statistics Legend</h3>
          <div className="flex flex-wrap gap-6 text-sm text-[var(--color-text-secondary)]">
            <span><strong>GP</strong> - Games Played</span>
            <span><strong>W</strong> - Wins</span>
            <span><strong>L</strong> - Losses</span>
            <span><strong>GAA</strong> - Goals Against Average</span>
            <span><strong>SV%</strong> - Save Percentage</span>
            <span><strong>SO</strong> - Shutouts</span>
          </div>
        </div>
      </div>
    </div>
    </SubscriptionWall>
  );
}
