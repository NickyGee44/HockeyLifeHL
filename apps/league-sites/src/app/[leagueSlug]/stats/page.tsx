import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Trophy, Target, Shield, ChevronRight, Zap } from 'lucide-react';
import { getLeagueBySlug, getStatsLeadersWithAvatars, getCurrentSeason, getSpecialTeamsLeaders, getPlayerBadgesByIds } from '@/lib/data';
import { StatsLeadersTabs } from '@/components/StatsLeadersTabs';
import { SpecialTeamsTable } from '@/components/stats/SpecialTeamsTable';
import { StatLeaders } from '@/components/stats/StatLeaders';
import { StatsFilters } from '@/components/stats/StatsFilters';
import { SeasonSelector } from '@/components/stats/SeasonSelector';
import { createClient } from '@/lib/supabase/server';

interface StatsPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ division?: string; view?: string; season?: string }>;
}

export const metadata: Metadata = {
  title: 'Stats Leaders',
  description: 'League scoring leaders and statistics',
};

export default async function StatsPage({ params, searchParams }: StatsPageProps) {
  const { leagueSlug } = await params;
  const { division: divisionFilter, view, season: seasonParam } = await searchParams;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const currentSeason = await getCurrentSeason(league.id);

  // Fetch all seasons for selector
  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, status')
    .eq('league_id', league.id)
    .order('start_date', { ascending: false });

  // Determine which season to query
  const isAllTime = view === 'all-time';
  const selectedSeasonId = isAllTime ? null : (seasonParam || currentSeason?.id);

  // Fetch different stat categories in parallel
  // Note: Division filter disabled for all-time view
  const effectiveDivisionFilter = isAllTime ? undefined : divisionFilter;

  const [pointsLeaders, goalsLeaders, assistsLeaders, specialTeamsLeaders] = await Promise.all([
    getStatsLeadersWithAvatars(league.id, 'points', 50, effectiveDivisionFilter, selectedSeasonId),
    getStatsLeadersWithAvatars(league.id, 'goals', 50, effectiveDivisionFilter, selectedSeasonId),
    getStatsLeadersWithAvatars(league.id, 'assists', 50, effectiveDivisionFilter, selectedSeasonId),
    getSpecialTeamsLeaders(league.id, selectedSeasonId || currentSeason?.id, effectiveDivisionFilter),
  ]);

  // Enrich special teams leaders with avatar URLs
  if (specialTeamsLeaders.length > 0) {
    const stPlayerIds = specialTeamsLeaders.map(p => p.player_id);
    const stSupabase = await createClient();
    const { data: stProfiles } = await stSupabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', stPlayerIds);
    const stAvatarMap = new Map(
      (stProfiles || []).map((p) => [p.id, p.avatar_url])
    );
    for (const leader of specialTeamsLeaders) {
      leader.avatar_url = stAvatarMap.get(leader.player_id) || null;
    }
  }

  // Collect all player IDs for badge lookup
  const allPlayerIds = [...new Set([
    ...pointsLeaders.map(p => p.player_id),
    ...goalsLeaders.map(p => p.player_id),
    ...assistsLeaders.map(p => p.player_id),
  ])];
  const badges = await getPlayerBadgesByIds(allPlayerIds);

  const hasStats =
    pointsLeaders.length > 0 ||
    goalsLeaders.length > 0 ||
    assistsLeaders.length > 0;

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Season Selector and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <SeasonSelector seasons={seasons || []} currentSeasonId={currentSeason?.id} />
        {!isAllTime && <StatsFilters leagueSlug={leagueSlug} />}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-4">
          <BarChart3 className="w-8 h-8 text-[var(--league-primary)]" />
          {isAllTime ? 'All-Time Stats Leaders' : 'Stats Leaders'}
        </h1>
        {!isAllTime && selectedSeasonId && (
          <p className="text-[var(--color-text-secondary)]">
            {seasons?.find(s => s.id === selectedSeasonId)?.name || currentSeason?.name}
          </p>
        )}
        {isAllTime && (
          <p className="text-[var(--color-text-secondary)]">
            Career statistics across all seasons
          </p>
        )}
      </div>

      {/* Stats Content */}
      {hasStats ? (
        <StatsLeadersTabs
          pointsLeaders={pointsLeaders}
          goalsLeaders={goalsLeaders}
          assistsLeaders={assistsLeaders}
          leagueSlug={leagueSlug}
          badges={badges}
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

      {/* Special Teams Leader Cards */}
      {specialTeamsLeaders.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[var(--league-primary)]" />
            Special Teams Leaders
          </h2>
          <StatLeaders leaders={specialTeamsLeaders} leagueSlug={leagueSlug} />
        </div>
      )}

      {/* Special Teams Full Table */}
      {specialTeamsLeaders.length > 0 && (
        <div className="mt-8 card p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[var(--league-primary)]" />
            Special Teams Stats
          </h2>
          <SpecialTeamsTable leaders={specialTeamsLeaders} leagueSlug={leagueSlug} />
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
          <span><strong>PPG</strong> - Power Play Goals</span>
          <span><strong>PPA</strong> - Power Play Assists</span>
          <span><strong>PPP</strong> - Power Play Points</span>
          <span><strong>SHG</strong> - Short-Handed Goals</span>
          <span><strong>SHA</strong> - Short-Handed Assists</span>
          <span><strong>GWG</strong> - Game-Winning Goals</span>
          <span><strong>ENG</strong> - Empty-Net Goals</span>
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
