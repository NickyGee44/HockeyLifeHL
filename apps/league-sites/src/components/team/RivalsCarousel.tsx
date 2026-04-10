'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RivalCard {
  team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
  games_played: number;
  status: 'leading' | 'trailing' | 'level';
  recordLabel: string;
  insight: string;
}

export function RivalsCarousel({
  rivals,
  leagueSlug,
}: {
  rivals: RivalCard[];
  leagueSlug: string;
}) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % rivals.length);
  }, [rivals.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + rivals.length) % rivals.length);
  }, [rivals.length]);

  useEffect(() => {
    if (rivals.length <= 1) return;
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next, rivals.length]);

  if (rivals.length === 0) return null;

  const rival = rivals[index];
  const statusLabel = rival.status === 'leading' ? 'Edge' : rival.status === 'trailing' ? 'Chasing' : 'Even';
  const statusColor =
    rival.status === 'leading'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
      : rival.status === 'trailing'
        ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]';

  return (
    <div className="relative">
      <Link
        href={`/${leagueSlug}/teams/${rival.team.slug}`}
        className="group block glass-card overflow-hidden rounded-[24px] p-5 hover:-translate-y-0.5"
      >
        <div className="mb-5 flex flex-col items-center gap-4 text-center">
          {rival.team.logo ? (
            <Image
              src={rival.team.logo}
              alt={rival.team.name}
              width={120}
              height={120}
              className="h-[100px] w-[100px] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)] md:h-[120px] md:w-[120px]"
            />
          ) : (
            <div className="flex h-[100px] w-[100px] items-center justify-center rounded-3xl bg-[var(--league-primary)]/12 text-3xl font-black text-[var(--league-primary)] md:h-[120px] md:w-[120px]">
              {rival.team.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)]">
              {rival.team.name}
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {rival.games_played} {rival.games_played === 1 ? 'game' : 'games'} this season
              </p>
              <span
                className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusColor}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-3 rounded-[18px] border border-[var(--league-primary)]/15 bg-[var(--league-primary)]/8 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
            Head-to-head
          </p>
          <p className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">{rival.recordLabel}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Key Insight
          </p>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{rival.insight}</p>
        </div>
      </Link>

      {rivals.length > 1 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <button
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--league-primary)]"
            aria-label="Previous rival"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {rivals.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-[var(--league-primary)]' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/25 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--league-primary)]"
            aria-label="Next rival"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
