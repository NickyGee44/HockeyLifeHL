import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getCurrentSeason,
  getLeagueBySlug,
  getPlayerBadgesByIds,
  getSeasons,
  getTeams,
  getUnifiedGoalieStatsRows,
  getUnifiedSkaterStatsRows,
} from '@/lib/data';
import { StatsWorkspace } from '@/components/stats/StatsWorkspace';
import { SubscriptionWall } from '@/components/shared';
import type { StatsMode } from '@/lib/types';

interface StatsPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    division?: string;
    view?: string;
    season?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Stats',
  description: 'League player and goalie statistics',
};

export const dynamic = 'force-dynamic';

export default async function StatsPage({ params, searchParams }: StatsPageProps) {
  const { leagueSlug } = await params;
  const {
    division: divisionFilter,
    view,
    season: seasonParam,
    mode: modeParam,
  } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const [currentSeason, seasons] = await Promise.all([
    getCurrentSeason(league.id),
    getSeasons(league.id),
  ]);

  const mode: StatsMode = modeParam === 'goalies' ? 'goalies' : 'skaters';
  const isAllTime = view === 'all-time';
  const requestedSeason = seasonParam ? seasons.find((season) => season.id === seasonParam) : null;
  const selectedSeasonId = isAllTime ? null : (requestedSeason?.id || currentSeason?.id || seasons[0]?.id || null);
  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || currentSeason || null;
  const effectiveDivisionFilter = isAllTime ? undefined : divisionFilter;

  const [teams, skaterRows, goalieRows] = await Promise.all([
    getTeams(league.id, selectedSeasonId || undefined),
    mode === 'skaters'
      ? getUnifiedSkaterStatsRows(league.id, selectedSeasonId, effectiveDivisionFilter, leagueSlug, selectedSeason?.name)
      : Promise.resolve([]),
    mode === 'goalies'
      ? getUnifiedGoalieStatsRows(league.id, selectedSeasonId, effectiveDivisionFilter, leagueSlug, selectedSeason?.name)
      : Promise.resolve([]),
  ]);

  const activePlayerIds = [...new Set((mode === 'skaters' ? skaterRows : goalieRows).map((row) => row.player_id))];
  const badges = await getPlayerBadgesByIds(activePlayerIds);
  const seasonLabel = isAllTime
    ? 'All-Time Career Stats'
    : selectedSeason?.name || null;

  return (
    <SubscriptionWall>
      <div className="container mx-auto px-4 py-10 animate-fade-in md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <StatsWorkspace
            leagueSlug={leagueSlug}
            seasons={seasons}
            teams={teams}
            currentSeasonId={currentSeason?.id || null}
            mode={mode}
            seasonLabel={seasonLabel}
            isAllTime={isAllTime}
            skaterRows={skaterRows}
            goalieRows={goalieRows}
            badges={badges}
          />
        </div>
      </div>
    </SubscriptionWall>
  );
}
