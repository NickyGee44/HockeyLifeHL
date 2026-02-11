import { redirect } from 'next/navigation';
import { getScorekeeperSession } from '@/lib/actions/scorekeeper';
import { getScorekeeperDashboard } from '@/lib/actions/scorekeeper-dashboard';
import { ScorekeeperDashboardView } from '@/components/scorekeeper/ScorekeeperDashboardView';

interface DashboardPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default async function ScorekeeperDashboardPage({ params }: DashboardPageProps) {
  const { leagueSlug } = await params;

  // Check session
  const sessionResult = await getScorekeeperSession();
  if (!sessionResult.success || !sessionResult.session) {
    redirect(`/${leagueSlug}/scorekeeper`);
  }

  // Fetch dashboard data
  const dashboardResult = await getScorekeeperDashboard();

  if (!dashboardResult.success || !dashboardResult.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Dashboard Unavailable
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {dashboardResult.error || 'Unable to load your dashboard. Your session may not be linked to a scorekeeper profile.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScorekeeperDashboardView
      data={dashboardResult.data}
      leagueSlug={leagueSlug}
    />
  );
}
