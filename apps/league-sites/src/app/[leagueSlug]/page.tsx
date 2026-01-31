import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Trophy, Users, TrendingUp, ChevronRight } from 'lucide-react';
import {
  getLeagueBySlug,
  getLeagueStats,
  getUpcomingGames,
  getRecentGames,
  getStandings,
} from '@/lib/data';
import { GameCard } from '@/components/GameCard';
import { StandingsWidget } from '@/components/StandingsWidget';
import { format } from 'date-fns';

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
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background with league colors */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, var(--league-primary) 0%, var(--league-secondary) 100%)`,
          }}
        />

        {/* Banner image overlay */}
        {league.banner_url && (
          <div className="absolute inset-0">
            <Image
              src={league.banner_url}
              alt={`${league.name} banner`}
              fill
              className="object-cover opacity-20"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col items-center text-center">
            {/* League Logo */}
            {league.logo_url && (
              <Image
                src={league.logo_url}
                alt={`${league.name} logo`}
                width={120}
                height={120}
                className="rounded-2xl shadow-2xl mb-6"
                priority
              />
            )}

            <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
              {league.name}
            </h1>

            {league.description && (
              <p className="text-lg md:text-xl text-white/80 max-w-2xl mb-8">
                {league.description}
              </p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full max-w-3xl">
              <StatCard
                icon={<Users className="w-6 h-6" />}
                value={stats.totalTeams}
                label="Teams"
              />
              <StatCard
                icon={<Users className="w-6 h-6" />}
                value={stats.totalPlayers}
                label="Players"
              />
              <StatCard
                icon={<Calendar className="w-6 h-6" />}
                value={stats.gamesPlayed}
                label="Games Played"
              />
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                value={stats.upcomingGames}
                label="Upcoming"
              />
            </div>
          </div>
        </div>
      </section>

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
                  className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
                >
                  View Full Schedule
                  <ChevronRight className="w-4 h-4" />
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
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <p className="text-[var(--color-text-secondary)]">
                    No upcoming games scheduled
                  </p>
                </div>
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
                <div className="card p-8 text-center">
                  <p className="text-[var(--color-text-secondary)]">
                    No games played yet
                  </p>
                </div>
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
                  className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
                >
                  Full Standings
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <StandingsWidget standings={standings.slice(0, 5)} />
            </section>

            {/* Quick Links */}
            <section className="card p-6">
              <h3 className="font-bold mb-4">Quick Links</h3>
              <nav className="space-y-2">
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
            </section>
          </div>
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
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white">
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
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
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      <span className="text-[var(--league-primary)]">{icon}</span>
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <ChevronRight className="w-4 h-4 ml-auto text-[var(--color-text-muted)]" />
    </Link>
  );
}
