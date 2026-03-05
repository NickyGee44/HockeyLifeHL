import Link from 'next/link';
import { Newspaper, Calendar, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';
import { featureFlags } from '@/lib/config/feature-flags';

interface NewsHeadlinesProps {
  articles: NewsArticle[];
  leagueSlug: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function NewsHeadlines({ articles, leagueSlug }: NewsHeadlinesProps) {
  const showFallback = featureFlags.enableHomepageNewsFallback;

  return (
    <div className="flex h-full w-full flex-col rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_50%,transparent)] p-5 backdrop-blur-xl md:p-6 lg:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-black uppercase tracking-wide text-[var(--color-text-primary)] md:text-lg">
          <Newspaper className="h-5 w-5 text-[var(--league-primary)]" />
          <span>Around The League <span className="text-[var(--league-primary)]">NEWS</span></span>
        </h3>
        <Link
          href={`/${leagueSlug}/news`}
          className="group inline-flex items-center gap-1 text-xs font-semibold text-[var(--league-primary)]"
        >
          All News
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="flex-1">
        {articles.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/${leagueSlug}/news/${article.slug || article.id}`}
                className="group block py-3 first:pt-0 last:pb-0 transition-colors"
              >
                <h4 className="text-sm font-bold text-[var(--color-text-primary)] line-clamp-2 group-hover:text-[var(--league-primary)] transition-colors md:text-base">
                  {article.title}
                </h4>
                {article.excerpt && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2 md:text-sm">
                    {article.excerpt}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <Calendar className="h-3 w-3" />
                  <time dateTime={article.created_at}>{formatDate(article.created_at)}</time>
                  {article.author && (
                    <>
                      <span className="mx-0.5">by</span>
                      <span className="font-medium text-[var(--color-text-secondary)]">{article.author.full_name}</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : showFallback ? (
          <div className="h-full rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 px-4 py-5 text-center md:px-5 md:py-6">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">No News Yet</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)] md:text-sm">
              League updates and announcements will appear here once published.
            </p>
          </div>
        ) : null
        }
      </div>

      <Link
        href={`/${leagueSlug}/news`}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border-emphasis)] bg-[color-mix(in_srgb,var(--color-surface)_65%,transparent)] px-4 py-2 text-sm font-bold text-[var(--color-text-primary)] backdrop-blur-sm transition-all duration-200 hover:bg-[var(--color-surface-hover)] hover:border-[var(--league-primary)]"
      >
        <Newspaper className="h-4 w-4 text-[var(--league-primary)]" />
        View All News
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
