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
  getSeasonPointsLeadersWithDivision,
  getGoalieLeaders,
  getCurrentSeason,
  getSeasons,
  getLatestAnnouncement,
} from '@/lib/data';
import type { GalleryAlbum, LeagueEvent, NewsArticle, PlayerStatsWithAvatar, Season } from '@/lib/types';
import { GameCard } from '@/components/GameCard';
import { StandingsWidget } from '@/components/StandingsWidget';
import { DivisionStandingsWidget } from '@/components/DivisionStandingsWidget';
import { DivisionUrlSync } from '@/components/DivisionUrlSync';
import { SponsorBanner } from '@/components/sponsors/SponsorBanner';
import { AwardsShowcase } from '@/components/awards/AwardsShowcase';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import {
  HomepagePulseRail,
  type HomepageCountdownCard,
  type HomepagePhotoHighlight,
} from '@/components/home/HomepagePulseRail';
import { HomepageStoryHero } from '@/components/home/HomepageStoryHero';
import { HomepagePreviousSeasonLeaders } from '@/components/home/HomepagePreviousSeasonLeaders';
import { HomepageLeadersTabs } from '@/components/home/HomepageLeadersTabs';
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

function isGoaliePosition(position: string | null | undefined) {
  const normalized = position?.trim().toLowerCase();
  return normalized === 'g' || normalized === 'goalie';
}

function isWithinSeasonWindow(dateValue: string | null | undefined, season: Season | null) {
  if (!season?.start_date || !dateValue) {
    return false;
  }

  const targetDate = new Date(dateValue);
  const seasonStart = new Date(season.start_date);

  if (Number.isNaN(targetDate.getTime()) || Number.isNaN(seasonStart.getTime())) {
    return false;
  }

  if (targetDate < seasonStart) {
    return false;
  }

  if (!season.end_date) {
    return true;
  }

  const seasonEnd = new Date(season.end_date);
  seasonEnd.setHours(23, 59, 59, 999);
  return targetDate <= seasonEnd;
}

function filterArticlesForSeason(articles: NewsArticle[], season: Season | null) {
  if (!season) {
    return articles;
  }

  return articles.filter((article) => {
    if (article.season_id) {
      return article.season_id === season.id;
    }
    return isWithinSeasonWindow(article.published_at || article.created_at, season);
  });
}

function filterAlbumsForSeason(albums: GalleryAlbum[], season: Season | null) {
  if (!season) {
    return albums;
  }

  return albums.filter((album) => {
    if (album.season_id) {
      return album.season_id === season.id;
    }
    return isWithinSeasonWindow(album.created_at, season);
  });
}

function filterEventsForSeason(events: LeagueEvent[], season: Season | null) {
  if (!season) {
    return events;
  }

  return events.filter((event) => isWithinSeasonWindow(event.start_time, season));
}

function filterCurrentSkaterLeaders(leaders: PlayerStatsWithAvatar[]) {
  return leaders.filter((leader) => !isGoaliePosition(leader.position));
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
    allNewsArticles,
    sponsors,
    allEvents,
    awards,
    allAlbums,
    rawScoringLeaders,
    seasons,
    latestAnnouncement,
  ] = await Promise.all([
    getLeagueStats(league.id, currentSeason?.id),
    getUpcomingGames(league.id, 5, divisionFilter, currentSeason?.id),
    getRecentGames(league.id, 5, divisionFilter, currentSeason?.id),
    getStandings(league.id, currentSeason?.id),
    getDivisions(league.id),
    getAllArticles(league.id, 18),
    getLeagueSponsors(league.id),
    getLeagueEvents(league.id),
    getLeagueAwards(league.id, currentSeason?.id),
    getGalleryAlbums(league.id),
    getStatsLeadersWithAvatars(league.id, 'points', 12, divisionFilter, currentSeason?.id),
    getSeasons(league.id),
    getLatestAnnouncement(league.id, currentSeason?.id),
  ]);

  const goalieLeadersRaw = await getGoalieLeaders(league.id, currentSeason?.id, 'wins', 5, divisionFilter);

  const newsArticles = filterArticlesForSeason(allNewsArticles, currentSeason);
  const albums = filterAlbumsForSeason(allAlbums, currentSeason);
  const events = filterEventsForSeason(allEvents, currentSeason);
  const scoringLeaders = filterCurrentSkaterLeaders(rawScoringLeaders).slice(0, 5);
  const goalieLeaders = goalieLeadersRaw.slice(0, 5);

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
  const hasFutureEvents = events.some((event) => new Date(event.start_time) >= new Date());

  // Check if registration is open for any season
  const now = new Date();
  const registrationSeason = pickRegistrationSeason(seasons as any[], now);
  const previousCompletedSeason =
    seasons.find((season) => season.id !== currentSeason?.id && season.status === 'completed') ||
    seasons.find((season) => season.id !== currentSeason?.id) ||
    null;
  const previousSeasonLeaders = previousCompletedSeason
    ? await getSeasonPointsLeadersWithDivision(league.id, previousCompletedSeason.id, 3)
    : [];
  const heroArticles = newsArticles.slice(0, 5);
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
  const hasUtilityBand = !!homepageCountdown || !!homepagePhotoHighlight || !!socialSettings || hasFutureEvents;

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

      <HomepageStoryHero
        league={league}
        leagueSlug={leagueSlug}
        articles={heroArticles}
        currentSeason={currentSeason}
        registrationSeason={registrationSeason}
        stats={stats}
        photoFallback={homepagePhotoHighlight}
      />

      {hasLeaders && (
        <section className="container mx-auto px-4 pt-6">
          <div className={`${panelClass} overflow-hidden`}>
            <HomepageLeadersTabs
              leagueSlug={leagueSlug}
              seasonName={currentSeason?.name ?? null}
              scoringLeaders={scoringLeaders}
              goalieLeaders={goalieLeaders}
            />
          </div>
        </section>
      )}

      {hasUtilityBand && (
        <section className="container mx-auto px-4 pt-5">
          <HomepagePulseRail
            leagueSlug={leagueSlug}
            events={events}
            socialSettings={socialSettings}
            countdown={homepageCountdown}
            photoHighlight={homepagePhotoHighlight}
          />
        </section>
      )}

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

      {previousSeasonLeaders.length > 0 && (
        <HomepagePreviousSeasonLeaders
          leagueSlug={leagueSlug}
          seasonName={previousCompletedSeason?.name ?? null}
          leaders={previousSeasonLeaders}
        />
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

      {/* Sponsors */}
      <div className="pb-2">
        <SponsorBanner sponsors={sponsors} />
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
