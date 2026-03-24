import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SubscriptionWall } from '@/components/shared';
import {
  Calendar,
  Trophy,
  Users,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Camera,
  Award,
  Sparkles,
  UserPlus,
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
  getLatestAnnouncement,
} from '@/lib/data';
import { GameCard } from '@/components/GameCard';
import { StandingsWidget } from '@/components/StandingsWidget';
import { DivisionStandingsWidget } from '@/components/DivisionStandingsWidget';
import { DivisionUrlSync } from '@/components/DivisionUrlSync';
import { HeroSection } from '@/components/HeroSection';
import { SponsorBanner } from '@/components/sponsors/SponsorBanner';
import { AwardsShowcase } from '@/components/awards/AwardsShowcase';
import { FeaturedNewsBanner } from '@/components/news/FeaturedNewsBanner';
import { LeadersShowcase } from '@/components/LeadersShowcase';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import {
  HomepagePulseRail,
  type HomepageCountdownCard,
  type HomepagePhotoHighlight,
} from '@/components/home/HomepagePulseRail';
import { LeagueAliveBand } from '@/components/home/LeagueAliveBand';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';
import { buildSportsOrganizationJsonLd } from '@/lib/jsonld';
import { pickRegistrationSeason } from '@/lib/registration/seasons';

interface HomePageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ division?: string }>;
}

function buildHomepageCountdownCard({
  leagueSlug,
  registrationSeason,
  currentSeason,
  upcomingEvents,
}: {
  leagueSlug: string;
  registrationSeason: any | null;
  currentSeason: any | null;
  upcomingEvents: Array<{ title: string; start_time: string }>;
}): HomepageCountdownCard | null {
  if (registrationSeason?.registration_closes_at) {
    return {
      eyebrow: 'Registration Countdown',
      title: registrationSeason.name || 'Season Registration',
      targetDate: registrationSeason.registration_closes_at,
      href: `/${leagueSlug}/register`,
      cta: 'Register',
    };
  }

  const nextEvent = upcomingEvents[0];
  if (nextEvent) {
    return {
      eyebrow: 'Next Event',
      title: nextEvent.title,
      targetDate: nextEvent.start_time,
      href: `/${leagueSlug}/events`,
      cta: 'Events',
    };
  }

  if (currentSeason?.end_date && new Date(currentSeason.end_date) > new Date()) {
    return {
      eyebrow: (currentSeason as any)?.status === 'playoffs' ? 'Playoff Run' : 'Season Clock',
      title: currentSeason.name || 'Current Season',
      targetDate: currentSeason.end_date,
      href: `/${leagueSlug}/schedule`,
      cta: 'Schedule',
    };
  }

  return null;
}

function buildHomepagePhotoHighlight({
  leagueSlug,
  albums,
  newsArticles,
}: {
  leagueSlug: string;
  albums: Array<{ id: string; title: string; description: string | null; cover_photo_url: string | null; photo_count?: number }>;
  newsArticles: Array<{ id: string; title: string; excerpt: string | null; image_url: string | null; slug: string | null; type: string }>;
}): HomepagePhotoHighlight | null {
  const featuredAlbum = albums.find((album) => album.cover_photo_url) || albums[0];
  if (featuredAlbum) {
    return {
      eyebrow: 'Community Lens',
      title: featuredAlbum.title,
      subtitle:
        featuredAlbum.description ||
        `${featuredAlbum.photo_count || 0} photo${featuredAlbum.photo_count === 1 ? '' : 's'} from around the rink.`,
      imageUrl: featuredAlbum.cover_photo_url,
      href: `/${leagueSlug}/gallery/${featuredAlbum.id}`,
      cta: 'Open Album',
    };
  }

  const featuredStory = newsArticles.find((article) => article.image_url) || newsArticles[0];
  if (featuredStory) {
    return {
      eyebrow: featuredStory.type === 'game_recap' ? 'Latest Recap' : 'Featured Story',
      title: featuredStory.title,
      subtitle: featuredStory.excerpt || 'Fresh league storytelling belongs directly on the homepage.',
      imageUrl: featuredStory.image_url,
      href: `/${leagueSlug}/news/${featuredStory.slug || featuredStory.id}`,
      cta: 'Read Story',
    };
  }

  return null;
}

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { leagueSlug } = await params;
  const { division: divisionFilter } = await searchParams;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    notFound();
  }

  // Fetch currentSeason first so we can filter standings by season
  const currentSeason = await getCurrentSeason(league.id);

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
    seasons,
    latestAnnouncement,
  ] = await Promise.all([
    getLeagueStats(league.id),
    getUpcomingGames(league.id, 5, divisionFilter),
    getRecentGames(league.id, 5, divisionFilter),
    getStandings(league.id, currentSeason?.id),
    getDivisions(league.id),
    getAllArticles(league.id, 7),
    getLeagueSponsors(league.id),
    getLeagueEvents(league.id),
    getLeagueAwards(league.id),
    getGalleryAlbums(league.id),
    getStatsLeadersWithAvatars(league.id, 'points', 5, divisionFilter),
    getSeasons(league.id),
    getLatestAnnouncement(league.id),
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
  const registrationSeason = pickRegistrationSeason(seasons as any[], now);
  const hasOpenRegistration = !!registrationSeason;
  const isCurrentSeasonWrappingUp =
    (currentSeason as any)?.status === 'playoffs' || (currentSeason as any)?.status === 'completed';
  const isNextSeasonRegistration =
    !!registrationSeason && !!currentSeason && registrationSeason.id !== currentSeason.id;
  const registrationPromoDate = registrationSeason?.registration_closes_at
    ? new Date(registrationSeason.registration_closes_at).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const registrationBannerText =
    isCurrentSeasonWrappingUp && isNextSeasonRegistration
      ? `The current season is wrapping up, and registration is already open for ${registrationSeason?.name}${registrationPromoDate ? ` through ${registrationPromoDate}` : ''}.`
      : `Sign up for ${registrationSeason?.name || 'the upcoming season'} today${registrationPromoDate ? ` before ${registrationPromoDate}` : ''}!`;
  const featuredArticles = newsArticles.slice(0, 3);
  const thumbnailHeadlines = (newsArticles.length > 5 ? newsArticles.slice(3, 7) : newsArticles.slice(1, 5)).slice(0, 4);
  const homepageCountdown = buildHomepageCountdownCard({
    leagueSlug,
    registrationSeason,
    currentSeason,
    upcomingEvents,
  });
  const homepagePhotoHighlight = buildHomepagePhotoHighlight({
    leagueSlug,
    albums,
    newsArticles,
  });

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
    <SubscriptionWall>
    <div className={`animate-fade-in league-home league-home-${templateVariant} league-home-shell`}>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Division filter URL sync */}
      <DivisionUrlSync pagePath={`/${leagueSlug}`} />

      {hasOpenRegistration && (
        <div className="container mx-auto px-4 pt-6">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--league-primary)]/30 bg-[var(--league-primary)]/6 px-5 py-4 md:px-6">
            <div className="absolute inset-y-0 right-0 w-48 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--league-primary)_18%,transparent),transparent_70%)]" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--league-primary)]/15">
                  <UserPlus className="h-5 w-5 text-[var(--league-primary)]" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--league-primary)]">
                      Registration Open
                    </span>
                    {registrationSeason?.name && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {registrationSeason.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)] md:text-base">
                    {registrationBannerText}
                  </p>
                </div>
              </div>
              <Button
                href={`/${leagueSlug}/register`}
                variant="primary"
                glow
                icon={<UserPlus className="w-4 h-4" />}
                className="shrink-0"
              >
                Register Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <HeroSection league={league} stats={stats} leagueSlug={leagueSlug} />

      <section className="container mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.82fr]">
          <section className={`${panelClass} overflow-hidden`}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--league-primary)]">
                  Featured Coverage
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-primary)]">
                  What&apos;s happening around the league
                </h2>
              </div>
              <Link
                href={`/${leagueSlug}/news`}
                className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)] transition-all duration-200 hover:border-[var(--league-primary)] hover:text-[var(--league-primary)] md:inline-flex"
              >
                All News
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-6">
              {featuredArticles.length > 0 ? (
                <FeaturedNewsBanner articles={featuredArticles} leagueSlug={leagueSlug} />
              ) : (
                <Card variant="glass" padding="lg" hover={false}>
                  <p className="text-center text-[var(--color-text-secondary)]">
                    Publish league stories and recaps to light up this homepage feed.
                  </p>
                </Card>
              )}
            </div>
          </section>

          <HomepagePulseRail
            leagueSlug={leagueSlug}
            articles={thumbnailHeadlines}
            events={upcomingEvents}
            socialSettings={socialSettings}
            countdown={homepageCountdown}
            photoHighlight={homepagePhotoHighlight}
          />
        </div>
      </section>

      <LeagueAliveBand
        leagueSlug={leagueSlug}
        newsArticles={newsArticles}
        scoringLeaders={scoringLeaders}
        goalieLeaders={goalieLeaders}
        albums={albums}
        awards={awards}
      />

      {/* Announcement Banner */}
      {latestAnnouncement && (
        <div className="container mx-auto px-4 pt-8">
          <AnnouncementBanner announcement={latestAnnouncement} leagueSlug={leagueSlug} />
        </div>
      )}

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

      {/* Sponsors */}
      <div className="mt-8">
        <SponsorBanner sponsors={sponsors} />
      </div>

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

          {/* Right column: Standings, Registration, Quick Links */}
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

            {/* Sub Goalie Banner */}
            <section className={`${panelClass} p-5`}>
              <Link
                href={`/${leagueSlug}/goalies/register`}
                className="flex items-center gap-3 group"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--league-primary)]/15 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[var(--league-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)] transition-colors">
                    Register as a Sub Goalie
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Join the goalie pool and get called up when teams need coverage.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0 group-hover:text-[var(--league-primary)] transition-colors" />
              </Link>
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
    </SubscriptionWall>
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
