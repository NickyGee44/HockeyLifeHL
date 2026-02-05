import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { notFound } from 'next/navigation';
import {
  getLeagueBySlug,
  getPlayerProfile,
  getPlayerCareerStats,
  getPlayerGameLog,
  getSeasons,
  getCurrentSeason,
} from '@/lib/data';
import { PlayerHeader } from '@/components/player/PlayerHeader';
import { PlayerStatsCards } from '@/components/player/PlayerStatsCards';
import { PlayerGameLog } from '@/components/player/PlayerGameLog';
import { SeasonSelector } from '@/components/player/SeasonSelector';

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
    description: `View ${playerName}'s stats and game log`,
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

  // Fetch data in parallel
  const [seasons, stats, gameLog] = await Promise.all([
    getSeasons(league.id),
    getPlayerCareerStats(playerId, seasonId),
    getPlayerGameLog(playerId, seasonId, 20),
  ]);

  const playerName = player.profile?.full_name || 'Unknown Player';

  const isGoalie = player.position === 'G';

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* Back Link */}
      <Link
        href={`/${leagueSlug}/stats`}
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stats
      </Link>

      <div className="max-w-4xl mx-auto">
        {/* Player Header */}
        <PlayerHeader
          player={player}
          playerName={playerName}
          leagueSlug={leagueSlug}
        />

        {/* Season Selector */}
        <SeasonSelector
          seasons={seasons}
          currentSeasonId={seasonId}
          leagueSlug={leagueSlug}
          playerId={playerId}
        />

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
        <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Game Log</h2>
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
      </div>
    </div>
  );
}
