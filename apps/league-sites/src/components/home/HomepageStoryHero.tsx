'use client';

import { startTransition, useEffect, useEffectEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Newspaper,
  Trophy,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { LeagueNewsFallbackArtwork } from '@/components/news/LeagueNewsFallbackArtwork';
import type { HomepageSeasonLeader, League, LeagueStats, NewsArticle, Season } from '@/lib/types';

const HERO_AUTOPLAY_MS = 7000;
const HERO_MANUAL_HOLD_MS = 12000;
const HERO_TICK_MS = 100;
const NO_STORY_HERO_IMAGE = '/hero-rink-stage.svg';

export interface HomepageStoryFallback {
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  href: string;
  cta: string;
}

interface HomepageStoryHeroProps {
  league: League;
  leagueSlug: string;
  articles: NewsArticle[];
  currentSeason: Season | null;
  registrationSeason?: {
    id?: string;
    name?: string | null;
    registration_closes_at?: string | null;
  } | null;
  stats: LeagueStats;
  previousSeasonName?: string | null;
  previousSeasonLeaders?: HomepageSeasonLeader[];
  photoFallback?: HomepageStoryFallback | null;
}

function getArticleLabel(articleType?: string | null) {
  if (articleType === 'game_recap') return 'Game Recap';
  if (articleType === 'weekly_wrap') return 'Weekly Wrap';
  if (articleType === 'announcement') return 'Announcement';
  return 'League Story';
}

function stripStoryMarkup(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clipText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const clipped = value.slice(0, maxLength).trimEnd();
  const safeBoundary = Math.max(clipped.lastIndexOf(' '), maxLength - 20);
  return `${clipped.slice(0, safeBoundary).trimEnd()}...`;
}

function deriveSnippet(article: NewsArticle) {
  const excerpt = article.excerpt?.trim();
  if (excerpt) {
    return clipText(excerpt, 140);
  }

  const blocks = article.content
    .split(/\n\s*\n/)
    .map((block) => stripStoryMarkup(block))
    .filter(Boolean);

  if (blocks[0]) {
    return clipText(blocks[0], 140);
  }

  return 'Fresh current-season league coverage, recaps, and player stories from around the rink.';
}

function getLocationLine(league: League, currentSeason: Season | null) {
  const location = [league.city, league.state].filter(Boolean).join(', ');
  if (location) {
    return location;
  }
  if (currentSeason?.name) {
    return currentSeason.name;
  }
  return 'Current season coverage';
}

function getSeasonNote(currentSeason: Season | null, stats: LeagueStats) {
  if (currentSeason?.name) {
    return `${currentSeason.name} with ${stats.totalTeams} teams, ${stats.totalPlayers} players, and ${stats.upcomingGames} games ahead.`;
  }
  return `${stats.totalTeams} teams, ${stats.totalPlayers} players, and ${stats.upcomingGames} upcoming games.`;
}

function formatStoryDate(article: NewsArticle) {
  return new Date(article.published_at || article.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function PreviousSeasonLeaderRow({
  leagueSlug,
  leader,
  rank,
}: {
  leagueSlug: string;
  leader: HomepageSeasonLeader;
  rank: number;
}) {
  return (
    <Link
      href={`/${leagueSlug}/players/${leader.player_id}`}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition-colors duration-200 hover:border-white/20 hover:bg-white/8"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
          rank === 1
            ? 'bg-white text-slate-950'
            : 'bg-white/10 text-white/74'
        }`}
      >
        {rank}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-white/10">
          {leader.avatar_url ? (
            <img src={leader.avatar_url} alt={leader.player_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-black text-white">{leader.player_name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white transition-colors duration-200 group-hover:text-[var(--league-primary)]">
            {leader.player_name}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.14em] text-white/56">
            {leader.division_name ? `${leader.division_name} | ${leader.team_name}` : leader.team_name}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-black leading-none text-white">{leader.points}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/52">PTS</p>
      </div>
    </Link>
  );
}

export function HomepageStoryHero({
  league,
  leagueSlug,
  articles,
  currentSeason,
  registrationSeason,
  stats,
  previousSeasonName,
  previousSeasonLeaders = [],
  photoFallback,
}: HomepageStoryHeroProps) {
  const storySlides = useMemo(
    () =>
      articles.slice(0, 5).map((article) => ({
        id: article.id,
        article,
        title: article.title,
        eyebrow: getArticleLabel(article.type),
        snippet: deriveSnippet(article),
        imageUrl: article.image_url,
        href: `/${leagueSlug}/news/${article.slug || article.id}`,
        cta: 'Read Story',
        dateLabel: formatStoryDate(article),
      })),
    [articles, leagueSlug],
  );

  const fallbackSlide = photoFallback
    ? {
        id: 'photo-fallback',
        title: photoFallback.title,
        eyebrow: photoFallback.eyebrow,
        snippet: photoFallback.subtitle,
        imageUrl: photoFallback.imageUrl,
        href: photoFallback.href,
        cta: photoFallback.cta,
        dateLabel: currentSeason?.name || 'Current Season',
        article: null,
      }
    : {
        id: 'identity-fallback',
        title: league.name,
        eyebrow: 'League Front Page',
        snippet:
          league.description ||
          'Bring current stories, league identity, and the next key action into one clear opening frame.',
        imageUrl: null,
        href: `/${leagueSlug}/schedule`,
        cta: 'View Schedule',
        dateLabel: currentSeason?.name || 'Current Season',
        article: null,
      };

  const hasStorySlides = storySlides.length > 0;
  const slides = hasStorySlides ? storySlides : [fallbackSlide];
  const hasMultipleSlides = slides.length > 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(hasMultipleSlides ? HERO_AUTOPLAY_MS : 0);
  const [cycleMs, setCycleMs] = useState(hasMultipleSlides ? HERO_AUTOPLAY_MS : 0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusPaused, setIsFocusPaused] = useState(false);

  useEffect(() => {
    setActiveIndex((previous) => {
      if (slides.length === 0) {
        return 0;
      }
      return previous >= slides.length ? 0 : previous;
    });

    if (slides.length > 1) {
      setCycleMs(HERO_AUTOPLAY_MS);
      setRemainingMs(HERO_AUTOPLAY_MS);
    } else {
      setCycleMs(0);
      setRemainingMs(0);
    }
  }, [slides.length]);

  const advanceSlide = useEffectEvent(() => {
    if (!hasMultipleSlides) {
      return;
    }

    startTransition(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    });
    setCycleMs(HERO_AUTOPLAY_MS);
  });

  useEffect(() => {
    if (!hasMultipleSlides || isHovered || isFocusPaused) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRemainingMs((current) => {
        if (current <= HERO_TICK_MS) {
          advanceSlide();
          return HERO_AUTOPLAY_MS;
        }
        return current - HERO_TICK_MS;
      });
    }, HERO_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [advanceSlide, hasMultipleSlides, isFocusPaused, isHovered]);

  const activeSlide = slides[activeIndex] || fallbackSlide;
  const progress = cycleMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / cycleMs)) : 0;
  const locationLine = getLocationLine(league, currentSeason);
  const seasonNote = getSeasonNote(currentSeason, stats);
  const registrationLabel = registrationSeason?.registration_closes_at
    ? new Date(registrationSeason.registration_closes_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const jumpToSlide = (nextIndex: number) => {
    startTransition(() => {
      setActiveIndex((nextIndex + slides.length) % slides.length);
    });
    if (hasMultipleSlides) {
      setCycleMs(HERO_MANUAL_HOLD_MS);
      setRemainingMs(HERO_MANUAL_HOLD_MS);
    }
  };

  const dockPrimaryCta = `/${leagueSlug}/schedule`;
  const dockSecondaryCta = `/${leagueSlug}/standings`;
  const dockTertiaryCta = registrationSeason ? `/${leagueSlug}/register` : `/${leagueSlug}/scores`;
  const dockPrimaryLabel = registrationSeason ? 'Register' : 'Schedule';
  const secondaryActions = registrationSeason
    ? [
        {
          href: `/${leagueSlug}/schedule`,
          label: 'Schedule',
          icon: <Calendar className="h-4 w-4 text-[var(--league-primary)]" />,
        },
        {
          href: dockSecondaryCta,
          label: 'Standings',
          icon: <Trophy className="h-4 w-4 text-[var(--league-primary)]" />,
        },
      ]
    : [
        {
          href: dockSecondaryCta,
          label: 'Standings',
          icon: <Trophy className="h-4 w-4 text-[var(--league-primary)]" />,
        },
        {
          href: dockTertiaryCta,
          label: 'Scores',
          icon: <TrendingUp className="h-4 w-4 text-[var(--league-primary)]" />,
        },
      ];

  return (
    <section
      className="relative isolate overflow-hidden border-b border-[var(--color-border)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {hasStorySlides ? (
              activeSlide.imageUrl ? (
                <img
                  src={activeSlide.imageUrl}
                  alt={activeSlide.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <LeagueNewsFallbackArtwork
                  leagueName={league.name}
                  leagueLogoUrl={league.logo_url}
                  articleType={activeSlide.article?.type || null}
                  emphasis="hero"
                />
              )
            ) : (
              <img
                src={NO_STORY_HERO_IMAGE}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,12,22,0.88)_0%,rgba(6,12,22,0.64)_42%,rgba(6,12,22,0.32)_70%,rgba(6,12,22,0.58)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--league-primary)_26%,transparent),transparent_34%)]" />
      </div>

      {hasStorySlides && (
        <Link
          href={activeSlide.href}
          aria-label={activeSlide.title}
          className="absolute inset-0 z-0"
        />
      )}

      <div className="relative mx-auto flex min-h-[560px] max-w-[1440px] items-end px-4 py-6 sm:px-5 md:min-h-[620px] md:px-6 md:py-8 xl:px-8 xl:py-10">
        <div className={`grid w-full gap-5 ${hasStorySlides ? 'items-end lg:grid-cols-[minmax(0,1.45fr)_340px] xl:grid-cols-[minmax(0,1.55fr)_360px]' : 'items-stretch lg:grid-cols-[minmax(0,1.55fr)_360px]'}`}>
          {hasStorySlides ? (
            <div className="relative z-20 max-w-4xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeSlide.id}-content`}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/28 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/88 backdrop-blur-sm">
                    <Newspaper className="h-3.5 w-3.5" />
                    {activeSlide.eyebrow}
                  </div>
                  <div className="mt-5 max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/62">
                      {activeSlide.dateLabel}
                    </p>
                    <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[0.92] tracking-tight text-white text-balance sm:text-5xl lg:text-6xl xl:text-[4.35rem]">
                      {activeSlide.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-white/78 sm:text-base sm:leading-7">
                      {activeSlide.snippet}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href={activeSlide.href}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      {activeSlide.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/${leagueSlug}/news`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-black/18 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/82 backdrop-blur-sm transition-colors duration-200 hover:border-white/32 hover:text-white"
                    >
                      All News
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>

              {hasMultipleSlides && (
                <div
                  className="relative z-20 mt-7 flex flex-wrap items-center gap-3"
                  onFocusCapture={() => setIsFocusPaused(true)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setIsFocusPaused(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => jumpToSlide(activeIndex - 1)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-black/22 text-white/86 backdrop-blur-sm transition-colors duration-200 hover:border-white/30 hover:text-white"
                      aria-label="Previous story"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => jumpToSlide(activeIndex + 1)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-black/22 text-white/86 backdrop-blur-sm transition-colors duration-200 hover:border-white/30 hover:text-white"
                      aria-label="Next story"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {slides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => jumpToSlide(index)}
                        className="group inline-flex items-center gap-2"
                        aria-label={`Go to story ${index + 1}`}
                      >
                        <span className="relative h-[3px] w-10 overflow-hidden rounded-full bg-white/18">
                          <span
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ${
                              activeIndex === index ? 'bg-white' : 'bg-white/0'
                            }`}
                            style={{
                              width: activeIndex === index ? `${Math.max(progress * 100, 6)}%` : '0%',
                            }}
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative z-20 flex min-h-[280px] items-center justify-center lg:min-h-[520px]">
              <div className="flex h-36 w-36 items-center justify-center rounded-full border border-white/18 bg-white/88 p-5 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm lg:h-48 lg:w-48 lg:p-6">
                {league.logo_url ? (
                  <img src={league.logo_url} alt={`${league.name} logo`} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-5xl font-black text-slate-950">{league.name.charAt(0)}</span>
                )}
              </div>
            </div>
          )}

          <div className="relative z-20">
            <motion.div
              className="overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,27,0.78)_0%,rgba(8,15,27,0.9)_100%)] p-5 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.72)] backdrop-blur-xl md:p-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
            >
              <div className="flex items-start gap-4">
                {hasStorySlides && (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/12 bg-white/9 p-3">
                    {league.logo_url ? (
                      <img src={league.logo_url} alt={`${league.name} logo`} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xl font-black text-white">{league.name.charAt(0)}</span>
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                    {hasStorySlides ? 'League Central' : 'League Hub'}
                  </p>
                  <h2 className="mt-2 text-3xl font-black leading-none tracking-tight text-white">
                    {league.name}
                  </h2>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/72">
                    <MapPin className="h-3.5 w-3.5 text-[var(--league-primary)]" />
                    {locationLine}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-white/76">{seasonNote}</p>

              {registrationSeason && (
                <div className="mt-5 rounded-2xl border border-[var(--league-primary)]/28 bg-[var(--league-primary)]/10 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                    Registration Open
                  </p>
                  <p className="mt-2 text-sm text-white/82">
                    {registrationSeason.name || 'Upcoming season'}
                    {registrationLabel ? ` closes ${registrationLabel}.` : ' is open now.'}
                  </p>
                </div>
              )}

              <div className="mt-6 grid gap-3">
                <Link
                  href={registrationSeason ? dockTertiaryCta : dockPrimaryCta}
                  className="inline-flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span className="inline-flex items-center gap-2">
                    {registrationSeason ? <UserPlus className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                    {dockPrimaryLabel}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="grid grid-cols-2 gap-3">
                  {secondaryActions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/6 px-4 py-3 text-sm font-semibold text-white/84 transition-colors duration-200 hover:border-white/28 hover:text-white"
                    >
                      {action.icon}
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>

              {previousSeasonLeaders.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                        Previous Season
                      </p>
                      <h3 className="mt-2 text-lg font-black tracking-tight text-white">
                        {previousSeasonName ? `${previousSeasonName} points leaders` : 'Top scorers'}
                      </h3>
                    </div>
                    <Link
                      href={`/${leagueSlug}/stats`}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/68 transition-colors duration-200 hover:text-white"
                    >
                      Stats
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-4 space-y-3">
                    {previousSeasonLeaders.slice(0, 3).map((leader, index) => (
                      <PreviousSeasonLeaderRow
                        key={`${leader.player_id}-${leader.team_id}-${index}`}
                        leagueSlug={leagueSlug}
                        leader={leader}
                        rank={index + 1}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomepageStoryHero;
