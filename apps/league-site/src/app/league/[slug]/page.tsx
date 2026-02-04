import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  getLeagueBySlug,
  getCurrentSeason,
  getUpcomingGames,
  getRecentGames,
  getStandings,
} from '@/lib/data/league';
import { Calendar, Trophy, Users, ChevronRight } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function LeagueHomePage({ params }: Props) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) {
    return null; // Layout will handle 404
  }

  const season = await getCurrentSeason(league.id);
  const upcomingGames = await getUpcomingGames(league.id, 5);
  const recentGames = await getRecentGames(league.id, 5);
  const standings = season ? await getStandings(season.id) : [];

  const basePath = `/league/${slug}`;

  return (
    <div className="animate-fade-up">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Banner Background */}
        {league.bannerUrl ? (
          <div className="absolute inset-0">
            <Image
              src={league.bannerUrl}
              alt=""
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-background)]/60 via-[var(--color-background)]/80 to-[var(--color-background)]" />
          </div>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${league.primaryColor}20 0%, ${league.secondaryColor} 100%)`,
            }}
          />
        )}

        <div className="relative container mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
              {league.name}
            </h1>
            {league.tagline && (
              <p className="text-xl md:text-2xl text-[var(--color-text-secondary)] mb-8">
                {league.tagline}
              </p>
            )}
            {season && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--league-primary)]/10 text-[var(--league-primary)] text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--league-primary)] animate-pulse" />
                {season.name}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Games */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Games */}
            <section className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
                  Upcoming Games
                </h2>
                <Link
                  href={`${basePath}/schedule`}
                  className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {upcomingGames.length === 0 ? (
                <p className="text-[var(--color-text-secondary)] text-center py-8">
                  No upcoming games scheduled
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              )}
            </section>

            {/* Recent Results */}
            <section className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[var(--league-primary)]" />
                  Recent Results
                </h2>
                <Link
                  href={`${basePath}/schedule`}
                  className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {recentGames.length === 0 ? (
                <p className="text-[var(--color-text-secondary)] text-center py-8">
                  No recent games
                </p>
              ) : (
                <div className="space-y-4">
                  {recentGames.map((game) => (
                    <GameCard key={game.id} game={game} showScore />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Standings */}
          <div className="space-y-8">
            <section className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--league-primary)]" />
                  Standings
                </h2>
                <Link
                  href={`${basePath}/standings`}
                  className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
                >
                  Full Standings <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {standings.length === 0 ? (
                <p className="text-[var(--color-text-secondary)] text-center py-8">
                  No standings available
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[var(--color-text-secondary)] text-xs uppercase border-b border-[var(--color-border)]">
                        <th className="text-left py-2 pr-2">#</th>
                        <th className="text-left py-2">Team</th>
                        <th className="text-center py-2 px-1">GP</th>
                        <th className="text-center py-2 px-1">W</th>
                        <th className="text-center py-2 px-1">L</th>
                        <th className="text-center py-2 px-1">T</th>
                        <th className="text-center py-2 pl-2 font-bold text-[var(--league-primary)]">
                          PTS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.slice(0, 8).map((team, index) => (
                        <tr
                          key={team.teamId}
                          className="border-b border-[var(--color-border)] last:border-0"
                        >
                          <td className="py-3 pr-2 text-[var(--color-text-muted)]">
                            {index + 1}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {team.logoUrl ? (
                                <Image
                                  src={team.logoUrl}
                                  alt={team.name}
                                  width={24}
                                  height={24}
                                  className="rounded"
                                />
                              ) : (
                                <div
                                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                                  style={{
                                    backgroundColor: team.primaryColor || '#333',
                                    color: team.secondaryColor || '#fff',
                                  }}
                                >
                                  {team.shortName.charAt(0)}
                                </div>
                              )}
                              <span className="font-medium truncate max-w-[100px]">
                                {team.shortName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-1 text-center text-[var(--color-text-secondary)]">
                            {team.gamesPlayed}
                          </td>
                          <td className="py-3 px-1 text-center">
                            {team.wins}
                          </td>
                          <td className="py-3 px-1 text-center">
                            {team.losses}
                          </td>
                          <td className="py-3 px-1 text-center">
                            {team.ties}
                          </td>
                          <td className="py-3 pl-2 text-center font-bold text-[var(--league-primary)]">
                            {team.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Quick Links */}
            <section className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)]">
              <h2 className="text-xl font-bold mb-4">Quick Links</h2>
              <div className="space-y-2">
                <Link
                  href={`${basePath}/teams`}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <span>View All Teams</span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </Link>
                <Link
                  href={`${basePath}/stats`}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <span>Stats Leaders</span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </Link>
                <Link
                  href={`${basePath}/about`}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-background)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <span>About & Contact</span>
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// Game Card Component
function GameCard({
  game,
  showScore = false,
}: {
  game: Awaited<ReturnType<typeof getUpcomingGames>>[0];
  showScore?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
      {/* Date/Time */}
      <div className="text-center min-w-[60px]">
        <div className="text-xs text-[var(--color-text-secondary)] uppercase">
          {format(new Date(game.scheduledAt), 'EEE')}
        </div>
        <div className="text-lg font-bold">
          {format(new Date(game.scheduledAt), 'MMM d')}
        </div>
        <div className="text-xs text-[var(--color-text-muted)]">
          {format(new Date(game.scheduledAt), 'h:mm a')}
        </div>
      </div>

      {/* Teams */}
      <div className="flex-1 flex items-center justify-between gap-2">
        {/* Home Team */}
        <div className="flex items-center gap-2 flex-1">
          {game.homeTeam?.logoUrl ? (
            <Image
              src={game.homeTeam.logoUrl}
              alt={game.homeTeam.name}
              width={32}
              height={32}
              className="rounded"
            />
          ) : (
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: game.homeTeam?.primaryColor || '#333',
                color: game.homeTeam?.secondaryColor || '#fff',
              }}
            >
              {game.homeTeam?.shortName.charAt(0) || 'H'}
            </div>
          )}
          <span className="font-medium truncate">
            {game.homeTeam?.shortName || 'TBD'}
          </span>
        </div>

        {/* Score or VS */}
        {showScore && game.homeScore !== null && game.awayScore !== null ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-[var(--color-surface)]">
            <span
              className={`text-lg font-bold ${
                game.homeScore > game.awayScore
                  ? 'text-[var(--color-success)]'
                  : ''
              }`}
            >
              {game.homeScore}
            </span>
            <span className="text-[var(--color-text-muted)]">-</span>
            <span
              className={`text-lg font-bold ${
                game.awayScore > game.homeScore
                  ? 'text-[var(--color-success)]'
                  : ''
              }`}
            >
              {game.awayScore}
            </span>
          </div>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)] px-2">vs</span>
        )}

        {/* Away Team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-medium truncate text-right">
            {game.awayTeam?.shortName || 'TBD'}
          </span>
          {game.awayTeam?.logoUrl ? (
            <Image
              src={game.awayTeam.logoUrl}
              alt={game.awayTeam.name}
              width={32}
              height={32}
              className="rounded"
            />
          ) : (
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: game.awayTeam?.primaryColor || '#333',
                color: game.awayTeam?.secondaryColor || '#fff',
              }}
            >
              {game.awayTeam?.shortName.charAt(0) || 'A'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
