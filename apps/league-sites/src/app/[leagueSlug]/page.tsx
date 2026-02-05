import Link from 'next/link';
import { Calendar, Trophy, Users, TrendingUp, ChevronRight, ArrowRight } from 'lucide-react';
import {
  getLeagueBySlug,
  getLeagueStats,
  getUpcomingGames,
  getRecentGames,
  getStandings,
} from '@/lib/data';
import { GameCard } from '@/components/GameCard';
import { StandingsWidget } from '@/components/StandingsWidget';
import { HeroSection } from '@/components/HeroSection';
import { Card, CardHeader } from '@/components/ui';
import { Button } from '@/components/ui';

interface HomePageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return null; // Layout handles 404
  }

  const [stats, upcomingGames, recentGames, standings] = await Promise.all([
    getLeagueStats(league.id),
    getUpcomingGames(league.id, 5),
    getRecentGames(league.id, 5),
    getStandings(league.id),
  ]);

  return (
    <div className="animate-fade-in">
      {/* Premium Hero Section */}
      <HeroSection league={league} stats={stats} leagueSlug={leagueSlug} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Games Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Games */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[var(--league-primary)]" />
                  Upcoming Games
                </h2>
                <Link
                  href={`/${leagueSlug}/schedule`}
                  className="group text-sm text-[var(--league-primary)] flex items-center gap-1 transition-all duration-300"
                >
                  <span className="relative">
                    View Full Schedule
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[var(--league-primary)] transition-all duration-300 group-hover:w-full" />
                  </span>
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              {upcomingGames.length > 0 ? (
                <div className="space-y-4">
                  {upcomingGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      leagueSlug={leagueSlug}
                    />
                  ))}

                  {/* View Full Schedule CTA - Premium Button */}
                  <div className="pt-2">
                    <Button
                      href={`/${leagueSlug}/schedule`}
                      variant="primary"
                      glow
                      fullWidth
                      iconRight={<ArrowRight className="w-4 h-4" />}
                    >
                      View Full Schedule
                    </Button>
                  </div>
                </div>
              ) : (
                <Card variant="glass" padding="lg" hover={false}>
                  <p className="text-[var(--color-text-secondary)] text-center">
                    No upcoming games scheduled
                  </p>
                </Card>
              )}
            </section>

            {/* Recent Results */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-[var(--league-primary)]" />
                  Recent Results
                </h2>
              </div>

              {recentGames.length > 0 ? (
                <div className="space-y-4">
                  {recentGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      leagueSlug={leagueSlug}
                      showScore
                    />
                  ))}
                </div>
              ) : (
                <Card variant="glass" padding="lg" hover={false}>
                  <p className="text-[var(--color-text-secondary)] text-center">
                    No games played yet
                  </p>
                </Card>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Standings Widget */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[var(--league-primary)]" />
                  Standings
                </h2>
                <Link
                  href={`/${leagueSlug}/standings`}
                  className="group text-sm text-[var(--league-primary)] flex items-center gap-1 transition-all duration-300"
                >
                  <span className="relative">
                    Full Standings
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[var(--league-primary)] transition-all duration-300 group-hover:w-full" />
                  </span>
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              <StandingsWidget standings={standings.slice(0, 5)} />
            </section>

            {/* Quick Links - Premium Card with Gradient Border */}
            <section>
              <Card variant="gradient" glow hover>
                <CardHeader title="Quick Links" accent />
                <nav className="space-y-1">
                  <QuickLink
                    href={`/${leagueSlug}/teams`}
                    icon={<Users className="w-4 h-4" />}
                    label="View All Teams"
                  />
                  <QuickLink
                    href={`/${leagueSlug}/stats`}
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Stats Leaders"
                  />
                  <QuickLink
                    href={`/${leagueSlug}/about`}
                    icon={<Calendar className="w-4 h-4" />}
                    label="Contact League"
                  />
                </nav>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-all duration-300"
    >
      <span className="text-[var(--league-primary)] transition-transform duration-300 group-hover:scale-110">
        {icon}
      </span>
      <span className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors duration-300 flex-1">
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] transition-all duration-300 group-hover:text-[var(--league-primary)] group-hover:translate-x-1" />
    </Link>
  );
}
