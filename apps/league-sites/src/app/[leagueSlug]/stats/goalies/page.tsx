import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface GoalieStatsRedirectPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    season?: string;
    sort?: string;
    dir?: string;
    division?: string;
    view?: string;
  }>;
}

export default async function GoalieStatsRedirectPage({
  params,
  searchParams,
}: GoalieStatsRedirectPageProps) {
  const { leagueSlug } = await params;
  const resolvedSearch = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearch)) {
    if (typeof value === 'string' && value.length > 0) {
      nextParams.set(key, value);
    }
  }

  nextParams.set('mode', 'goalies');
  redirect(`/${leagueSlug}/stats?${nextParams.toString()}`);
}
