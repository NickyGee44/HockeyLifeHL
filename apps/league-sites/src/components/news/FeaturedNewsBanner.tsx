import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';

interface FeaturedNewsBannerProps {
  articles: NewsArticle[];
  leagueSlug: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FeaturedNewsBanner({ articles, leagueSlug }: FeaturedNewsBannerProps) {
  if (articles.length === 0) return null;

  const [featured, ...rest] = articles;
  const sideArticles = rest.slice(0, 2);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
      {/* Featured Article - Large Card */}
      <Link
        href={`/${leagueSlug}/news/${featured.slug || featured.id}`}
        className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        {featured.image_url ? (
          <div className="relative aspect-[16/9] overflow-hidden">
            <img
              src={featured.image_url}
              alt={featured.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <span className="mb-2 inline-block rounded-full bg-[var(--league-primary)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-text)]">
                Featured
              </span>
              <h3 className="text-xl font-bold text-white line-clamp-2 md:text-2xl">
                {featured.title}
              </h3>
              {featured.excerpt && (
                <p className="mt-2 text-sm text-white/70 line-clamp-2">
                  {featured.excerpt}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
                <Calendar className="h-3.5 w-3.5" />
                <time dateTime={featured.created_at}>{formatDate(featured.created_at)}</time>
                {featured.author && (
                  <>
                    <span className="mx-1">by</span>
                    <span className="font-medium text-white/70">{featured.author.full_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative aspect-[16/9] bg-gradient-to-br from-[var(--league-primary)]/15 to-[var(--league-primary)]/5">
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <span className="mb-2 inline-block rounded-full bg-[var(--league-primary)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-text)]">
                Featured
              </span>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] line-clamp-2 md:text-2xl">
                {featured.title}
              </h3>
              {featured.excerpt && (
                <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                  {featured.excerpt}
                </p>
              )}
            </div>
          </div>
        )}
      </Link>

      {/* Side Articles - Stacked */}
      {sideArticles.length > 0 && (
        <div className="flex flex-col gap-4">
          {sideArticles.map((article) => (
            <Link
              key={article.id}
              href={`/${leagueSlug}/news/${article.slug || article.id}`}
              className="group flex flex-1 gap-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--league-primary)]/40"
            >
              {article.image_url ? (
                <div className="hidden h-full w-24 shrink-0 overflow-hidden rounded-xl sm:block">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="hidden h-full w-24 shrink-0 items-center justify-center rounded-xl bg-[var(--league-primary)]/10 sm:flex">
                  <span className="text-2xl font-bold text-[var(--league-primary)]">
                    {article.title.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <h4 className="font-bold text-[var(--color-text-primary)] line-clamp-2 group-hover:text-[var(--league-primary)] transition-colors">
                  {article.title}
                </h4>
                {article.excerpt && (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                    {article.excerpt}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
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
