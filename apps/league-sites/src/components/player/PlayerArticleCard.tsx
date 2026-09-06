import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';
import { LeagueNewsFallbackArtwork } from '@/components/news/LeagueNewsFallbackArtwork';
import { stripMarkdownLinks } from '@/lib/news/rich-text';

interface PlayerArticleCardProps {
  article: NewsArticle;
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl?: string | null;
}

export function PlayerArticleCard({
  article,
  leagueSlug,
  leagueName,
  leagueLogoUrl,
}: PlayerArticleCardProps) {
  const formattedDate = new Date(article.published_at || article.created_at).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  const typeBadge = article.type === 'game_recap'
    ? { label: 'Game Recap', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
    : article.type === 'weekly_wrap'
    ? { label: 'Weekly Wrap', className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' }
    : { label: 'News', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };

  return (
    <Link
      href={`/${leagueSlug}/news/${article.slug || article.id}`}
      className="glass-card group flex items-start gap-4 rounded-2xl p-3 transition-colors hover:border-[var(--league-primary)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--league-primary)]"
    >
      <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-2xl sm:block">
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${typeBadge.className}`}>
            {typeBadge.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
        </div>
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)] transition-colors line-clamp-1">
          {article.title}
        </h4>
        {article.excerpt && (
          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mt-0.5">
            {stripMarkdownLinks(article.excerpt)}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-1 transition-transform group-hover:translate-x-1 group-hover:text-[var(--league-primary)]" />
    </Link>
  );
}
