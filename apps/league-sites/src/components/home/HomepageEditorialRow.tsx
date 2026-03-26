import Link from 'next/link';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { LeagueNewsFallbackArtwork } from '@/components/news/LeagueNewsFallbackArtwork';
import type { LeagueEvent, NewsArticle } from '@/lib/types';

export interface HomepageRecognitionCard {
  role: 'Forward' | 'Defense' | 'Goalie';
  playerId: string;
  playerName: string;
  avatarUrl: string | null;
  teamName: string | null;
  teamLogoUrl: string | null;
  divisionName: string | null;
  jerseyNumber: number | null;
  position: string | null;
  statLine: string;
  sourceLabel?: string | null;
  href: string;
}

interface HomepageEditorialRowProps {
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl?: string | null;
  recognitionCards: HomepageRecognitionCard[];
  recognitionSeasonLabel?: string | null;
  articles: NewsArticle[];
  events?: LeagueEvent[];
}

function getArticleLabel(type: string) {
  if (type === 'game_recap') return 'Game Recap';
  if (type === 'weekly_wrap') return 'Weekly Wrap';
  if (type === 'announcement') return 'Announcement';
  return 'League Story';
}

function getArticleSnippet(article: NewsArticle) {
  if (article.excerpt?.trim()) {
    return article.excerpt.trim();
  }

  const firstParagraph = article.content
    .split(/\n+/)
    .map((part) => part.trim())
    .find(Boolean);

  if (!firstParagraph) {
    return 'Fresh updates, league stories, and rink-side coverage.';
  }

  return firstParagraph.length > 120 ? `${firstParagraph.slice(0, 117).trimEnd()}...` : firstParagraph;
}

function formatArticleDate(value?: string | null) {
  if (!value) return 'Latest';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Latest';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPlayerMeta(card: HomepageRecognitionCard) {
  const parts: string[] = [];
  if (card.position) {
    parts.push(card.position);
  }
  if (card.jerseyNumber != null) {
    parts.push(`#${card.jerseyNumber}`);
  }
  return parts.join(' | ');
}

function TeamLogoBadge({
  name,
  logoUrl,
}: {
  name: string | null;
  logoUrl: string | null;
}) {
  if (!name && !logoUrl) {
    return null;
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/90">
      {logoUrl ? (
        <img src={logoUrl} alt={name || 'Team logo'} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-black text-[var(--league-primary)]">{name?.charAt(0) || '?'}</span>
      )}
    </div>
  );
}

export function HomepageEditorialRow({
  leagueSlug,
  leagueName,
  leagueLogoUrl,
  recognitionCards,
  recognitionSeasonLabel,
  articles,
  events = [],
}: HomepageEditorialRowProps) {
  if (recognitionCards.length === 0 && articles.length === 0 && events.length === 0) {
    return null;
  }

  const displayArticles = articles.slice(0, 3);
  const displayEvents = events.slice(0, 2);

  return (
    <section className="container mx-auto px-4 pt-4 md:pt-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <section className="league-shell-panel rounded-[30px] border border-[var(--color-border)] px-4 py-5 md:px-6 md:py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                Players of the Month
              </p>
              <h2 className="mt-2 text-[1.85rem] font-black tracking-tight text-[var(--color-text-primary)]">
                Recognition that keeps the homepage alive.
              </h2>
            </div>
            {recognitionSeasonLabel ? (
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {recognitionSeasonLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3">
            {recognitionCards.map((card) => {
              const playerMeta = formatPlayerMeta(card);

              return (
                <Link
                  key={`${card.role}-${card.playerId}`}
                  href={card.href}
                  className="group flex items-center gap-4 rounded-[26px] border border-[var(--color-border)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-surface)_88%,transparent),color-mix(in_srgb,var(--league-primary)_10%,transparent))] px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--league-primary)]"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/92">
                    {card.avatarUrl ? (
                      <img src={card.avatarUrl} alt={card.playerName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-[var(--league-primary)]">{card.playerName.charAt(0)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--league-primary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-text)]">
                        {card.role} of the Month
                      </span>
                      {card.sourceLabel ? (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                          {card.sourceLabel}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
                      {card.playerName}
                    </h3>

                    {playerMeta ? (
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        {playerMeta}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <TeamLogoBadge name={card.teamName} logoUrl={card.teamLogoUrl} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                            {card.teamName || 'League selection'}
                          </p>
                          {card.divisionName ? (
                            <p className="truncate text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                              {card.divisionName}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <span className="rounded-full border border-[var(--league-primary)]/24 bg-[var(--league-primary)]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--league-primary)]">
                        {card.statLine}
                      </span>
                    </div>
                  </div>

                  <ArrowUpRight className="hidden h-4 w-4 shrink-0 text-[var(--league-primary)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 md:block" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="league-shell-panel rounded-[30px] border border-[var(--color-border)] px-4 py-5 md:px-6 md:py-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                Around the League
              </p>
              <h2 className="mt-2 text-[1.85rem] font-black tracking-tight text-[var(--color-text-primary)]">
                A second news layer, not another hero.
              </h2>
            </div>
            <Link
              href={`/${leagueSlug}/news`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)] transition-all duration-200 hover:border-[var(--league-primary)] hover:text-[var(--league-primary)]"
            >
              All News
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {displayArticles.length > 0 ? (
            <div className="mt-5 space-y-3">
              {displayArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/${leagueSlug}/news/${article.slug || article.id}`}
                  className="group flex gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/74 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--league-primary)]"
                >
                  <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)]">
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <LeagueNewsFallbackArtwork
                        leagueName={leagueName}
                        leagueLogoUrl={leagueLogoUrl}
                        articleType={article.type}
                        emphasis="compact"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                      {getArticleLabel(article.type)} | {formatArticleDate(article.published_at || article.created_at)}
                    </p>
                    <h3 className="mt-1.5 line-clamp-2 text-base font-black leading-tight text-[var(--color-text-primary)]">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--color-text-secondary)]">
                      {getArticleSnippet(article)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/74 p-5 text-sm text-[var(--color-text-secondary)]">
              No published stories yet. Once news starts flowing, this rail becomes the second proof-of-activity block on the homepage.
            </div>
          )}

          {displayEvents.length > 0 ? (
            <div className="mt-5 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/68 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                <CalendarDays className="h-4 w-4" />
                Next on the Calendar
              </div>

              <div className="mt-3 space-y-2.5">
                {displayEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/${leagueSlug}/events`}
                    className="flex items-start justify-between gap-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)]/82 px-3.5 py-3 transition-colors duration-200 hover:border-[var(--league-primary)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{event.title}</p>
                      <p className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        {event.location || event.event_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">{formatEventDate(event.start_time)}</p>
                      {formatEventTime(event.start_time) ? (
                        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                          {formatEventTime(event.start_time)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

export default HomepageEditorialRow;
