import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';
import { LeagueNewsFallbackArtwork } from './LeagueNewsFallbackArtwork';
import { stripMarkdownLinks } from '@/lib/news/rich-text';
import { EditorialHeroImage } from './EditorialHeroImage';

interface FeaturedNewsBannerProps {
  articles: NewsArticle[];
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl?: string | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getArticleTypeLabel(type: string) {
  if (type === 'game_recap') return 'Recap';
  if (type === 'weekly_wrap') return 'Weekly Wrap';
  return 'News';
}

export function FeaturedNewsBanner({
  articles,
  leagueSlug,
  leagueName,
  leagueLogoUrl,
}: FeaturedNewsBannerProps) {
  if (articles.length === 0) return null;

  const [featured, ...rest] = articles;
  const sideArticles = rest.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.24fr)_minmax(300px,0.9fr)]">
      <Link
        href={`/${leagueSlug}/news/${featured.slug || featured.id}`}
        className="group glass-card relative overflow-hidden rounded-[28px] shadow-[0_28px_70px_-42px_rgba(15,23,42,0.55)]"
      >
        <div className="relative aspect-[16/7.1] min-h-[240px] overflow-hidden">
          {featured.image_url ? (
            <EditorialHeroImage
              src={featured.image_url}
              alt={featured.title}
              foregroundClassName="object-contain object-right transition-transform duration-500 group-hover:translate-x-1"
              backgroundClassName="object-cover opacity-24 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <LeagueNewsFallbackArtwork
              leagueName={leagueName}
              leagueLogoUrl={leagueLogoUrl}
              articleType={featured.type}
              emphasis="hero"
            />
          )}
          <div className={`absolute inset-0 ${featured.image_url ? 'bg-gradient-to-t from-black/88 via-black/28 to-transparent' : 'bg-gradient-to-t from-slate-950/82 via-slate-950/24 to-transparent'}`} />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
            <span className="mb-3 inline-block rounded-full bg-[var(--league-primary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-text)]">
              Featured Story
            </span>
            <h3 className="max-w-2xl text-xl font-black leading-tight text-white line-clamp-2 md:text-[1.8rem]">
              {featured.title}
            </h3>
            {featured.excerpt && (
              <p className="mt-2 max-w-xl text-sm text-white/80 line-clamp-2">
                {stripMarkdownLinks(featured.excerpt)}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/65">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={featured.created_at}>{formatDate(featured.created_at)}</time>
              {featured.author && (
                <>
                  <span className="mx-1">by</span>
                  <span className="font-medium text-white/78">{featured.author.full_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>

      {sideArticles.length > 0 && (
        <div className="flex flex-col gap-4">
          {sideArticles.map((article) => (
            <Link
              key={article.id}
              href={`/${leagueSlug}/news/${article.slug || article.id}`}
              className="group glass-card flex min-h-[96px] gap-4 overflow-hidden rounded-[24px] p-4 transition-colors hover:border-[var(--league-primary)]/40"
            >
              <div className="hidden w-24 shrink-0 overflow-hidden rounded-2xl sm:block">
                {article.image_url ? (
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                    {getArticleTypeLabel(article.type)}
                  </p>
                  <h4 className="mt-1 font-bold text-[var(--color-text-primary)] line-clamp-2 transition-colors group-hover:text-[var(--league-primary)]">
                    {article.title}
                  </h4>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <Calendar className="h-3 w-3" />
                  <time dateTime={article.created_at}>{formatDate(article.created_at)}</time>
                </div>
              </div>
              <ChevronRight className="hidden h-5 w-5 shrink-0 self-center text-[var(--color-text-muted)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--league-primary)] sm:block" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
