import { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Trophy, Target, Shield, ChevronRight } from 'lucide-react';
import { getLeagueBySlug, getStatsLeaders, getCurrentSeason } from '@/lib/data';
import { StatsLeadersTabs } from '@/components/StatsLeadersTabs';

interface StatsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export const metadata: Metadata = {
  title: 'Stats Leaders',
  description: 'League scoring leaders and statistics',
};

export default async function StatsPage({ params }: StatsPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) return null;

  const season = await getCurrentSeason(league.id);

  // Fetch different stat categories
  const [pointsLeaders, goalsLeaders, assistsLeaders] = await Promise.all([
    getStatsLeaders(league.id, 'points', 10),
    getStatsLeaders(league.id, 'goals', 10),
    getStatsLeaders(league.id, 'assists', 10),
  ]);

  const hasStats =
    pointsLeaders.length > 0 ||
    goalsLeaders.length > 0 ||
    assistsLeaders.length > 0;

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-4">
          <BarChart3 className="w-8 h-8 text-[var(--league-primary)]" />
          Stats Leaders
        </h1>
        {season && (
          <p className="text-[var(--color-text-secondary)]">
            {season.name} Season
          </p>
        )}
      </div>

      {/* Stats Content */}
      {hasStats ? (
        <StatsLeadersTabs
          pointsLeaders={pointsLeaders}
          goalsLeaders={goalsLeaders}
          assistsLeaders={assistsLeaders}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Points Leaders */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-[var(--league-primary)]" />
              <h2 className="font-bold text-lg">Points Leaders</h2>
            </div>
            <EmptyState message="No scoring data yet" />
          </div>

          {/* Goals Leaders */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-[var(--league-primary)]" />
              <h2 className="font-bold text-lg">Goals Leaders</h2>
            </div>
            <EmptyState message="No goals data yet" />
          </div>

          {/* Assists Leaders */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-[var(--league-primary)]" />
              <h2 className="font-bold text-lg">Assists Leaders</h2>
            </div>
            <EmptyState message="No assists data yet" />
          </div>
        </div>
      )}

      {/* Goalie Stats Link */}
      <div className="mt-8">
        <Link
          href={`/${leagueSlug}/stats/goalies`}
          className="group card p-6 flex items-center justify-between hover:border-[var(--league-primary)]/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[var(--league-primary)]/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[var(--league-primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg group-hover:text-[var(--league-primary)] transition-colors">
                Goalie Statistics
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                View wins, save percentage, GAA, and shutouts
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--league-primary)] group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Legend */}
      <div className="mt-8 card p-4">
        <h3 className="font-semibold mb-3 text-sm">Statistics Legend</h3>
        <div className="flex flex-wrap gap-6 text-sm text-[var(--color-text-secondary)]">
          <span><strong>GP</strong> - Games Played</span>
          <span><strong>G</strong> - Goals</span>
          <span><strong>A</strong> - Assists</span>
          <span><strong>PTS</strong> - Points</span>
          <span><strong>PIM</strong> - Penalty Minutes</span>
          <span><strong>+/-</strong> - Plus/Minus</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <BarChart3 className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
      <p className="text-[var(--color-text-secondary)]">{message}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">
        Stats will appear once games are recorded.
      </p>
    </div>
  );
}
