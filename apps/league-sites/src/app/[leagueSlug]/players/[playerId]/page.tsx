import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, BarChart3, History, Newspaper } from 'lucide-react';
import { notFound } from 'next/navigation';
import {
  getLeagueBySlug,
  getPlayerProfile,
  getPlayerCareerStats,
  getPlayerGameLog,
  getSeasons,
  getCurrentSeason,
  getPlayerBadges,
  getPlayerArticles,
} from '@/lib/data';
import { PlayerHeader } from '@/components/player/PlayerHeader';
import { PlayerBadgesSection } from '@/components/player/PlayerBadgesSection';
import { PlayerStatsCards } from '@/components/player/PlayerStatsCards';
import { PlayerGameLog } from '@/components/player/PlayerGameLog';
import { SeasonSelector } from '@/components/player/SeasonSelector';
import { PlayerArticleCard } from '@/components/player/PlayerArticleCard';

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
  if (!league) return null;

  const player = await getPlayerProfile(playerId);
  if (!player) {
    notFound();
  }

  // Get current season if no filter specified
  const currentSeason = await getCurrentSeason(league.id);
  const seasonId = seasonFilter || currentSeason?.id;

  // Use profile ID (player_id) for stats queries, not the URL param
  const profileId = player.player_id;

  // Fetch data in parallel
  const [seasons, stats, gameLog, badges, playerArticles] = await Promise.all([
    getSeasons(league.id),
    getPlayerCareerStats(profileId, seasonId),
    getPlayerGameLog(profileId, seasonId, 20),
    getPlayerBadges(profileId),
    getPlayerArticles(profileId, 5),
  ]);

  const playerName = player.profile?.full_name || 'Unknown Player';
  const isGoalie = player.position === 'G' || player.position === 'Goalie';
  const currentSeasonName = seasons.find(s => s.id === seasonId)?.name;

  return (
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
        />

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
          <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-8 text-center mb-8">
            <User className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Stats Available</h3>
            <p className="text-[var(--color-text-secondary)]">
              Stats will appear here once games are played.
            </p>
          </div>
        )}

        {/* Game Log */}
        <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
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

        {/* In The News */}
        {playerArticles && playerArticles.length > 0 && (
          <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Season History (show other seasons this player has) */}
        {seasons.length > 1 && (
          <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6">
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
  );
}
