import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPendingRegistrations,
} from '@/lib/actions/player-registration';
import { RegistrationsTable } from '@/components/dashboard/leagues/registrations-table';
import { RegistrationFilters } from '@/components/dashboard/leagues/registration-filters';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { ImportPlayersButton } from '@/components/players/ImportPlayersButton';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { buildSeasonWorkspaceHref } from '@/lib/dashboard/workspace-routes';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
  searchParams: Promise<{
    status?: string;
    type?: string;
    search?: string;
    page?: string;
    tool?: string;
  }>;
};

export default async function SeasonRegistrationsPage({
  params,
  searchParams,
}: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const [{ data: league }, { data: season }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).maybeSingle(),
    supabase.from('seasons').select('id, name').eq('id', seasonId).eq('league_id', leagueId).maybeSingle(),
  ]);

  if (!league || !season) {
    notFound();
  }

  const status = resolvedSearchParams.status;
  const type = resolvedSearchParams.type;
  const search = resolvedSearchParams.search;
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const tool = resolvedSearchParams.tool;
  const limit = 20;
  const offset = (page - 1) * limit;

  const [
    registrationsResult,
    totalResult,
    pendingResult,
    approvedResult,
    rejectedResult,
    waitlistedResult,
  ] = await Promise.all([
    getPendingRegistrations(leagueId, {
      status,
      type,
      seasonId,
      search,
      limit,
      offset,
    }),
    supabase
      .from('registration_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .not('submitted_at', 'is', null),
    supabase
      .from('registration_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'pending')
      .not('submitted_at', 'is', null),
    supabase
      .from('registration_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'approved')
      .not('submitted_at', 'is', null),
    supabase
      .from('registration_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'rejected')
      .not('submitted_at', 'is', null),
    supabase
      .from('registration_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('status', 'waitlisted')
      .not('submitted_at', 'is', null),
  ]);

  const registrations = registrationsResult.success
    ? registrationsResult.data?.registrations || []
    : [];
  const total = registrationsResult.success
    ? registrationsResult.data?.total || 0
    : 0;
  const totalPages = Math.ceil(total / limit);

  const loadErrors = [
    !registrationsResult.success ? registrationsResult.error : null,
  ].filter(Boolean) as string[];

  const summary = {
    total: totalResult.count ?? 0,
    pending: pendingResult.count ?? 0,
    approved: approvedResult.count ?? 0,
    rejected: rejectedResult.count ?? 0,
    waitlisted: waitlistedResult.count ?? 0,
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="space-y-3">
          <Link
            href={buildSeasonWorkspaceHref(locale, leagueId, seasonId)}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {season.name}
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-500">
                Season Workspace
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                Registrations
              </h1>
              <p className="mt-1 text-neutral-400">
                {league.name} / {season.name}
              </p>
            </div>
            <ImportPlayersButton
              leagueId={leagueId}
              seasonId={seasonId}
              defaultOpen={tool === 'import-players'}
            />
          </div>
        </div>

        {loadErrors.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">
                  We couldn&apos;t fully load registrations.
                </p>
                {loadErrors.map((error) => (
                  <p key={error} className="text-sm text-amber-100/90">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard icon={Users} label="Total" value={summary.total} color="blue" />
          <StatCard icon={Clock} label="Pending" value={summary.pending} color="amber" href={`?status=pending`} />
          <StatCard icon={CheckCircle} label="Approved" value={summary.approved} color="green" href={`?status=approved`} />
          <StatCard icon={XCircle} label="Rejected" value={summary.rejected} color="red" href={`?status=rejected`} />
          <StatCard icon={AlertCircle} label="Waitlisted" value={summary.waitlisted} color="purple" href={`?status=waitlisted`} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Season filters</h2>
              <p className="text-sm text-neutral-400">
                All results are locked to {season.name}. Use status, type, and search to narrow the list.
              </p>
            </div>
          </div>
          <RegistrationFilters
            seasons={[{ id: season.id, name: season.name }]}
            currentStatus={status}
            currentType={type}
            currentSeason={seasonId}
            currentSearch={search}
            hideSeasonFilter
          />
        </div>

        <RegistrationsTable registrations={registrations} leagueId={leagueId} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({
                    ...resolvedSearchParams,
                    page: String(page - 1),
                  }).toString()}`}
                  className="rounded-lg bg-neutral-800 px-4 py-2 text-white transition-colors hover:bg-neutral-700"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({
                    ...resolvedSearchParams,
                    page: String(page + 1),
                  }).toString()}`}
                  className="rounded-lg bg-neutral-800 px-4 py-2 text-white transition-colors hover:bg-neutral-700"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'blue' | 'amber' | 'green' | 'red' | 'purple';
  href?: string;
}

function StatCard({ icon: Icon, label, value, color, href }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/20 text-amber-400',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  const content = (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/30 p-4 transition-colors hover:bg-neutral-800/50">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-neutral-400">{label}</p>
        </div>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
