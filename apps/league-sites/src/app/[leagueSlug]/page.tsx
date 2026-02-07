import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Calendar,
  Trophy,
  Users,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Newspaper,
  CalendarDays,
  Camera,
  Award,
  Sparkles,
} from 'lucide-react';
import {
  getLeagueBySlug,
  getLeagueStats,
  getUpcomingGames,
  getRecentGames,
  getStandings,
  getDivisions,
  getNewsArticles,
  getLeagueSponsors,
  getLeagueEvents,
  getLeagueAwards,
  getGalleryAlbums,
  getStatsLeaders,
} from '@/lib/data';
import { GameCard } from '@/components/GameCard';
import { StandingsWidget } from '@/components/StandingsWidget';
import { DivisionStandingsWidget } from '@/components/DivisionStandingsWidget';
import { HeroSection } from '@/components/HeroSection';
import { NewsCard } from '@/components/news/NewsCard';
import { SponsorBanner } from '@/components/sponsors/SponsorBanner';
import { EventCard } from '@/components/events/EventCard';
import { AwardsShowcase } from '@/components/awards/AwardsShowcase';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';

interface HomePageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return null;
  }

  const [
    stats,
    upcomingGames,
    recentGames,
    standings,
    divisions,
    newsArticles,
    sponsors,
    events,
    awards,
    albums,
    scoringLeaders,
  ] = await Promise.all([
    getLeagueStats(league.id),
    getUpcomingGames(league.id, 5),
    getRecentGames(league.id, 5),
    getStandings(league.id),
    getDivisions(league.id),
    getNewsArticles(league.id, 3),
    getLeagueSponsors(league.id),
    getLeagueEvents(league.id),
    getLeagueAwards(league.id),
    getGalleryAlbums(league.id),
    getStatsLeaders(league.id, 'points', 5),
  ]);

  const upcomingEvents = events
    .filter((e) => new Date(e.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 3);

  const hasNews = newsArticles.length > 0;
  const hasSponsors = sponsors.length > 0;
  const hasEvents = upcomingEvents.length > 0;
  const hasAwards = awards.length > 0;
  const hasAlbums = albums.length > 0;
  const hasLeaders = scoringLeaders.length > 0;

  const templateVariant =
    league.settings?.website?.themePreset === 'light' || league.settings?.website?.themePreset === 'custom'
      ? league.settings.website.themePreset
      : 'dark';

  const contentGridClass =
    templateVariant === 'custom'
      ? 'grid grid-cols-1 gap-8 xl:grid-cols-[1.3fr_1fr]'
      : templateVariant === 'light'
        ? 'grid grid-cols-1 gap-8 xl:grid-cols-[1.4fr_0.95fr]'
        : 'grid grid-cols-1 gap-8 xl:grid-cols-[1.48fr_0.9fr]';

  const panelClass = 'league-shell-panel rounded-3xl border border-[var(--color-border)] p-6 md:p-8';

  const pulseItems = [
    {
      label: 'Teams',
      value: stats.totalTeams,
      icon: <Users className="h-4 w-4" />,
      href: `/${leagueSlug}/teams`,
      cta: 'View Teams',
    },
    {
      label: 'Players',
      value: stats.totalPlayers,
      icon: <Users className="h-4 w-4" />,
      href: `/${leagueSlug}/players`,
      cta: 'Player Directory',
    },
    {
      label: 'Games Played',
      value: stats.gamesPlayed,
      icon: <Trophy className="h-4 w-4" />,
      href: `/${leagueSlug}/scores`,
      cta: 'Recent Scores',
    },
    {
      label: 'Upcoming',
      value: stats.upcomingGames,
      icon: <Calendar className="h-4 w-4" />,
      href: `/${leagueSlug}/schedule`,
      cta: 'Full Schedule',
    },
  ];

  return (
    <div className={`animate-fade-in league-home league-home-${templateVariant} league-home-shell`}>
      <HeroSection league={league} stats={stats} leagueSlug={leagueSlug} />

      {hasSponsors && (
        <div className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <SponsorBanner sponsors={sponsors} />
        </div>
      )}

      <section className="container mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {pulseItems.map((item) => (
            <Link key={item.label} href={item.href} className="league-pulse-link group rounded-2xl px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--league-primary)]/12 text-[var(--league-primary)]">
                  {item.icon}
                </span>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--league-primary)]" />
              </div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{item.label}</p>
              <p className="mt-1 text-2xl font-black leading-none text-[var(--color-text-primary)]">
                {item.value.toLocaleString()}
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--color-text-secondary)]">{item.cta}</p>
            </Link>
          ))}
        </div>
      </section>

      {hasNews && (
        <section className="container mx-auto px-4 pt-8">
          <div className={panelClass}>
            <SectionHeading
              title="Latest News"
              icon={<Newspaper className="w-5 h-5 text-[var(--league-primary)]" />}
              href={`/${leagueSlug}/news`}
              cta="All News"
            />
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {newsArticles.map((article) => (
                <NewsCard key={article.id} article={article} leagueSlug={leagueSlug} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className={contentGridClass}>
          <div className="space-y-8">
            <section className={panelClass}>
              <SectionHeading
                title="Upcoming Games"
                icon={<Calendar className="w-5 h-5 text-[var(--league-primary)]" />}
                href={`/${leagueSlug}/schedule`}
                cta="View Full Schedule"
              />

              {upcomingGames.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {upcomingGames.map((game) => (
                    <GameCard key={game.id} game={game} leagueSlug={leagueSlug} />
                  ))}
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
                <Card variant="glass" padding="lg" hover={false} className="mt-6">
                  <p className="text-center text-[var(--color-text-secondary)]">No upcoming games scheduled</p>
                </Card>
              )}
            </section>

            <section className={panelClass}>
              <SectionHeading
                title="Recent Results"
                icon={<Trophy className="w-5 h-5 text-[var(--league-primary)]" />}
                href={`/${leagueSlug}/scores`}
                cta="All Scores"
              />

              {recentGames.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {recentGames.map((game) => (
                    <GameCard key={game.id} game={game} leagueSlug={leagueSlug} showScore />
                  ))}
                </div>
              ) : (
                <Card variant="glass" padding="lg" hover={false} className="mt-6">
                  <p className="text-center text-[var(--color-text-secondary)]">No games played yet</p>
                </Card>
              )}
            </section>
          </div>

          <div className="space-y-8">
            <section className={`${panelClass} p-6 md:p-7`}>
              <SectionHeading
                title="Standings"
                icon={<Trophy className="w-5 h-5 text-[var(--league-primary)]" />}
                href={`/${leagueSlug}/standings`}
                cta="Full Standings"
              />
              <div className="mt-6">
                {divisions.length > 1 ? (
                  <DivisionStandingsWidget standings={standings} divisions={divisions} />
                ) : (
                  <StandingsWidget standings={standings.slice(0, 5)} />
                )}
              </div>
            </section>

            {hasLeaders && (
              <section className={`${panelClass} p-6 md:p-7`}>
                <SectionHeading
                  title="Scoring Leaders"
                  icon={<TrendingUp className="w-5 h-5 text-[var(--league-primary)]" />}
                  href={`/${leagueSlug}/stats`}
                  cta="Full Stats"
                />
                <div className="mt-5 divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_72%,transparent)]">
                  {scoringLeaders.slice(0, 5).map((player, idx) => (
                    <div
                      key={player.player_id || idx}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
                    >
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: idx < 3 ? 'var(--league-primary)' : 'var(--color-surface-hover)',
                          color: idx < 3 ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {player.player_name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {player.team_name || 'Free Agent'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-bold text-[var(--league-primary)]">{player.points} pts</span>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {player.goals}G {player.assists}A
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasEvents && (
              <section className={`${panelClass} p-6 md:p-7`}>
                <SectionHeading
                  title="Upcoming Events"
                  icon={<CalendarDays className="w-5 h-5 text-[var(--league-primary)]" />}
                  href={`/${leagueSlug}/events`}
                  cta="All Events"
                />
                <div className="mt-5 space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            <section className={`${panelClass} p-6 md:p-7`}>
              <SectionHeading
                title="Quick Links"
                icon={<Sparkles className="w-5 h-5 text-[var(--league-primary)]" />}
              />
              <nav className="mt-4 space-y-1">
                <QuickLink href={`/${leagueSlug}/teams`} icon={<Users className="w-4 h-4" />} label="View All Teams" />
                <QuickLink
                  href={`/${leagueSlug}/stats`}
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Stats Leaders"
                />
                {hasAlbums && (
                  <QuickLink
                    href={`/${leagueSlug}/gallery`}
                    icon={<Camera className="w-4 h-4" />}
                    label="Photo Gallery"
                  />
                )}
                <QuickLink
                  href={`/${leagueSlug}/contact`}
                  icon={<Calendar className="w-4 h-4" />}
                  label="Contact League"
                />
              </nav>
            </section>
          </div>
        </div>
      </div>

      {hasAwards && (
        <section className="league-feature-band border-y border-[var(--color-border)]">
          <div className="container mx-auto px-4 py-12">
            <SectionHeading
              title="Season Awards"
              icon={<Award className="w-6 h-6 text-[var(--league-primary)]" />}
            />
            <div className="mt-7">
              <AwardsShowcase awards={awards} />
            </div>
          </div>
        </section>
      )}

      {hasAlbums && (
        <section className="border-t border-[var(--color-border)]">
          <div className="container mx-auto px-4 py-12">
            <SectionHeading
              title="Photo Gallery"
              icon={<Camera className="w-6 h-6 text-[var(--league-primary)]" />}
              href={`/${leagueSlug}/gallery`}
              cta="View All Albums"
            />

            <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {albums.slice(0, 4).map((album) => (
                <Link
                  key={album.id}
                  href={`/${leagueSlug}/gallery/${album.id}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--league-primary)]"
                >
                  {album.cover_photo_url ? (
                    <img
                      src={album.cover_photo_url}
                      alt={album.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Camera className="h-8 w-8 text-[var(--color-text-muted)]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-90" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="truncate text-sm font-semibold text-white">{album.title}</h3>
                    {(album.photo_count ?? 0) > 0 && (
                      <p className="mt-0.5 text-xs text-white/60">
                        {album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasSponsors && sponsors.some((s) => s.tier === 'premier' || s.tier === 'gold') && (
        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="container mx-auto px-4 py-10">
            <h3 className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              Our Partners &amp; Sponsors
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {sponsors
                .filter((s) => s.logo_url && (s.tier === 'premier' || s.tier === 'gold'))
                .map((sponsor) => (
                  <a
                    key={sponsor.id}
                    href={sponsor.website_url || '#'}
                    target={sponsor.website_url ? '_blank' : undefined}
                    rel={sponsor.website_url ? 'noopener noreferrer' : undefined}
                    className="opacity-60 transition-opacity duration-300 hover:opacity-100"
                  >
                    <img
                      src={sponsor.logo_url!}
                      alt={sponsor.name}
                      className={
                        sponsor.tier === 'premier'
                          ? 'h-14 max-w-[180px] object-contain'
                          : 'h-10 max-w-[140px] object-contain'
                      }
                    />
                  </a>
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  icon,
  href,
  cta,
}: {
  title: string;
  icon: ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
        {icon}
        {title}
      </h2>
      {href && cta && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1 text-sm text-[var(--league-primary)] transition-all duration-300"
        >
          <span className="relative">
            {cta}
            <span className="absolute bottom-0 left-0 h-[1px] w-0 bg-[var(--league-primary)] transition-all duration-300 group-hover:w-full" />
          </span>
          <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl p-3 transition-all duration-300 hover:bg-[var(--color-surface-hover)]"
    >
      <span className="text-[var(--league-primary)] transition-transform duration-300 group-hover:scale-110">
        {icon}
      </span>
      <span className="flex-1 text-[var(--color-text-secondary)] transition-colors duration-300 group-hover:text-[var(--color-text-primary)]">
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--league-primary)]" />
    </Link>
  );
}
