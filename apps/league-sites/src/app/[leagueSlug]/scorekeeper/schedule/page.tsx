import { redirect } from 'next/navigation';
import { getScorekeeperSession } from '@/lib/actions/scorekeeper';
import { getScorekeeperSchedule } from '@/lib/actions/scorekeeper-dashboard';
import { ScorekeeperScheduleView } from '@/components/scorekeeper/ScorekeeperScheduleView';

export const dynamic = 'force-dynamic';

interface SchedulePageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default async function ScorekeeperSchedulePage({ params }: SchedulePageProps) {
  const { leagueSlug } = await params;

  // Check session
  const sessionResult = await getScorekeeperSession();
  if (!sessionResult.success || !sessionResult.session) {
    redirect(`/${leagueSlug}/scorekeeper`);
  }

  // Fetch schedule data
  const scheduleResult = await getScorekeeperSchedule();

  if (!scheduleResult.success || !scheduleResult.games) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Schedule Unavailable
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {scheduleResult.error || 'Unable to load your schedule.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScorekeeperScheduleView
      games={scheduleResult.games}
      leagueSlug={leagueSlug}
    />
  );
}
