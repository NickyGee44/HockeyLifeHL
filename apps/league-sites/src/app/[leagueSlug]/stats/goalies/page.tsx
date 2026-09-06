import type { Metadata } from 'next';
import StatsPage from '../page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Goalie Stats',
  description: 'League goalie statistics',
};

interface GoalieStatsPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    division?: string;
    view?: string;
    season?: string;
    mode?: string;
    sort?: string;
    dir?: string;
    team?: string;
    position?: string;
    statsType?: string;
  }>;
}

export default async function GoalieStatsPage({
  params,
  searchParams,
}: GoalieStatsPageProps) {
  const resolvedSearch = await searchParams;

  return StatsPage({
    params,
    searchParams: Promise.resolve({
      ...resolvedSearch,
      mode: 'goalies',
    }),
  });
}
