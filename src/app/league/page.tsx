import { getLeagueFromHostname } from "@/lib/context/league-context";
import { getUpcomingGames, getRecentGames } from "@/lib/games/actions";
import { getActiveSeason } from "@/lib/seasons/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Trophy, TrendingUp, Users } from "lucide-react";

// Cache this page for 60 seconds
export const revalidate = 60;

/**
 * League Home Page
 *
 * This is the landing page for league instances accessed via
 * subdomain or custom domain. Shows league overview, upcoming games,
 * and quick links to key sections.
 */
export default async function LeagueHomePage() {
  // Get league branding from hostname
  const league = await getLeagueFromHostname();

  if (!league) {
    // Should not happen as layout handles this, but just in case
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">League not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch league data in parallel
  const [activeSeasonResult, upcomingGamesResult, recentGamesResult] = await Promise.all([
    getActiveSeason(),
    getUpcomingGames(5),
    getRecentGames(5),
  ]);

  const activeSeason = activeSeasonResult.season;
  const upcomingGames = upcomingGamesResult.games || [];
  const recentGames = recentGamesResult.games || [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative py-16 md:py-24"
        style={{
          background: `linear-gradient(135deg, ${league.primaryColor} 0%, ${league.secondaryColor} 100%)`,
        }}
      >
        {/* Banner Image Overlay if available */}
        {league.bannerUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={league.bannerUrl}
              alt={`${league.name} banner`}
              fill
              className="object-cover opacity-30"
            />
          </div>
        )}

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-white">
            {/* Logo */}
            {league.logoUrl && (
              <div className="shrink-0">
                <Image
                  src={league.logoUrl}
                  alt={league.name}
                  width={120}
                  height={120}
                  className="rounded-lg bg-white/10 p-2"
                />
              </div>
            )}

            {/* League Info */}
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                {league.name}
              </h1>
              {league.tagline && (
                <p className="text-lg md:text-xl text-white/90 mt-2 drop-shadow">
                  {league.tagline}
                </p>
              )}
              {activeSeason && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                  <Badge
                    className="text-sm px-3 py-1"
                    style={{
                      backgroundColor: league.accentColor,
                      color: '#000',
                    }}
                  >
                    {activeSeason.name}
                  </Badge>
                  {activeSeason.status === 'playoffs' && (
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      Playoffs
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="py-8 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickNavCard
              href="/schedule"
              icon={<Calendar className="h-6 w-6" />}
              title="Schedule"
              description="View game schedule"
              color={league.primaryColor}
            />
            <QuickNavCard
              href="/standings"
              icon={<Trophy className="h-6 w-6" />}
              title="Standings"
              description="League standings"
              color={league.primaryColor}
            />
            <QuickNavCard
              href="/stats"
              icon={<TrendingUp className="h-6 w-6" />}
              title="Stats"
              description="Player statistics"
              color={league.primaryColor}
            />
            <QuickNavCard
              href="/teams"
              icon={<Users className="h-6 w-6" />}
              title="Teams"
              description="View all teams"
              color={league.primaryColor}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Upcoming Games */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" style={{ color: league.primaryColor }} />
                  Upcoming Games
                </CardTitle>
                <CardDescription>
                  Next scheduled games
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingGames.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No upcoming games scheduled
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingGames.slice(0, 5).map((game: any) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {game.home_team?.name || 'TBD'} vs {game.away_team?.name || 'TBD'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {game.scheduled_time
                              ? new Date(game.scheduled_time).toLocaleDateString('en-CA', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'TBD'}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link
                      href="/schedule"
                      className="block text-center text-sm font-medium py-2 hover:underline"
                      style={{ color: league.primaryColor }}
                    >
                      View Full Schedule
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" style={{ color: league.accentColor }} />
                  Recent Results
                </CardTitle>
                <CardDescription>
                  Latest game results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentGames.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No recent games
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentGames.slice(0, 5).map((game: any) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {game.home_team?.name || 'TBD'}{' '}
                            <span className="font-bold">{game.home_score}</span>
                            {' - '}
                            <span className="font-bold">{game.away_score}</span>{' '}
                            {game.away_team?.name || 'TBD'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {game.scheduled_time
                              ? new Date(game.scheduled_time).toLocaleDateString('en-CA', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Final'}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link
                      href="/schedule"
                      className="block text-center text-sm font-medium py-2 hover:underline"
                      style={{ color: league.primaryColor }}
                    >
                      View All Results
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Season Status */}
      {!activeSeason && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <Card>
              <CardContent className="py-8 text-center">
                <h2 className="text-2xl font-bold mb-2">Season Coming Soon</h2>
                <p className="text-muted-foreground">
                  Check back when the new season starts!
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Quick Navigation Card Component
 */
function QuickNavCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="pt-6 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
            style={{ backgroundColor: `${color}20`, color: color }}
          >
            {icon}
          </div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
