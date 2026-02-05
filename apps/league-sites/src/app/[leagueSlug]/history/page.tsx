import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLeagueBySlug, getSeasons, getStandings } from '@/lib/data';
import { Trophy, Calendar, ChevronRight, Medal, Users } from 'lucide-react';
import type { Metadata } from 'next';

interface HistoryPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'History | League Not Found' };
  }

  return {
    title: `Season History | ${league.name}`,
    description: `View past seasons and champions of ${league.name}`,
  };
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const seasons = await getSeasons(league.id);

  // Separate current/active seasons from past seasons
  const now = new Date();
  const pastSeasons = seasons.filter((s) => {
    const endDate = new Date(s.end_date);
    return endDate < now && s.status !== 'active';
  });

  const activeSeasons = seasons.filter((s) => s.status === 'active');

  // Get standings for each past season to find champions
  const seasonsWithChampions = await Promise.all(
    pastSeasons.map(async (season) => {
      const standings = await getStandings(league.id, season.id);
      // Find the champion (first place overall or playoff winner)
      const champion = standings.length > 0 ? standings[0] : null;
      return {
        ...season,
        champion,
      };
    })
  );

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[var(--league-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Season History
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Past seasons and champions of {league.name}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Active Seasons */}
        {activeSeasons.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Current Season
            </h2>
            <div className="grid gap-4">
              {activeSeasons.map((season) => (
                <Link
                  key={season.id}
                  href={`/${leagueSlug}/standings?season=${season.id}`}
                  className="bg-[var(--color-surface)] border border-green-500/30 rounded-xl p-6 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                        {season.name}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(season.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' - '}
                        {new Date(season.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                      <span className="text-sm font-medium">In Progress</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Past Seasons */}
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Past Seasons
        </h2>

        {seasonsWithChampions.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              No completed seasons yet. Check back after the current season ends!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {seasonsWithChampions.map((season) => (
              <Link
                key={season.id}
                href={`/${leagueSlug}/standings?season=${season.id}`}
                className="block bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Season Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                        {season.name}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(season.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                        {' - '}
                        {new Date(season.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Champion */}
                    {season.champion && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 rounded-lg">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <div>
                          <p className="text-xs text-amber-400 uppercase tracking-wider">
                            Champion
                          </p>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {season.champion.team_name}
                          </p>
                        </div>
                      </div>
                    )}

                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] hidden sm:block" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* League Stats Summary */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Trophy className="w-6 h-6 text-amber-400" />}
            value={seasonsWithChampions.length}
            label="Seasons Completed"
          />
          <StatCard
            icon={<Calendar className="w-6 h-6 text-blue-400" />}
            value={seasons.length}
            label="Total Seasons"
          />
          <StatCard
            icon={<Medal className="w-6 h-6 text-[var(--league-primary)]" />}
            value={new Set(seasonsWithChampions.map((s) => s.champion?.team_id).filter(Boolean)).size}
            label="Unique Champions"
          />
          <StatCard
            icon={<Users className="w-6 h-6 text-green-400" />}
            value={activeSeasons.length}
            label="Active Seasons"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}
