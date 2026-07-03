import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, BarChart3, History, Newspaper } from 'lucide-react';
import { notFound } from 'next/navigation';
import { SubscriptionWall } from '@/components/shared';
import {
  getLeagueBySlug,
  getPlayerProfile,
  getPlayerCareerStats,
  getImportedPlayerCareerAchievements,
  getPlayerGameLog,
  getSeasons,
  getCurrentSeason,
  getPlayerBadges,
  getPlayerArticles,
  getPlayerCareerStatsTimeline,
  getPlayerGoalieMatchups,
  getGoaliePlayerMatchups,
  generatePlayerCareerHotFacts,
  filterVisiblePlayerCareerTimelineRows,
} from '@/lib/data';
import { PlayerHeader } from '@/components/player/PlayerHeader';
import { PlayerBadgesSection } from '@/components/player/PlayerBadgesSection';
import { PlayerStatsCards } from '@/components/player/PlayerStatsCards';
import { PlayerGameLog } from '@/components/player/PlayerGameLog';
import { SeasonSelector } from '@/components/player/SeasonSelector';
import { PlayerArticleCard } from '@/components/player/PlayerArticleCard';
import { PlayerCareerStatsSection } from '@/components/player/PlayerCareerStatsSection';
import { PlayerMatchups } from '@/components/player/PlayerMatchups';
import { PlayerQuickActions } from '@/components/player/PlayerQuickActions';
import { isAggregateOnlySeasonView } from '@/lib/imported-aggregate-season-overrides';
import { countChampionshipBadges, summarizePlayerCareerAchievements } from '@/lib/career-achievements';

interface PlayerPageProps {
  params: Promise<{ leagueSlug: string; playerId: string }>;
  searchParams: Promise<{ season?: string }>;
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { leagueSlug, playerId } = await params;
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return { title: 'Player Not Found' };

  const player = await getPlayerProfile(playerId);
  if (!player) return { title: 'Player Not Found' };

  const playerName = player.profile?.full_name || 'Unknown Player';

  return {
    title: `${playerName} - Player Profile`,
    description: `View ${playerName}'s stats, game log, and achievements`,
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function PlayerPage({ params, searchParams }: PlayerPageProps) {
  const { leagueSlug, playerId } = await params;
  const { season: seasonFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const player = await getPlayerProfile(playerId);
  if (!player) {
    notFound();
  }

  // Treat ?season=all as the explicit career/all-time view.
  const currentSeason = await getCurrentSeason(league.id);
  const isCareerView = seasonFilter === 'all';
  const seasonId = isCareerView ? undefined : (seasonFilter || currentSeason?.id);

  // Use profile ID (player_id) for stats queries, not the URL param
  const profileId = player.player_id;

  const isGoalie = player.position === 'G' || player.position === 'Goalie';

  // Fetch data in parallel
  const [seasons, stats, gameLog, badges, importedCareerAchievements, playerArticles, matchupData, careerTimeline, careerTimelineWithBaseline] = await Promise.all([
    getSeasons(league.id),
    getPlayerCareerStats(profileId, seasonId),
    getPlayerGameLog(profileId, seasonId, 20),
    getPlayerBadges(profileId),
    getImportedPlayerCareerAchievements(profileId),
    getPlayerArticles(profileId, 5),
    isGoalie
      ? getGoaliePlayerMatchups(profileId, seasonId)
      : getPlayerGoalieMatchups(profileId, seasonId),
    getPlayerCareerStatsTimeline(league.id, profileId, isGoalie),
    getPlayerCareerStatsTimeline(league.id, profileId, isGoalie, { includeHistoricalBaseline: true }),
  ]);

  const playerName = player.profile?.full_name || 'Unknown Player';
  const careerAchievements = summarizePlayerCareerAchievements({
    importedChampionships: importedCareerAchievements.championships,
    nativeChampionships: countChampionshipBadges(badges),
  });

  const matchups = matchupData.map((m: any) => ({
    id: isGoalie ? m.playerId : m.goalieId,
    name: isGoalie ? m.playerName : m.goalieName,
    gamesPlayed: m.gamesPlayed,
    goals: m.goals,
    assists: m.assists,
    points: m.points,
    shots: m.shots,
    shootingPct: m.shootingPct,
  }));
  const currentSeasonName = seasons.find(s => s.id === seasonId)?.name;
  const showPerGameHistory = !isAggregateOnlySeasonView(seasonId, currentSeasonName);
  const visibleCareerTimeline = filterVisiblePlayerCareerTimelineRows(careerTimeline);
  const careerTotalsTimeline = filterVisiblePlayerCareerTimelineRows(careerTimelineWithBaseline, {
    includeHistoricalBaseline: true,
  });
  const careerHotFacts = await generatePlayerCareerHotFacts({
    playerName,
    seasons: visibleCareerTimeline,
    careerTotalsSeasons: careerTotalsTimeline,
    isGoalie,
  });

  return (
    <SubscriptionWall>
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Back Link */}
      <Link
        href={`/${leagueSlug}/stats`}
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stats
      </Link>

      <div className="max-w-5xl mx-auto">
        {/* Hero Header */}
        <PlayerHeader
          player={player}
          playerName={playerName}
          leagueSlug={leagueSlug}
          badges={badges}
          careerAchievements={careerAchievements}
        />

        {/* Quick Actions (only visible to the player themselves) */}
        <PlayerQuickActions playerId={playerId} leagueSlug={leagueSlug} />

        {/* Achievements Section */}
        <PlayerBadgesSection badges={badges} seasonId={seasonId} />

        {/* Season Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--league-primary)]" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              {currentSeasonName ? `${currentSeasonName} Stats` : 'Season Stats'}
            </h2>
          </div>
          <SeasonSelector
            seasons={seasons}
            currentSeasonId={seasonId}
            leagueSlug={leagueSlug}
            playerId={playerId}
          />
        </div>

        {/* Stats Cards */}
        {stats ? (
          <PlayerStatsCards stats={stats} isGoalie={isGoalie} />
        ) : (
          <div className="league-reading-panel rounded-[28px] p-8 text-center mb-8">
            <User className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stats Available</h3>
            <p className="text-[var(--color-text-secondary)]">
              Stats will appear here once games are played.
            </p>
          </div>
        )}

        <PlayerCareerStatsSection
          seasons={visibleCareerTimeline}
          isGoalie={isGoalie}
          hotFacts={careerHotFacts}
        />

        {/* Game Log */}
        {showPerGameHistory && (
          <div className="league-reading-panel rounded-[28px] p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
              <h2 className="text-xl font-bold">Game Log</h2>
            </div>
            {gameLog.length > 0 ? (
              <PlayerGameLog gameLog={gameLog} isGoalie={isGoalie} />
            ) : (
              <div className="text-center py-8">
                <p className="text-[var(--color-text-secondary)]">
                  No games played this season.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Matchup Stats */}
        {showPerGameHistory && (
          <PlayerMatchups
            matchups={matchups}
            isGoalie={isGoalie}
            leagueSlug={leagueSlug}
          />
        )}

        {/* In The News */}
        {playerArticles && playerArticles.length > 0 && (
          <div className="league-reading-panel rounded-[28px] p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-5 h-5 text-[var(--league-primary)]" />
              <h2 className="text-xl font-bold">In The News</h2>
            </div>
            <div className="space-y-3">
              {playerArticles.map((article) => (
                <PlayerArticleCard
                  key={article.id}
                  article={article}
                  leagueSlug={leagueSlug}
                  leagueName={league.name}
                  leagueLogoUrl={league.logo_url}
                />
              ))}
            </div>
          </div>
        )}

        {/* Season History (show other seasons this player has) */}
        {seasons.length > 1 && (
          <div className="league-reading-panel rounded-[28px] p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-[var(--league-primary)]" />
              <h2 className="text-xl font-bold">Season History</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {seasons.map((season) => {
                const isActive = season.id === seasonId;
                return (
                  <Link
                    key={season.id}
                    href={`/${leagueSlug}/players/${playerId}?season=${season.id}`}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                      isActive
                        ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/10 text-[var(--league-primary)] font-semibold'
                        : 'border-[var(--color-border)] hover:border-[var(--league-primary)]/50 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <span className="text-sm">{season.name}</span>
                    {isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--league-primary)]/20">
                        Viewing
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
    </SubscriptionWall>
  );
}
