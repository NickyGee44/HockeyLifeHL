'use client';

import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';

interface NewsCardProps {
  article: NewsArticle;
  leagueSlug: string;
}

export function NewsCard({ article, leagueSlug }: NewsCardProps) {
  const formattedDate = new Date(article.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      href={`/${leagueSlug}/news/${article.slug || article.id}`}
      className="card group block overflow-hidden"
    >
      {/* Image */}
      {article.image_url ? (
        <div className="relative aspect-[16/9] overflow-hidden">
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
            {article.type === 'game_recap' ? 'Game Recap' :
             article.type === 'weekly_wrap' ? 'Weekly Wrap' :
             'News'}
          </div>
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-[var(--league-primary)]/10 to-[var(--league-primary)]/5 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[var(--league-primary)]/10 flex items-center justify-center">
            <span className="text-3xl font-bold text-[var(--league-primary)]">
              {article.title.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)] transition-colors line-clamp-2 mb-2">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 mb-3">
            {article.excerpt}
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
