import { RefereeDashboardView } from '@/components/referee/RefereeDashboardView';

interface DashboardPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default async function RefereeDashboardPage({ params }: DashboardPageProps) {
  const { leagueSlug } = await params;

  // TODO: Check referee session — redirect to token entry if not authenticated
  // const sessionResult = await getRefereeSession();
  // if (!sessionResult.success || !sessionResult.session) {
  //   redirect(`/${leagueSlug}/referee`);
  // }

  // TODO: Fetch dashboard data from game_officials + league_referees
  // const dashboardResult = await getRefereeDashboard();

  return (
    <RefereeDashboardView
      leagueSlug={leagueSlug}
    />
  );
}
