'use client';

import { useMemo, useState } from 'react';
import type { NewsArticle } from '@/lib/types';
import { NewsList } from './NewsList';

type FilterType = 'all' | 'news' | 'game_recap' | 'weekly_wrap';

interface NewsFeedClientProps {
  articles: NewsArticle[];
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl?: string | null;
}

const FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: 'all', label: 'All stories' },
  { key: 'game_recap', label: 'Game recaps' },
  { key: 'news', label: 'News' },
  { key: 'weekly_wrap', label: 'Weekly wraps' },
];

export function NewsFeedClient({ articles, leagueSlug, leagueName, leagueLogoUrl }: NewsFeedClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredArticles = useMemo(() => {
    if (activeFilter === 'all') return articles;
    return articles.filter((article) => article.type === activeFilter);
  }, [activeFilter, articles]);

  const filterCounts = useMemo(() => ({
    all: articles.length,
    news: articles.filter((article) => article.type === 'news').length,
    game_recap: articles.filter((article) => article.type === 'game_recap').length,
    weekly_wrap: articles.filter((article) => article.type === 'weekly_wrap').length,
  }), [articles]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.filter((filter) => filterCounts[filter.key] > 0 || filter.key === 'all').map((filter) => {
          const active = filter.key === activeFilter;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'border-[var(--league-primary)] bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]/85 text-[var(--color-text-primary)] hover:border-[var(--league-primary)]/35 hover:text-[var(--league-primary)]'
              }`}
            >
              <span>{filter.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-black/15 text-current' : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]'}`}>
                {filterCounts[filter.key]}
              </span>
            </button>
          );
        })}
      </div>

      <NewsList
        articles={filteredArticles}
        leagueSlug={leagueSlug}
        leagueName={leagueName}
        leagueLogoUrl={leagueLogoUrl}
      />
    </div>
  );
}
