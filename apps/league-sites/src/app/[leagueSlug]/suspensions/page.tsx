import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getSuspensions, getSeasons, getCurrentSeason } from '@/lib/data';
import { SuspensionsClient } from '@/components/suspensions/SuspensionsClient';

interface SuspensionsPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{
    season?: string;
    status?: string;
  }>;
}

export async function generateMetadata({ params }: SuspensionsPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return { title: 'Not Found' };
  return {
    title: `Suspensions | ${league.name}`,
    description: `View player suspensions for ${league.name}`,
  };
}

export default async function SuspensionsPage({ params, searchParams }: SuspensionsPageProps) {
  const { leagueSlug } = await params;
  const { season: seasonFilter, status: statusFilter } = await searchParams;
  const normalizedStatusFilter = statusFilter === 'completed' ? 'served' : statusFilter;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const currentSeason = await getCurrentSeason(league.id);

  const [seasons, suspensions] = await Promise.all([
    getSeasons(league.id),
    getSuspensions(league.id, seasonFilter || currentSeason?.id),
  ]);

  // Filter by status on the client side
  const filteredSuspensions = normalizedStatusFilter && normalizedStatusFilter !== 'all'
    ? suspensions.filter((s) => s.status === normalizedStatusFilter)
    : suspensions;

  return (
    <SubscriptionWall>
    <div className="container mx-auto px-4 py-8 lg:py-12">
      <div className="mx-auto max-w-6xl rounded-[32px] border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-6 shadow-[0_34px_90px_-70px_rgba(0,0,0,0.95)] md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-6 lg:border-b lg:border-[var(--color-border)] lg:pb-6">
          <div>
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)] lg:block">
              Discipline desk
            </p>
            <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)] lg:mt-1 lg:text-4xl lg:font-black">
              Suspensions
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm text-[var(--color-text-secondary)] lg:block">
              Active and historical discipline records are listed with season and status controls.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--league-primary)]/20 bg-[var(--league-primary)]/10">
            <ShieldAlert className="w-7 h-7 text-[var(--league-primary)]" />
          </div>
        </div>

        <SuspensionsClient
          suspensions={filteredSuspensions}
          seasons={seasons}
          currentFilters={{
            season: seasonFilter || currentSeason?.id || '',
            status: normalizedStatusFilter || 'all',
          }}
          leagueSlug={leagueSlug}
        />
      </div>
    </div>
    </SubscriptionWall>
  );
}
