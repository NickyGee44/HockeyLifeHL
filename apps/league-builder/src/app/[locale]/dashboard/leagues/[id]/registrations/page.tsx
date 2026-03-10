import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getPendingRegistrations,
  getRegistrationSummary,
} from '@/lib/actions/player-registration';
import { RegistrationsTable } from '@/components/dashboard/leagues/registrations-table';
import { RegistrationFilters } from '@/components/dashboard/leagues/registration-filters';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ImportPlayersButton } from '@/components/players/ImportPlayersButton';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { pickOperationalSeason } from '@/lib/seasons/operational';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    status?: string;
    type?: string;
    season?: string;
    search?: string;
    page?: string;
    tool?: string;
  }>;
};

async function getLeague(supabase: any, id: string) {
  const { data: league, error } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      seasons (
        id,
        name,
        status
      )
    `)
    .eq('id', id)
    .single();

  if (error || !league) {
    return null;
  }

  return league;
}

export default async function RegistrationsPage({
  params,
  searchParams,
}: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const league = await getLeague(supabase, leagueId);

  if (!league) {
    notFound();
  }

  // Parse search params
  const status = resolvedSearchParams.status;
  const type = resolvedSearchParams.type;
  const seasonId = resolvedSearchParams.season;
  const search = resolvedSearchParams.search;
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const tool = resolvedSearchParams.tool;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Fetch data in parallel
  const [registrationsResult, summaryResult] = await Promise.all([
    getPendingRegistrations(leagueId, {
      status,
      type,
      seasonId,
      search,
      limit,
      offset,
    }),
    getRegistrationSummary(leagueId),
  ]);

  const registrations = registrationsResult.success
    ? registrationsResult.data?.registrations || []
    : [];
  const total = registrationsResult.success
    ? registrationsResult.data?.total || 0
    : 0;
  const summary = summaryResult.success ? summaryResult.data : null;

  const totalPages = Math.ceil(total / limit);

  // Get seasons for filter
  const seasons = (league.seasons || []).map((s: any) => ({
    id: s.id,
    name: s.name,
  }));

  // Resolve active season for player import (prefer URL param, then active status)
  const activeSeason =
    seasons.find((s: any) => (seasonId ? s.id === seasonId : false)) ??
    pickOperationalSeason((league.seasons as any[]) ?? []) ??
    seasons[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Player Registrations
          </h1>
          <p className="text-neutral-400">{league.name}</p>
        </div>
        {activeSeason && (
          <ImportPlayersButton
            leagueId={leagueId}
            seasonId={activeSeason.id}
            defaultOpen={tool === 'import-players'}
          />
        )}
      </div>

      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={Users}
            label="Total"
            value={summary.total}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Pending"
            value={summary.pending}
            color="amber"
            href={`?status=pending`}
          />
          <StatCard
            icon={CheckCircle}
            label="Approved"
            value={summary.approved}
            color="green"
            href={`?status=approved`}
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            value={summary.rejected}
            color="red"
            href={`?status=rejected`}
          />
          <StatCard
            icon={AlertCircle}
            label="Waitlisted"
            value={summary.waitlisted}
            color="purple"
            href={`?status=waitlisted`}
          />
        </div>
      )}

      {/* Filters */}
      <RegistrationFilters
        seasons={seasons}
        currentStatus={status}
        currentType={type}
        currentSeason={seasonId}
        currentSearch={search}
      />

      {/* Table */}
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-rink-500" />
          </div>
        }
      >
        <RegistrationsTable
          registrations={registrations}
          leagueId={leagueId}
        />
      </Suspense>

      {/* Pagination */}
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
                className="px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
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
                className="px-4 py-2 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Stats Card Component
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
    <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-neutral-400">{label}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export function generateMetadata() {
  return {
    title: 'Player Registrations',
    description: 'Manage player registration submissions',
  };
}
