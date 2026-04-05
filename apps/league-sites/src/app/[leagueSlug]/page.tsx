import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SubscriptionWall } from '@/components/shared';
import {
  Trophy,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { stripMarkdownLinks } from '@/lib/news/rich-text';
import {
  getLeagueBySlug,
  getLeagueStats,
  getHomepageWeeklyGames,
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
  getLeagueAwards,
  getLeagueEvents,
  getTeams,
} from '@/lib/data';
import type {
  GalleryAlbum,
  GoalieStatsWithDivision,
  HomepageSeasonLeader,
  LeagueAward,
  LeagueEvent,
  NewsArticle,
  Season,
} from '@/lib/types';
import { StandingsWidget } from '@/components/StandingsWidget';
import { DivisionStandingsWidget } from '@/components/DivisionStandingsWidget';
import { DivisionUrlSync } from '@/components/DivisionUrlSync';
import { SponsorBanner } from '@/components/sponsors/SponsorBanner';
import { SocialLinks } from '@/components/SocialLinks';
import type { HomepagePhotoHighlight } from '@/components/home/HomepagePulseRail';
import { HomepageStoryHero } from '@/components/home/HomepageStoryHero';
import { HomepageSeasonBand } from '@/components/home/HomepageSeasonBand';
import { HomepageWeeklyGames } from '@/components/home/HomepageWeeklyGames';
import {
  HomepageEditorialRow,
  type HomepageRecognitionCard,
} from '@/components/home/HomepageEditorialRow';
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

function filterUpcomingEvents(events: LeagueEvent[], season: Season | null) {
  const now = Date.now();

  return events.filter((event) => {
    const start = new Date(event.start_time);
    if (Number.isNaN(start.getTime()) || start.getTime() < now) {
      return false;
    }

    if (!season?.end_date) {
      return true;
    }

    const seasonEnd = new Date(season.end_date);
    seasonEnd.setHours(23, 59, 59, 999);
    return start <= seasonEnd;
  });
}

function getMostRecentlyFinishedSeason(
  seasons: Season[],
  now: Date,
  registrationSeasonId?: string | null,
): Season | null {
  const nowMs = now.getTime();

  const finished = seasons.filter((season) => {
    if (registrationSeasonId && season.id === registrationSeasonId) {
      return false;
    }

    if (season.status === 'completed') {
      return true;
    }

    if (!season.end_date) {
      return false;
    }

    const endMs = new Date(season.end_date).getTime();
    return !Number.isNaN(endMs) && endMs < nowMs;
  });

  if (finished.length === 0) {
    return null;
  }

  return [...finished].sort((a, b) => {
    const aEnd = new Date(a.end_date || a.start_date || 0).getTime();
    const bEnd = new Date(b.end_date || b.start_date || 0).getTime();
    return bEnd - aEnd;
  })[0] ?? null;
}

type RecognitionRole = 'Forward' | 'Defense' | 'Goalie';

interface TeamLookupEntry {
  name: string;
  logoUrl: string | null;
  divisionName: string | null;
}

function normalizeRecognitionRole(position: string | null | undefined): RecognitionRole | null {
  const normalized = position?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === 'g' || normalized === 'goalie' || normalized === 'goaltender') {
    return 'Goalie';
  }

  if (
    normalized === 'd' ||
    normalized === 'defense' ||
    normalized === 'defence' ||
    normalized === 'defenseman' ||
    normalized === 'defenceman'
  ) {
    return 'Defense';
  }

  if (
    normalized === 'c' ||
    normalized === 'lw' ||
    normalized === 'rw' ||
    normalized === 'f' ||
    normalized === 'forward'
  ) {
    return 'Forward';
  }

  return null;
}

function inferAwardRole(
  award: LeagueAward,
  skaterLeadersByPlayer: Map<string, HomepageSeasonLeader>,
  goalieLeadersByPlayer: Map<string, GoalieStatsWithDivision>,
): RecognitionRole | null {
  const directRole = normalizeRecognitionRole(award.roster_position);
  if (directRole) {
    return directRole;
  }

  if (award.player_id && goalieLeadersByPlayer.has(award.player_id)) {
    return 'Goalie';
  }

  if (award.player_id) {
    const matchingSkater = skaterLeadersByPlayer.get(award.player_id);
    const derivedRole = normalizeRecognitionRole(matchingSkater?.position);
    if (derivedRole) {
      return derivedRole;
    }
  }

  const searchText = `${award.award_name} ${award.category} ${award.description || ''}`.toLowerCase();
  if (/(goalie|goaltender|netminder)/.test(searchText)) {
    return 'Goalie';
  }
  if (/(defense|defence|defenseman|defenceman)/.test(searchText)) {
    return 'Defense';
  }
  if (/(forward|scoring|offense|offence|skater|player)/.test(searchText)) {
    return 'Forward';
  }

  return null;
}

function formatSkaterRecognitionStatLine(leader: HomepageSeasonLeader) {
  return `${leader.points} PTS | ${leader.goals} G | ${leader.games_played} GP`;
}

function formatGoalieRecognitionStatLine(goalie: GoalieStatsWithDivision) {
  const savePct = goalie.save_percentage != null ? `${goalie.save_percentage}% SV` : null;
  return [goalie.wins ? `${goalie.wins} W` : null, savePct, `${goalie.games_played} GP`]
    .filter(Boolean)
    .join(' | ');
}

function getCompactAwardFallback(award: LeagueAward) {
  const compactLabel = award.category.replace(/_/g, ' ').trim();
  if (compactLabel && compactLabel.length <= 20) {
    return compactLabel.toUpperCase();
  }

  return 'LEAGUE HONOR';
}

function buildRecognitionCards({
  leagueSlug,
  awards,
  skaterPool,
  goaliePool,
  teamLookup,
  sourceLabel,
}: {
  leagueSlug: string;
  awards: LeagueAward[];
  skaterPool: HomepageSeasonLeader[];
  goaliePool: GoalieStatsWithDivision[];
  teamLookup: Map<string, TeamLookupEntry>;
  sourceLabel?: string | null;
}): HomepageRecognitionCard[] {
  const cardsByRole = new Map<RecognitionRole, HomepageRecognitionCard>();
  const usedPlayerIds = new Set<string>();
  const skaterLeadersByPlayer = new Map(skaterPool.map((leader) => [leader.player_id, leader]));
  const goalieLeadersByPlayer = new Map(goaliePool.map((goalie) => [goalie.player_id, goalie]));

  for (const award of awards) {
    if (!award.player_id || !award.player?.full_name) {
      continue;
    }

    const role = inferAwardRole(award, skaterLeadersByPlayer, goalieLeadersByPlayer);
    if (!role || cardsByRole.has(role)) {
      continue;
    }

    const teamMeta = (award.team_id ? teamLookup.get(award.team_id) : null) || null;
    const matchingSkater = skaterLeadersByPlayer.get(award.player_id);
    const matchingGoalie = goalieLeadersByPlayer.get(award.player_id);
    const statLine =
      role === 'Goalie'
        ? matchingGoalie
          ? formatGoalieRecognitionStatLine(matchingGoalie)
          : getCompactAwardFallback(award)
        : matchingSkater
          ? formatSkaterRecognitionStatLine(matchingSkater)
          : getCompactAwardFallback(award);

    cardsByRole.set(role, {
      role,
      playerId: award.player_id,
      playerName: award.player.full_name,
      avatarUrl: award.player.avatar_url || award.image_url,
      teamName: award.team?.name || teamMeta?.name || null,
      teamLogoUrl: award.team?.logo_url || teamMeta?.logoUrl || null,
      divisionName: award.division_name || award.team?.division?.name || teamMeta?.divisionName || null,
      jerseyNumber: award.roster_jersey_number ?? null,
      position: award.roster_position || matchingSkater?.position || (role === 'Goalie' ? 'Goalie' : role),
      statLine,
      sourceLabel,
      href: `/${leagueSlug}/players/${award.player_id}`,
    });
    usedPlayerIds.add(award.player_id);
  }

  const sortedGoaliePool = [...goaliePool].sort((a, b) => {
    const winDiff = (b.wins || 0) - (a.wins || 0);
    if (winDiff !== 0) {
      return winDiff;
    }
    return (b.save_percentage || 0) - (a.save_percentage || 0);
  });

  const addFallbackSkater = (role: RecognitionRole) => {
    const matchingLeader =
      skaterPool.find((leader) => !usedPlayerIds.has(leader.player_id) && normalizeRecognitionRole(leader.position) === role) ||
      skaterPool.find((leader) => !usedPlayerIds.has(leader.player_id) && normalizeRecognitionRole(leader.position) === 'Forward') ||
      skaterPool.find((leader) => !usedPlayerIds.has(leader.player_id));

    if (!matchingLeader) {
      return;
    }

    const teamMeta = teamLookup.get(matchingLeader.team_id);
    cardsByRole.set(role, {
      role,
      playerId: matchingLeader.player_id,
      playerName: matchingLeader.player_name,
      avatarUrl: matchingLeader.avatar_url,
      teamName: matchingLeader.team_name || teamMeta?.name || null,
      teamLogoUrl: teamMeta?.logoUrl || null,
      divisionName: matchingLeader.division_name || teamMeta?.divisionName || null,
      jerseyNumber: null,
      position: matchingLeader.position,
      statLine: formatSkaterRecognitionStatLine(matchingLeader),
      sourceLabel,
      href: `/${leagueSlug}/players/${matchingLeader.player_id}`,
    });
    usedPlayerIds.add(matchingLeader.player_id);
  };

  const addFallbackGoalie = () => {
    const matchingGoalie = sortedGoaliePool.find((goalie) => !usedPlayerIds.has(goalie.player_id));
    if (!matchingGoalie) {
      return;
    }

    const teamMeta = teamLookup.get(matchingGoalie.team_id);
    cardsByRole.set('Goalie', {
      role: 'Goalie',
      playerId: matchingGoalie.player_id,
      playerName: matchingGoalie.player_name,
      avatarUrl: matchingGoalie.avatar_url || null,
      teamName: matchingGoalie.team_name || teamMeta?.name || null,
      teamLogoUrl: matchingGoalie.team_logo || teamMeta?.logoUrl || null,
      divisionName: matchingGoalie.division_name || teamMeta?.divisionName || null,
      jerseyNumber: matchingGoalie.jersey_number ? Number(matchingGoalie.jersey_number) : null,
      position: 'Goalie',
      statLine: formatGoalieRecognitionStatLine(matchingGoalie),
      sourceLabel,
      href: `/${leagueSlug}/players/${matchingGoalie.player_id}`,
    });
    usedPlayerIds.add(matchingGoalie.player_id);
  };

  if (!cardsByRole.has('Forward')) {
    addFallbackSkater('Forward');
  }
  if (!cardsByRole.has('Defense')) {
    addFallbackSkater('Defense');
  }
  if (!cardsByRole.has('Goalie')) {
    addFallbackGoalie();
  }

  return ['Forward', 'Defense', 'Goalie']
    .map((role) => cardsByRole.get(role as RecognitionRole) || null)
    .filter((card): card is HomepageRecognitionCard => Boolean(card));
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
    weeklyGames,
    recentGames,
    standings,
    divisions,
    allNewsArticles,
    sponsors,
    allAlbums,
    teams,
    currentScoringLeadersRaw,
    currentGoalieLeadersRaw,
    seasons,
    allEvents,
  ] = await Promise.all([
    getLeagueStats(league.id, currentSeason?.id),
    getHomepageWeeklyGames(league.id, {
      divisionId: divisionFilter,
      seasonId: currentSeason?.id,
      timezone: league.timezone,
    }),
    getRecentGames(league.id, 5, divisionFilter, currentSeason?.id),
    getStandings(league.id, currentSeason?.id),
    getDivisions(league.id),
    getAllArticles(league.id, 18),
    getLeagueSponsors(league.id),
    getGalleryAlbums(league.id),
    getTeams(league.id),
    getPointsLeadersWithDivision(league.id, currentSeason?.id, 24, divisionFilter),
    getGoalieLeadersWithDivision(league.id, currentSeason?.id, 'wins', 10, divisionFilter),
    getSeasons(league.id),
    getLeagueEvents(league.id),
  ]);

  const newsArticles = filterArticlesForSeason(allNewsArticles, currentSeason);
  const albums = filterAlbumsForSeason(allAlbums, currentSeason);

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
  const previousCompletedSeason = getMostRecentlyFinishedSeason(
    seasons,
    now,
    registrationSeason?.id,
  );
  const [previousScoringLeadersRaw, previousGoalieLeadersRaw, currentAwards, previousAwards] = previousCompletedSeason
    ? await Promise.all([
        getPointsLeadersWithDivision(league.id, previousCompletedSeason.id, 24, divisionFilter),
        getGoalieLeadersWithDivision(league.id, previousCompletedSeason.id, 'wins', 10, divisionFilter),
        currentSeason?.id ? getLeagueAwards(league.id, currentSeason.id) : Promise.resolve([]),
        getLeagueAwards(league.id, previousCompletedSeason.id),
      ])
    : await Promise.all([
        Promise.resolve([]),
        Promise.resolve([]),
        currentSeason?.id ? getLeagueAwards(league.id, currentSeason.id) : Promise.resolve([]),
        Promise.resolve([]),
      ]);
  const heroArticles = (newsArticles.length > 0 ? newsArticles : allNewsArticles).slice(0, 5);
  const homepagePhotoHighlight = buildHomepagePhotoHighlight({
    leagueSlug,
    albums,
    newsArticles,
  });
  const aroundLeagueArticles = (newsArticles.length > 0 ? newsArticles : allNewsArticles).slice(0, 3);
  const previousScoringLeaders = filterCurrentSkaterLeaders(previousScoringLeadersRaw).slice(0, 5);
  const previousGoalieLeaders = previousGoalieLeadersRaw.slice(0, 5);
  const aroundLeagueEvents = filterUpcomingEvents(allEvents, currentSeason).slice(0, 2);
  const teamLookup = new Map<string, TeamLookupEntry>(
    teams.map((team) => [
      team.id,
      {
        name: team.name,
        logoUrl: team.logo || team.logo_url || null,
        divisionName: team.division?.name || null,
      },
    ]),
  );

  const showPreviousLeaders = Boolean(
    registrationSeason &&
      previousCompletedSeason &&
      (previousScoringLeaders.length > 0 || previousGoalieLeaders.length > 0)
  );
  const leadersEyebrow = showPreviousLeaders ? 'Previous Season' : 'Current Season';
  const leadersSeasonName = showPreviousLeaders
    ? previousCompletedSeason?.name ?? null
    : currentSeason?.name ?? null;
  const leadersDescription = showPreviousLeaders
    ? 'Registration is open, so last season’s top skaters and goalies stay visible until the new race begins.'
    : 'Top skaters and goalies update with the current season’s stat race.';

  const usePreviousRecognitionSource = Boolean(
    registrationSeason && currentAwards.length === 0 && previousAwards.length > 0
  );
  const recognitionAwards = usePreviousRecognitionSource ? previousAwards : currentAwards;
  const recognitionSkaterPool =
    usePreviousRecognitionSource || (!currentAwards.length && showPreviousLeaders)
      ? filterCurrentSkaterLeaders(previousScoringLeadersRaw)
      : filterCurrentSkaterLeaders(currentScoringLeadersRaw);
  const recognitionGoaliePool =
    usePreviousRecognitionSource || (!currentAwards.length && showPreviousLeaders)
      ? previousGoalieLeadersRaw
      : currentGoalieLeadersRaw;
  const recognitionSeasonLabel = usePreviousRecognitionSource
    ? previousCompletedSeason?.name || 'Previous Season'
    : currentSeason?.name || leadersSeasonName;
  const recognitionCards = buildRecognitionCards({
    leagueSlug,
    awards: recognitionAwards,
    skaterPool: recognitionSkaterPool,
    goaliePool: recognitionGoaliePool,
    teamLookup,
    sourceLabel: recognitionSeasonLabel,
  });

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
        timezone={league.timezone}
        leadersEyebrow={leadersEyebrow}
        leadersSeasonName={leadersSeasonName}
        leadersDescription={leadersDescription}
        scoringLeaders={[]}
        goalieLeaders={[]}
        spotlight={seasonSpotlight?.type === 'registration' ? null : seasonSpotlight}
      />

      <div className="pt-6">
        <SponsorBanner
          sponsors={sponsors}
          compact
        />
      </div>

      <HomepageEditorialRow
        leagueSlug={leagueSlug}
        leagueName={league.name}
        leagueLogoUrl={league.logo_url}
        recognitionCards={recognitionCards}
        recognitionSeasonLabel={recognitionSeasonLabel}
        articles={aroundLeagueArticles}
        events={aroundLeagueEvents}
        hideEditorialColumn
      />

      <div className="mx-auto max-w-[1180px] space-y-8 px-5 py-8 sm:px-6 md:py-10 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
          <section className={panelClass}>
            <HomepageWeeklyGames
              games={weeklyGames}
              leagueSlug={leagueSlug}
              timezone={league.timezone}
            />
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

        {socialSettings && (
          <section className={`${panelClass} p-6 md:p-8`}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                  Community
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
                  Stay connected between games.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Follow the league for photos, updates, and game-night posts, then jump straight into the pages players actually use.
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:items-end">
                <SocialLinks settings={socialSettings} size="lg" className="justify-start lg:justify-end" />
                <div className="flex flex-wrap gap-2">
                  {hasAlbums && (
                    <QuickLinkChip href={`/${leagueSlug}/gallery`} label="Photos" />
                  )}
                  {allNewsArticles.length > 0 && (
                    <QuickLinkChip href={`/${leagueSlug}/news`} label="News" />
                  )}
                  <QuickLinkChip href={`/${leagueSlug}/contact`} label="Contact" />
                </div>
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

function QuickLinkChip({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/82 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)] transition-all duration-200 hover:border-[var(--league-primary)] hover:text-[var(--league-primary)]"
    >
      {label}
    </Link>
  );
}
