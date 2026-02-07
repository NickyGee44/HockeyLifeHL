'use client';

import { useEffect, useRef, useState } from 'react';
import type { LeagueSponsor } from '@/lib/types';

interface SponsorBannerProps {
  sponsors: LeagueSponsor[];
}

function getSponsorSize(tier: string): string {
  switch (tier) {
    case 'premier':
      return 'h-16 max-w-[200px]';
    case 'gold':
      return 'h-12 max-w-[160px]';
    case 'silver':
      return 'h-10 max-w-[140px]';
    case 'bronze':
      return 'h-8 max-w-[120px]';
    default:
      return 'h-10 max-w-[140px]';
  }
}

export function SponsorBanner({ sponsors }: SponsorBannerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Filter only sponsors with logos for the banner
  const sponsorsWithLogos = sponsors.filter((s) => s.logo_url);

  useEffect(() => {
    if (sponsorsWithLogos.length === 0 || isPaused) return;

    const container = scrollRef.current;
    if (!container) return;

    let animationId: number;
    let scrollPos = 0;

    function animate() {
      if (!container) return;
      scrollPos += 0.5;
      if (scrollPos >= container.scrollWidth / 2) {
        scrollPos = 0;
      }
      container.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [sponsorsWithLogos.length, isPaused]);

  if (sponsorsWithLogos.length === 0) return null;

  // Duplicate sponsors for seamless scrolling
  const displaySponsors = [...sponsorsWithLogos, ...sponsorsWithLogos];

  return (
    <div
      className="w-full overflow-hidden bg-[var(--color-surface)] border-y border-[var(--color-border)] py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-8 overflow-hidden whitespace-nowrap"
      >
        {displaySponsors.map((sponsor, index) => (
          <a
            key={`${sponsor.id}-${index}`}
            href={sponsor.website_url || '#'}
            target={sponsor.website_url ? '_blank' : undefined}
            rel={sponsor.website_url ? 'noopener noreferrer' : undefined}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity duration-300"
            title={sponsor.name}
          >
            <img
              src={sponsor.logo_url!}
              alt={sponsor.name}
              className={`${getSponsorSize(sponsor.tier || 'silver')} object-contain`}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
