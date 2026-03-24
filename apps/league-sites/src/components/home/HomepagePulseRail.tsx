import Link from 'next/link';
import { CalendarDays, Camera, ChevronRight, Clock3, Newspaper, Sparkles } from 'lucide-react';
import { SocialLinks } from '@/components/SocialLinks';
import { LeagueNewsFallbackArtwork } from '@/components/news/LeagueNewsFallbackArtwork';
import type { LeagueEvent, NewsArticle, WebsiteSettings } from '@/lib/types';

export interface HomepageCountdownCard {
  eyebrow: string;
  title: string;
  targetDate: string;
  href: string;
  cta: string;
}

export interface HomepagePhotoHighlight {
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  href: string;
  cta: string;
}

interface HomepagePulseRailProps {
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl?: string | null;
  articles: NewsArticle[];
  events: LeagueEvent[];
  socialSettings?: WebsiteSettings | null;
  countdown: HomepageCountdownCard | null;
  photoHighlight: HomepagePhotoHighlight | null;
}

function formatHeadlineDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getArticleTypeLabel(article: NewsArticle) {
  if (article.type === 'game_recap') return 'Recap';
  if (article.type === 'weekly_wrap') return 'Weekly';
  return 'News';
}

function getCountdownParts(targetDate: string) {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();

  if (Number.isNaN(target.getTime()) || diffMs <= 0) {
    return {
      primaryValue: 'Now',
      primaryLabel: 'Live',
      secondaryValue: '0',
      secondaryLabel: 'Hours',
      summary: 'Happening now',
      targetLabel: null as string | null,
    };
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const summary = days > 0 ? `${days} day${days === 1 ? '' : 's'} to go` : `${totalHours} hours to go`;

  return {
    primaryValue: String(days),
    primaryLabel: 'Days',
    secondaryValue: String(hours),
    secondaryLabel: 'Hours',
    summary,
    targetLabel: target.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

function buildCalendarMonth(events: LeagueEvent[]) {
  const now = new Date();
  const nextEvent = events.find((event) => new Date(event.start_time) >= now);
  const baseDate = nextEvent ? new Date(nextEvent.start_time) : now;
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const startPad = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const today = now.getDate();
  const isCurrentMonth =
    now.getFullYear() === monthStart.getFullYear() && now.getMonth() === monthStart.getMonth();

  const eventsByDay = new Map<number, LeagueEvent[]>();
  for (const event of events) {
    const eventDate = new Date(event.start_time);
    if (
      eventDate.getFullYear() === monthStart.getFullYear() &&
      eventDate.getMonth() === monthStart.getMonth()
    ) {
      const day = eventDate.getDate();
      const existing = eventsByDay.get(day) || [];
      existing.push(event);
      eventsByDay.set(day, existing);
    }
  }

  const cells: Array<{ day: number | null; events: LeagueEvent[]; isToday: boolean }> = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push({ day: null, events: [], isToday: false });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({
      day,
      events: eventsByDay.get(day) || [],
      isToday: isCurrentMonth && day === today,
    });
  }

  return {
    monthLabel: monthStart.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    cells,
  };
}

export function HomepagePulseRail({
  leagueSlug,
  leagueName,
  leagueLogoUrl,
  articles,
  events,
  socialSettings,
  countdown,
  photoHighlight,
}: HomepagePulseRailProps) {
  const { monthLabel, cells } = buildCalendarMonth(events);
  const nextEvents = events
    .filter((event) => new Date(event.start_time) >= new Date())
    .slice(0, 2);
  const socialOnly = !photoHighlight && socialSettings;
  const countdownParts = countdown ? getCountdownParts(countdown.targetDate) : null;

  return (
    <div className="flex h-full flex-col gap-4">
      {countdown && countdownParts && (
        <section className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                {countdown.eyebrow}
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
                {countdown.title}
              </h3>
            </div>
            <div className="rounded-2xl bg-[var(--league-primary)]/12 p-2.5 text-[var(--league-primary)]">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/75 p-4 text-center">
              <p className="text-3xl font-black leading-none text-[var(--color-text-primary)]">
                {countdownParts.primaryValue}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {countdownParts.primaryLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/75 p-4 text-center">
              <p className="text-3xl font-black leading-none text-[var(--color-text-primary)]">
                {countdownParts.secondaryValue}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                {countdownParts.secondaryLabel}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{countdownParts.summary}</p>
              {countdownParts.targetLabel && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{countdownParts.targetLabel}</p>
              )}
            </div>
            <Link
              href={countdown.href}
              className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-all duration-200 hover:border-[var(--league-primary)] hover:text-[var(--league-primary)]"
            >
              {countdown.cta}
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      )}

      <section className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
              Upcoming Dates
            </p>
            <h3 className="mt-1 text-lg font-black text-[var(--color-text-primary)]">Pulse Calendar</h3>
          </div>
          <div className="rounded-2xl bg-[var(--league-primary)]/12 p-2.5 text-[var(--league-primary)]">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{monthLabel}</p>
            <Link
              href={`/${leagueSlug}/events`}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--league-primary)]"
            >
              All Events
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span key={`${monthLabel}-${day}-${index}`}>{day}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {cells.map((cell, index) => (
              <div
                key={`${monthLabel}-${cell.day ?? 'blank'}-${index}`}
                className={`min-h-[42px] rounded-2xl border px-1 py-1.5 ${
                  cell.day
                    ? cell.isToday
                      ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/12'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)]/80'
                    : 'border-transparent bg-transparent'
                }`}
              >
                {cell.day ? (
                  <div className="flex h-full flex-col items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{cell.day}</span>
                    <div className="flex min-h-[8px] items-center justify-center gap-1">
                      {cell.events.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="h-1.5 w-1.5 rounded-full bg-[var(--league-primary)]"
                          title={event.title}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {nextEvents.length > 0 && (
          <div className="mt-4 space-y-2">
            {nextEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{event.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {new Date(event.start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    |{' '}
                    {new Date(event.start_time).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--league-primary)]/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--league-primary)]">
                  {event.event_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
              Around The League
            </p>
            <h3 className="mt-1 text-lg font-black text-[var(--color-text-primary)]">Fresh Headlines</h3>
          </div>
          <div className="rounded-2xl bg-[var(--league-primary)]/12 p-2.5 text-[var(--league-primary)]">
            <Newspaper className="h-5 w-5" />
          </div>
        </div>

        {articles.length > 0 ? (
          <div className="mt-4 space-y-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/${leagueSlug}/news/${article.slug || article.id}`}
                className="group flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/65 p-3 transition-all duration-200 hover:border-[var(--league-primary)]/45 hover:bg-[var(--color-surface)]"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[var(--league-primary)]/12">
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
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                    {getArticleTypeLabel(article)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="line-clamp-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors duration-200 group-hover:text-[var(--league-primary)]">
                    {article.title}
                  </h4>
                  {article.excerpt && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      {formatHeadlineDate(article.published_at || article.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--league-primary)]">
                      Read
                      <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">No fresh stories yet</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Publish news or recaps and this rail becomes your live homepage feed.
            </p>
          </div>
        )}
      </section>

      {photoHighlight ? (
        <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="relative aspect-[5/4]">
            {photoHighlight.imageUrl ? (
              <img
                src={photoHighlight.imageUrl}
                alt={photoHighlight.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--league-primary)_26%,transparent),transparent_62%),linear-gradient(145deg,color-mix(in_srgb,var(--league-primary)_18%,transparent),var(--color-surface))]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.72)_72%,rgba(0,0,0,0.9)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                <Camera className="h-3.5 w-3.5" />
                {photoHighlight.eyebrow}
              </div>
              <h3 className="mt-3 text-2xl font-black leading-tight text-white">{photoHighlight.title}</h3>
              <p className="mt-2 text-sm text-white/75">{photoHighlight.subtitle}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={photoHighlight.href}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-900 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {photoHighlight.cta}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                {socialSettings && (
                  <div className="rounded-full border border-white/15 bg-black/25 px-2 py-1 backdrop-blur-sm">
                    <SocialLinks settings={socialSettings} size="sm" className="justify-center" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : socialOnly ? (
        <section className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                Community Feed
              </p>
              <h3 className="mt-1 text-lg font-black text-[var(--color-text-primary)]">Follow The League</h3>
            </div>
            <div className="rounded-2xl bg-[var(--league-primary)]/12 p-2.5 text-[var(--league-primary)]">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            Keep the site feeling current between games with social updates, photos, and quick reactions.
          </p>
          <div className="mt-4">
            <SocialLinks settings={socialSettings} size="lg" />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default HomepagePulseRail;
