import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/lib/types';

interface GameRecapSectionProps {
  recap: NewsArticle;
  leagueSlug: string;
}

export function GameRecapSection({ recap, leagueSlug }: GameRecapSectionProps) {
  // Split content into paragraphs for rendering
  const paragraphs = (recap.content || '')
    .split(/\n\n+/)
    .filter(p => p.trim())
    .slice(0, 4); // Show first 4 paragraphs as preview

  const formattedDate = recap.published_at
    ? new Date(recap.published_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="container mx-auto px-4 pt-8">
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--league-primary)]" />
            <h2 className="text-lg font-bold">Game Recap</h2>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500 border border-emerald-500/20">
              AI Generated
            </span>
          </div>
          {formattedDate && (
            <span className="text-xs text-[var(--color-text-muted)]">{formattedDate}</span>
          )}
        </div>

        <div className="p-5 md:p-6">
          {/* Article title */}
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
            {recap.title}
          </h3>

          {/* Article content preview */}
          <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {paragraphs.map((paragraph, i) => {
              // Basic markdown bold handling
              const parts = paragraph.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={i}>
                  {parts.map((part, j) =>
                    j % 2 === 1 ? (
                      <strong key={j} className="font-semibold text-[var(--color-text-primary)]">
                        {part}
                      </strong>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </p>
              );
            })}
          </div>

          {/* Read full article link */}
          <Link
            href={`/${leagueSlug}/news/${recap.slug || recap.id}`}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--league-primary)] hover:underline"
          >
            Read Full Recap
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
