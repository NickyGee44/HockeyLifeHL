import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
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

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const currentSeason = await getCurrentSeason(league.id);

  const [seasons, suspensions] = await Promise.all([
    getSeasons(league.id),
    getSuspensions(league.id, seasonFilter || currentSeason?.id),
  ]);

  // Filter by status on the client side
  const filteredSuspensions = statusFilter && statusFilter !== 'all'
    ? suspensions.filter((s) => s.status === statusFilter)
    : suspensions;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-2xl shadow-lg max-w-5xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)]">
            Suspensions
          </h1>
          <ShieldAlert className="w-7 h-7 text-[var(--league-primary)]" />
        </div>

        <SuspensionsClient
          suspensions={filteredSuspensions}
          seasons={seasons}
          currentFilters={{
            season: seasonFilter || currentSeason?.id || '',
            status: statusFilter || 'all',
          }}
          leagueSlug={leagueSlug}
        />
      </div>
    </div>
  );
}
