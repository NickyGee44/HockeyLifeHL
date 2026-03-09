import { redirect } from 'next/navigation';
import { RefereeDashboardView } from '@/components/referee/RefereeDashboardView';
import { getRefereeSession, getRefereeDashboard } from '@/lib/actions/referee';

interface DashboardPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default async function RefereeDashboardPage({ params }: DashboardPageProps) {
  const { leagueSlug } = await params;

  // Check referee session — redirect to token entry if not authenticated
  const sessionResult = await getRefereeSession();
  if (!sessionResult.success || !sessionResult.session) {
    redirect(`/${leagueSlug}/referee`);
  }

  // Fetch dashboard data from game_officials + league_referees
  const dashboardResult = await getRefereeDashboard();

  return (
    <RefereeDashboardView
      leagueSlug={leagueSlug}
      dashboardData={dashboardResult.success ? dashboardResult.data : undefined}
    />
  );
}
