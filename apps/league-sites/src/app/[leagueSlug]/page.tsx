import Link from 'next/link';
import { notFound } from 'next/navigation';
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
  UserPlus,
  Share2,
} from 'lucide-react';
import {
  getLeagueBySlug,
  getLeagueStats,
  getUpcomingGames,
  getRecentGames,
  getStandings,
  getDivisions,
  getAllArticles,
  getLeagueSponsors,
  getLeagueEvents,
  getLeagueAwards,
  getGalleryAlbums,
  getStatsLeadersWithAvatars,
  getGoalieLeaders,
  getCurrentSeason,
  getSeasons,
  getPlayerBadgesByIds,
} from '@/lib/data';
import { GameCard } from '@/components/GameCard';
import { StandingsWidget } from '@/components/StandingsWidget';
import { DivisionStandingsWidget } from '@/components/DivisionStandingsWidget';
import { DivisionUrlSync } from '@/components/DivisionUrlSync';
import { HeroSection } from '@/components/HeroSection';
import { SponsorBanner } from '@/components/sponsors/SponsorBanner';
import { EventCard } from '@/components/events/EventCard';
import { AwardsShowcase } from '@/components/awards/AwardsShowcase';
import { FeaturedNewsBanner } from '@/components/news/FeaturedNewsBanner';
import { NewsHeadlines } from '@/components/news/NewsHeadlines';
import { LeadersShowcase } from '@/components/LeadersShowcase';
import { SocialLinks } from '@/components/SocialLinks';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';
import { buildSportsOrganizationJsonLd } from '@/lib/jsonld';

interface HomePageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ division?: string }>;
}

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { leagueSlug } = await params;
  const { division: divisionFilter } = await searchParams;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    notFound();
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
    currentSeason,
    seasons,
  ] = await Promise.all([
    getLeagueStats(league.id),
    getUpcomingGames(league.id, 5, divisionFilter),
    getRecentGames(league.id, 5, divisionFilter),
    getStandings(league.id),
    getDivisions(league.id),
    getAllArticles(league.id, 3),
    getLeagueSponsors(league.id),
    getLeagueEvents(league.id),
    getLeagueAwards(league.id),
    getGalleryAlbums(league.id),
    getStatsLeadersWithAvatars(league.id, 'points', 5, divisionFilter),
    getCurrentSeason(league.id),
    getSeasons(league.id),
  ]);

  // Fetch goalie leaders (depends on currentSeason)
  const goalieLeaders = await getGoalieLeaders(league.id, currentSeason?.id, 'wins', 3, divisionFilter);

  // Fetch badges for leaders
  const leaderPlayerIds = [...new Set([
    ...scoringLeaders.map(p => p.player_id),
    ...goalieLeaders.map(p => p.player_id),
  ])];
  const leaderBadges = await getPlayerBadgesByIds(leaderPlayerIds);

  const upcomingEvents = events
    .filter((e) => new Date(e.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 3);

  const hasNews = newsArticles.length > 0;
  const hasEvents = upcomingEvents.length > 0;
  const hasAwards = awards.length > 0;
  const hasAlbums = albums.length > 0;
  const hasLeaders = scoringLeaders.length > 0 || goalieLeaders.length > 0;
  const websiteSettings = league.settings?.website;
  const hasSocialLinks = !!(
    websiteSettings?.socialFacebook ||
    websiteSettings?.socialTwitter ||
    websiteSettings?.socialInstagram ||
    websiteSettings?.socialYoutube ||
    websiteSettings?.socialTiktok
  );
  const socialSettings = hasSocialLinks ? websiteSettings : null;

  // Check if registration is open for any season
  const now = new Date();
  const registrationSeason = seasons.find((season: any) => {
    if (season.registration_opens_at && season.registration_closes_at) {
      return now >= new Date(season.registration_opens_at) && now <= new Date(season.registration_closes_at);
    }
    return false;
  });
  const hasOpenRegistration = !!registrationSeason;

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

  const jsonLd = buildSportsOrganizationJsonLd(league);

  return (
    <div className={`animate-fade-in league-home league-home-${templateVariant} league-home-shell`}>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Division filter URL sync */}
      <DivisionUrlSync pagePath={`/${leagueSlug}`} />

      {/* 1. Hero + News Side-by-Side (news on right when articles exist) */}
      {hasNews ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
          <HeroSection league={league} stats={stats} leagueSlug={leagueSlug} />
          <div className="relative flex items-stretch border-b border-l-0 lg:border-l border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background-elevated)_60%,transparent)] backdrop-blur-md p-3 md:p-4 lg:p-5">
            <NewsHeadlines articles={newsArticles} leagueSlug={leagueSlug} />
          </div>
        </div>
      ) : (
        <HeroSection league={league} stats={stats} leagueSlug={leagueSlug} />
      )}

      {/* 3. Sponsor Banner */}
      <div className="mt-8">
        <SponsorBanner sponsors={sponsors} />
      </div>

      {/* 4. Pulse Items */}
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

      {/* 5. Leaders Showcase (full-width) */}
      {hasLeaders && (
        <section className="container mx-auto px-4 pt-8">
          <LeadersShowcase
            scoringLeaders={scoringLeaders}
            goalieLeaders={goalieLeaders}
            leagueSlug={leagueSlug}
            badges={leaderBadges}
          />
        </section>
      )}

      {/* 6. Two-column layout */}
      <div className="container mx-auto px-4 py-12">
        <div className={contentGridClass}>
          {/* Left column: Games */}
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

          {/* Right column: Standings, Events, Social, Registration, Quick Links */}
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

            {hasEvents && (
              <section className={`${panelClass} p-6 md:p-7`}>
                <SectionHeading
                  title="Upcoming Events"
                  icon={<CalendarDays className="w-5 h-5 text-[var(--league-primary)]" />}
                />
                <div className="mt-5 space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {hasOpenRegistration && (
              <section className={`${panelClass} p-6 md:p-7`}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--league-primary)]/15 mb-3">
                    <UserPlus className="w-6 h-6 text-[var(--league-primary)]" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Registration Open
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1 mb-4">
                    Sign up for {(registrationSeason as any)?.name || 'the upcoming season'} today!
                  </p>
                  <Button
                    href={`/${leagueSlug}/register`}
                    variant="primary"
                    glow
                    fullWidth
                    icon={<UserPlus className="w-4 h-4" />}
                  >
                    Register Now
                  </Button>
                </div>
              </section>
            )}

            {/* Social Links */}
            {socialSettings && (
              <section className={`${panelClass} p-6 md:p-7`}>
                <SectionHeading
                  title="Follow Us"
                  icon={<Share2 className="w-5 h-5 text-[var(--league-primary)]" />}
                />
                <div className="mt-4 flex justify-center">
                  <SocialLinks settings={socialSettings} size="lg" />
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

      {/* 7. Awards Showcase */}
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

      {/* 8. Photo Gallery */}
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
