import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bug } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BugReportsDashboardClient } from './BugReportsDashboardClient';
import { getLeagueBugReports } from '@/lib/actions/bug-reports';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueBugReportsPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('bugReports');

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    nextRedirect(`/${locale}/login?redirect=/${locale}/dashboard/leagues/${leagueId}/bugs`);
  }

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, owner_id, created_by')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const isAuthorized =
    league.owner_id === user.id ||
    league.created_by === user.id ||
    Boolean(membership) ||
    Boolean(profile?.is_platform_admin);

  if (!isAuthorized) {
    nextRedirect(`/${locale}/dashboard?error=unauthorized`);
  }

  const reports = await getLeagueBugReports(leagueId);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToLeague', { leagueName: league.name })}
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rink-500/15 text-rink-400">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{t('title')}</h1>
            <p className="text-neutral-400">{t('subtitle')}</p>
          </div>
        </div>

        <BugReportsDashboardClient
          leagueId={leagueId}
          initialReports={reports}
          ui={{
            openBugs: t('dashboard.openBugs'),
            criticalBugs: t('dashboard.criticalBugs'),
            reportsThisWeek: t('dashboard.reportsThisWeek'),
            resolvedThisMonth: t('dashboard.resolvedThisMonth'),
            allStatuses: t('filters.allStatuses'),
            allSeverities: t('filters.allSeverities'),
            allCategories: t('filters.allCategories'),
            date: t('table.date'),
            description: t('table.description'),
            category: t('table.category'),
            severity: t('table.severity'),
            status: t('table.status'),
            reports: t('table.reports'),
            actions: t('table.actions'),
            fullDescription: t('detail.fullDescription'),
            expectedBehavior: t('detail.expectedBehavior'),
            screenshot: t('detail.screenshot'),
            browserInfo: t('detail.browserInfo'),
            consoleErrors: t('detail.consoleErrors'),
            failedNetworkRequests: t('detail.failedNetworkRequests'),
            navigationTrail: t('detail.navigationTrail'),
            userInteractions: t('detail.userInteractions'),
            quickActions: t('detail.quickActions'),
            resolutionNotes: t('detail.resolutionNotes'),
            saveNotes: t('detail.saveNotes'),
            noResults: t('table.noResults'),
          }}
          labels={{
            status: {
              new: t('status.new'),
              investigating: t('status.investigating'),
              fix_deployed: t('status.fixDeployed'),
              closed: t('status.closed'),
              duplicate: t('status.duplicate'),
              wont_fix: t('status.wontFix'),
            },
            severity: {
              critical: t('severity.critical'),
              high: t('severity.high'),
              medium: t('severity.medium'),
              low: t('severity.low'),
            },
            category: {
              bug: t('category.bug'),
              visual: t('category.visual'),
              confusing: t('category.confusing'),
              suggestion: t('category.suggestion'),
              other: t('category.other'),
            },
          }}
        />
      </div>
    </div>
  );
}
