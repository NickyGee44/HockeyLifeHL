'use client';

import type { LeagueSponsor } from '@/lib/types';

interface SponsorBannerProps {
  sponsors: LeagueSponsor[];
}

function getSponsorSize(tier: string): string {
  switch (tier) {
    case 'premier':
      return 'h-20 md:h-24 max-w-[280px]';
    case 'gold':
      return 'h-16 md:h-20 max-w-[240px]';
    case 'silver':
      return 'h-14 md:h-16 max-w-[200px]';
    case 'bronze':
      return 'h-12 md:h-14 max-w-[180px]';
    default:
      return 'h-14 md:h-16 max-w-[200px]';
  }
}

export function SponsorBanner({ sponsors }: SponsorBannerProps) {
  const sponsorsWithLogos = sponsors.filter((s) => s.logo_url);

  if (sponsorsWithLogos.length === 0) return null;

  // Repeat sponsors enough times to guarantee the strip fills >2x screen width
  const repeatCount = Math.max(4, Math.ceil(12 / sponsorsWithLogos.length));
  const repeatedSponsors: LeagueSponsor[] = [];
  for (let i = 0; i < repeatCount; i++) {
    repeatedSponsors.push(...sponsorsWithLogos);
  }

  return (
    <div
      className="w-full overflow-hidden bg-[var(--color-surface)] border-y border-[var(--color-border)] py-6"
    >
      <div className="sponsor-marquee-track flex items-center gap-16 md:gap-24 w-max">
        {/* First copy */}
        <div className="flex items-center gap-16 md:gap-24 shrink-0">
          {repeatedSponsors.map((sponsor, index) => (
            <a
              key={`a-${sponsor.id}-${index}`}
              href={sponsor.website_url || '#'}
              target={sponsor.website_url ? '_blank' : undefined}
              rel={sponsor.website_url ? 'noopener noreferrer' : undefined}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300"
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
        {/* Duplicate for seamless loop */}
        <div className="flex items-center gap-16 md:gap-24 shrink-0" aria-hidden>
          {repeatedSponsors.map((sponsor, index) => (
            <a
              key={`b-${sponsor.id}-${index}`}
              href={sponsor.website_url || '#'}
              target={sponsor.website_url ? '_blank' : undefined}
              rel={sponsor.website_url ? 'noopener noreferrer' : undefined}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-300"
              title={sponsor.name}
              tabIndex={-1}
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
    </div>
  );
}
