import { getCurrentUser } from '@/lib/actions/auth';
import { getCaptainDashboard } from '@/lib/actions/captain';
import { redirect } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import CaptainDashboard from '@/components/captain/CaptainDashboard';

type Props = {
  params: Promise<{ locale: string; teamId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; teamId: string }> }) {
  const { teamId } = await params;
  const result = await getCaptainDashboard(teamId);
  if (!result.data) {
    return { title: 'Captain Dashboard | Beer League Hockey' };
  }
  return {
    title: `${result.data.team.name} - Captain Dashboard | Beer League Hockey`,
    description: `Manage your team ${result.data.team.name}`,
  };
}

export default async function CaptainDashboardPage({ params, searchParams }: Props) {
  const { locale, teamId } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();

  if (!userData) {
    redirect({ href: '/login', locale });
    return null; // TypeScript needs this after redirect
  }

  const result = await getCaptainDashboard(teamId);

  if (result.error || !result.data) {
    // If unauthorized, show error page
    if (result.error?.includes('captain')) {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <ArrowLeft className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
            <p className="text-neutral-400 mb-6">
              You must be the team captain to access this page.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rink-500 text-black font-semibold hover:bg-rink-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      );
    }
    notFound();
  }

  const { team, roster_count, pending_requests_count, current_season, upcoming_games } = result.data;
  const resolvedSearchParams = await searchParams;
  const currentTab = resolvedSearchParams.tab || 'overview';

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Team Header Card */}
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
            {/* Color Bar */}
            <div
              className="h-2"
              style={{
                background: `linear-gradient(to right, ${team.primary_color || '#22D3EE'}, ${team.secondary_color || '#000000'})`,
              }}
            />

            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Team Info */}
                <div className="flex items-center gap-4">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                      style={{ backgroundColor: team.primary_color || '#22D3EE' }}
                    >
                      {team.short_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h1 className="text-2xl font-black text-white">{team.name}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rink-500/10 text-rink-500">
                        Team Captain
                      </span>
                      {team.division_name && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span className="text-sm text-neutral-400">
                            {team.division_name}
                          </span>
                        </>
                      )}
                      {current_season && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span className="text-sm text-neutral-400">
                            {current_season.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{roster_count}</div>
                    <div className="text-xs text-neutral-500">Players</div>
                  </div>
                  <div className="w-px h-10 bg-neutral-800" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-rink-500">{pending_requests_count}</div>
                    <div className="text-xs text-neutral-500">Pending</div>
                  </div>
                  <div className="w-px h-10 bg-neutral-800" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{upcoming_games.length}</div>
                    <div className="text-xs text-neutral-500">Games</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content - Client Component */}
        <CaptainDashboard
          teamId={teamId}
          team={team}
          rosterCount={roster_count}
          pendingRequestsCount={pending_requests_count}
          upcomingGames={upcoming_games}
          initialTab={currentTab}
        />
      </div>
    </div>
  );
}
