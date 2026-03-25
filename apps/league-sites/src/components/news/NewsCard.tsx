'use client';

import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';
import { LeagueNewsFallbackArtwork } from './LeagueNewsFallbackArtwork';
import { stripMarkdownLinks } from '@/lib/news/rich-text';

interface NewsCardProps {
  article: NewsArticle;
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl?: string | null;
}

function getArticleTypeLabel(type: string) {
  if (type === 'game_recap') return 'Game Recap';
  if (type === 'weekly_wrap') return 'Weekly Wrap';
  return 'News';
}

export function NewsCard({ article, leagueSlug, leagueName, leagueLogoUrl }: NewsCardProps) {
  const formattedDate = new Date(article.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const safeExcerpt = stripMarkdownLinks(article.excerpt);

  return (
    <Link
      href={`/${leagueSlug}/news/${article.slug || article.id}`}
      className="group block overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]/96 shadow-[0_22px_54px_-34px_rgba(15,23,42,0.42)] transition-colors hover:border-[var(--league-primary)]/35"
    >
      {/* Image */}
      {article.image_url ? (
        <div className="relative aspect-[16/9.5] overflow-hidden">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white backdrop-blur-sm ${
            article.type === 'game_recap' ? 'bg-emerald-600/70' :
            article.type === 'weekly_wrap' ? 'bg-purple-600/70' :
            'bg-black/50'
          }`}>
            {getArticleTypeLabel(article.type)}
          </div>
        </div>
      ) : (
        <div className="relative aspect-[16/9.5] overflow-hidden">
          <LeagueNewsFallbackArtwork
            leagueName={leagueName}
            leagueLogoUrl={leagueLogoUrl}
            articleType={article.type}
            emphasis="card"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
          {getArticleTypeLabel(article.type)}
        </p>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)] transition-colors line-clamp-2 mb-2">
          {article.title}
        </h3>

        {safeExcerpt && (
          <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 mb-3">
            {safeExcerpt}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Calendar className="w-3.5 h-3.5" />
          <time dateTime={article.created_at}>{formattedDate}</time>
          {article.author && (
            <>
              <span className="mx-1">by</span>
              <span className="font-medium text-[var(--color-text-secondary)]">
                {article.author.full_name}
              </span>
            </>
          )}
        </div>

        <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--league-primary)]">
          Read Story
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
