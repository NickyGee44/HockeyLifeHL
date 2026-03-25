'use client';

import { useMemo, useState, useEffect } from 'react';
import type { LeagueSponsor } from '@/lib/types';
import { DEFAULT_BLH_SPONSOR } from '@/lib/constants';

interface SponsorFooterStripProps {
  sponsors: LeagueSponsor[];
}

function getSponsorSize(tier: string | null): string {
  switch (tier) {
    case 'premier':
      return 'h-14 md:h-16 max-w-[220px]';
    case 'gold':
      return 'h-12 md:h-14 max-w-[200px]';
    case 'silver':
      return 'h-10 md:h-12 max-w-[170px]';
    case 'bronze':
      return 'h-8 md:h-10 max-w-[150px]';
    default:
      return 'h-10 md:h-12 max-w-[170px]';
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function SponsorFooterStrip({ sponsors }: SponsorFooterStripProps) {
  // Hydration-safe: render in stable order on server, shuffle only after mount
  const stableSponsors = useMemo(() => {
    const withLogos = sponsors.filter((s) => s.logo_url);
    const featuredTiers = withLogos.filter((s) => s.tier === 'premier' || s.tier === 'gold');
    const selectedSponsors = featuredTiers.length > 0 ? featuredTiers : withLogos;
    return selectedSponsors.length === 0 ? [DEFAULT_BLH_SPONSOR] : selectedSponsors;
  }, [sponsors]);

  const [displaySponsors, setDisplaySponsors] = useState(stableSponsors);
  useEffect(() => {
    queueMicrotask(() => setDisplaySponsors(shuffleArray(stableSponsors)));
  }, [stableSponsors]);

  const isDefaultOnly = displaySponsors.length === 1 && displaySponsors[0].id === 'blh-default';
  const hasPremierTier = displaySponsors.some((sponsor) => sponsor.tier === 'premier');
  const title = isDefaultOnly
    ? 'Powered by'
    : hasPremierTier
      ? 'Premier Partners'
      : 'Featured Sponsors';

  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="container mx-auto px-4 py-8">
        <h3 className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
          {title}
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {displaySponsors.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.website_url || '#'}
              target={sponsor.website_url ? '_blank' : undefined}
              rel={sponsor.website_url ? 'noopener noreferrer' : undefined}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300"
              title={sponsor.name}
            >
              <img
                src={sponsor.logo_url!}
                alt={sponsor.name}
                className={`${getSponsorSize(sponsor.tier)} object-contain`}
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
