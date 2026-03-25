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
  BookOpen,
  Mail,
  MapPin,
  Phone,
  UserPlus,
} from 'lucide-react';
import { stripMarkdownLinks } from '@/lib/news/rich-text';
import {
  getLeagueBySlug,
  getLeagueStats,
  getUpcomingGames,
  getRecentGames,
  getStandings,
  getDivisions,
  getAllArticles,
  getLeagueSponsors,
  getGalleryAlbums,
  getPointsLeadersWithDivision,
  getGoalieLeadersWithDivision,
  getCurrentSeason,
  getSeasons,
} from '@/lib/data';
import type { GalleryAlbum, NewsArticle, Season } from '@/lib/types';
import { GameCard } from '@/components/GameCard';
import { StandingsWidget } from '@/components/StandingsWidget';
import { DivisionStandingsWidget } from '@/components/DivisionStandingsWidget';
import { DivisionUrlSync } from '@/components/DivisionUrlSync';
import { SponsorBanner } from '@/components/sponsors/SponsorBanner';
import { SocialLinks } from '@/components/SocialLinks';
import type { HomepagePhotoHighlight } from '@/components/home/HomepagePulseRail';
import { HomepageStoryHero } from '@/components/home/HomepageStoryHero';
import { HomepageSeasonBand } from '@/components/home/HomepageSeasonBand';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui';
import { buildSportsOrganizationJsonLd } from '@/lib/jsonld';
import { pickRegistrationSeason } from '@/lib/registration/seasons';

interface HomePageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ division?: string }>;
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
      subtitle: stripMarkdownLinks(featuredStory.excerpt || '') || 'Latest updates and league stories from around the rink.',
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

function filterCurrentSkaterLeaders<T extends { position: string | null | undefined }>(leaders: T[]) {
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
    allAlbums,
    currentScoringLeadersRaw,
    currentGoalieLeadersRaw,
    seasons,
  ] = await Promise.all([
    getLeagueStats(league.id, currentSeason?.id),
    getUpcomingGames(league.id, 5, divisionFilter, currentSeason?.id),
    getRecentGames(league.id, 5, divisionFilter, currentSeason?.id),
    getStandings(league.id, currentSeason?.id),
    getDivisions(league.id),
    getAllArticles(league.id, 18),
    getLeagueSponsors(league.id),
    getGalleryAlbums(league.id),
    getPointsLeadersWithDivision(league.id, currentSeason?.id, 12, divisionFilter),
    getGoalieLeadersWithDivision(league.id, currentSeason?.id, 'wins', 5, divisionFilter),
    getSeasons(league.id),
  ]);

  const newsArticles = filterArticlesForSeason(allNewsArticles, currentSeason);
  const albums = filterAlbumsForSeason(allAlbums, currentSeason);
  const currentScoringLeaders = filterCurrentSkaterLeaders(currentScoringLeadersRaw).slice(0, 5);
  const currentGoalieLeaders = currentGoalieLeadersRaw.slice(0, 5);

  const hasAlbums = albums.length > 0;
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
  const previousCompletedSeason =
    seasons.find((season) => season.id !== currentSeason?.id && season.status === 'completed') ||
    seasons.find((season) => season.id !== currentSeason?.id) ||
    null;
  const [previousScoringLeadersRaw, previousGoalieLeadersRaw] = previousCompletedSeason
    ? await Promise.all([
        getPointsLeadersWithDivision(league.id, previousCompletedSeason.id, 12, divisionFilter),
        getGoalieLeadersWithDivision(league.id, previousCompletedSeason.id, 'wins', 5, divisionFilter),
      ])
    : [[], []];
  const heroArticles = (newsArticles.length > 0 ? newsArticles : allNewsArticles).slice(0, 5);
  const homepagePhotoHighlight = buildHomepagePhotoHighlight({
    leagueSlug,
    albums,
    newsArticles,
  });
  const previousScoringLeaders = filterCurrentSkaterLeaders(previousScoringLeadersRaw).slice(0, 5);
  const previousGoalieLeaders = previousGoalieLeadersRaw.slice(0, 5);

  const showPreviousLeaders = Boolean(
    registrationSeason &&
      previousCompletedSeason &&
      (previousScoringLeaders.length > 0 || previousGoalieLeaders.length > 0)
  );
  const displayScoringLeaders = showPreviousLeaders ? previousScoringLeaders : currentScoringLeaders;
  const displayGoalieLeaders = showPreviousLeaders ? previousGoalieLeaders : currentGoalieLeaders;
  const leadersEyebrow = showPreviousLeaders ? 'Previous Season' : 'Current Season';
  const leadersSeasonName = showPreviousLeaders
    ? previousCompletedSeason?.name ?? null
    : currentSeason?.name ?? null;
  const leadersDescription = showPreviousLeaders
    ? 'Registration is open, so last season’s top skaters and goalies stay visible until the new race begins.'
    : 'Top skaters and goalies update with the current season’s stat race.';

  const seasonSpotlight = registrationSeason
    ? {
        type: 'registration' as const,
        seasonName: registrationSeason.name || 'Season Registration',
        href: `/${leagueSlug}/register`,
        opensAt: (registrationSeason as any).registration_opens_at ?? null,
        closesAt: registrationSeason.registration_closes_at ?? null,
      }
    : recentGames.length > 0
      ? {
          type: 'results' as const,
          title: 'Latest finals from around the rink',
          href: `/${leagueSlug}/scores`,
          games: recentGames.slice(0, 2),
        }
      : homepagePhotoHighlight
        ? {
            type: 'gallery' as const,
            title: 'Latest gallery',
            highlight: homepagePhotoHighlight,
          }
        : null;

  const templateVariant =
    league.settings?.website?.themePreset === 'light' || league.settings?.website?.themePreset === 'custom'
      ? league.settings.website.themePreset
      : 'dark';

  const panelClass = 'league-shell-panel rounded-3xl border border-[var(--color-border)] p-6 md:p-8';
  const rulesContent = typeof (league.settings as Record<string, unknown> | null | undefined)?.rules === 'string'
    ? ((league.settings as Record<string, unknown>).rules as string)
    : '';
  const hasRulesContent = rulesContent.trim().length > 0;

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

      <HomepageSeasonBand
        leagueSlug={leagueSlug}
        leadersEyebrow={leadersEyebrow}
        leadersSeasonName={leadersSeasonName}
        leadersDescription={leadersDescription}
        scoringLeaders={displayScoringLeaders}
        goalieLeaders={displayGoalieLeaders}
        spotlight={seasonSpotlight}
      />

      <div className="pt-6">
        <SponsorBanner
          sponsors={sponsors}
          eyebrow="League Sponsors"
          title="All sponsors supporting the league"
        />
      </div>

      <div className="container mx-auto space-y-8 px-4 py-8 md:py-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
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
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
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

          <section className={`${panelClass} p-6 md:p-7`}>
            <SectionHeading
              title="Quick Links"
              icon={<BookOpen className="w-5 h-5 text-[var(--league-primary)]" />}
            />
            <nav className="mt-5 grid gap-2 sm:grid-cols-2">
              {hasRulesContent && (
                <QuickLink href={`/${leagueSlug}/about`} icon={<BookOpen className="w-4 h-4" />} label="League Rules" />
              )}
              <QuickLink href={`/${leagueSlug}/teams`} icon={<Users className="w-4 h-4" />} label="View All Teams" />
              <QuickLink href={`/${leagueSlug}/stats`} icon={<TrendingUp className="w-4 h-4" />} label="Stats Leaders" />
              <QuickLink href={`/${leagueSlug}/schedule`} icon={<Calendar className="w-4 h-4" />} label="Schedule" />
              {hasAlbums && (
                <QuickLink href={`/${leagueSlug}/gallery`} icon={<Camera className="w-4 h-4" />} label="Photo Gallery" />
              )}
              <QuickLink href={`/${leagueSlug}/contact`} icon={<Mail className="w-4 h-4" />} label="Contact League" />
              <QuickLink href={`/${leagueSlug}/goalies/register`} icon={<UserPlus className="w-4 h-4" />} label="Sub Goalie Signup" />
            </nav>
          </section>
        </div>

        <div className={`grid gap-8 ${hasAlbums ? 'xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]' : ''}`}>
          {hasAlbums && (
            <section className={panelClass}>
              <SectionHeading
                title="Galleries"
                icon={<Camera className="w-5 h-5 text-[var(--league-primary)]" />}
                href={`/${leagueSlug}/gallery`}
                cta="View All Albums"
              />

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {albums.slice(0, 3).map((album) => (
                  <Link
                    key={album.id}
                    href={`/${leagueSlug}/gallery/${album.id}`}
                    className="group relative aspect-[4/3] overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--league-primary)]"
                  >
                    {album.cover_photo_url ? (
                      <img
                        src={album.cover_photo_url}
                        alt={album.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-hover)]">
                        <Camera className="h-8 w-8 text-[var(--color-text-muted)]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-85 transition-opacity group-hover:opacity-95" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="truncate text-sm font-semibold text-white">{album.title}</h3>
                      {(album.photo_count ?? 0) > 0 && (
                        <p className="mt-1 text-xs text-white/68">
                          {album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className={`${panelClass} p-6 md:p-7`}>
            <SectionHeading
              title="Contact Information"
              icon={<Mail className="w-5 h-5 text-[var(--league-primary)]" />}
              href={`/${leagueSlug}/contact`}
              cta="Contact Page"
            />

            <div className="mt-6 space-y-4">
              {league.contact_email && (
                <a
                  href={`mailto:${league.contact_email}`}
                  className="flex items-start gap-3 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-4 py-4 transition-colors duration-200 hover:border-[var(--league-primary)]"
                >
                  <span className="rounded-2xl bg-[var(--league-primary)]/12 p-2 text-[var(--league-primary)]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Email</span>
                    <span className="mt-1 block truncate text-sm font-semibold text-[var(--color-text-primary)]">{league.contact_email}</span>
                  </span>
                </a>
              )}

              {league.contact_phone && (
                <div className="flex items-start gap-3 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-4 py-4">
                  <span className="rounded-2xl bg-[var(--league-primary)]/12 p-2 text-[var(--league-primary)]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Phone</span>
                    <span className="mt-1 block text-sm font-semibold text-[var(--color-text-primary)]">{league.contact_phone}</span>
                  </span>
                </div>
              )}

              {(league.address || league.city || league.state || league.zip_code) && (
                <div className="flex items-start gap-3 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-4 py-4">
                  <span className="rounded-2xl bg-[var(--league-primary)]/12 p-2 text-[var(--league-primary)]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Location</span>
                    {league.address && (
                      <span className="mt-1 block text-sm font-semibold text-[var(--color-text-primary)]">{league.address}</span>
                    )}
                    <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">
                      {[league.city, league.state, league.zip_code].filter(Boolean).join(', ')}
                    </span>
                  </span>
                </div>
              )}

              {!league.contact_email && !league.contact_phone && !league.address && !league.city && !league.state && !league.zip_code && (
                <Card variant="glass" padding="lg" hover={false}>
                  <p className="text-center text-[var(--color-text-secondary)]">
                    Reach the league through the contact page for questions, registration help, and rink details.
                  </p>
                </Card>
              )}
            </div>
          </section>
        </div>

        {socialSettings && (
          <section className={`${panelClass} p-6 md:p-8`}>
            <div className="flex flex-col items-center text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                Social Media
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
                Follow the league
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Click through to the league&apos;s social profiles for photos, updates, and game-night posts.
              </p>
              <div className="mt-6">
                <SocialLinks settings={socialSettings} size="lg" className="justify-center" />
              </div>
            </div>
          </section>
        )}
      </div>

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
