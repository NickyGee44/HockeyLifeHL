import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';
import { RichArticleContent } from '@/components/news/RichArticleContent';
import { SectionHeading } from '@/components/shared';

interface GameRecapSectionProps {
  recap: NewsArticle;
  leagueSlug: string;
}

export function GameRecapSection({ recap, leagueSlug }: GameRecapSectionProps) {
  const formattedDate = recap.published_at
    ? new Date(recap.published_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div id="recap" className="container mx-auto scroll-mt-24 px-4 pt-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SectionHeading
            title="Game Recap"
            icon={<Sparkles className="w-5 h-5 text-[var(--league-primary)]" />}
          />
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500 border border-emerald-500/20">
            AI Generated
          </span>
        </div>
        {formattedDate && (
          <span className="text-xs text-[var(--color-text-muted)]">{formattedDate}</span>
        )}
      </div>

      <div className="glass-card-strong mt-4 overflow-hidden">
        <div className="p-5 md:p-6">
          {/* Article title */}
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
            {recap.title}
          </h3>

          {/* Article content */}
          <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <RichArticleContent
              content={recap.content}
              paragraphClassName="text-sm leading-relaxed text-[var(--color-text-secondary)]"
            />
          </div>

          {/* Standalone article link */}
          <Link
            href={`/${leagueSlug}/news/${recap.slug || recap.id}`}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--league-primary)] hover:underline"
          >
            Open Standalone Story
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
