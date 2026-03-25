'use client';

import type { LeagueSponsor } from '@/lib/types';
import { DEFAULT_BLH_SPONSOR } from '@/lib/constants';

interface SponsorBannerProps {
  sponsors: LeagueSponsor[];
  eyebrow?: string;
  title?: string;
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

export function SponsorBanner({
  sponsors,
  eyebrow = 'League Partners',
  title = 'All sponsors across the league',
}: SponsorBannerProps) {
  const sponsorsWithLogos = sponsors.filter((s) => s.logo_url);

  // Fall back to BLH default sponsor if none have logos
  if (sponsorsWithLogos.length === 0) {
    sponsorsWithLogos.push(DEFAULT_BLH_SPONSOR);
  }

  // Repeat sponsors enough times to guarantee the strip fills >2x screen width
  const repeatCount = Math.max(4, Math.ceil(12 / sponsorsWithLogos.length));
  const repeatedSponsors: LeagueSponsor[] = [];
  for (let i = 0; i < repeatCount; i++) {
    repeatedSponsors.push(...sponsorsWithLogos);
  }

  return (
    <section className="w-full overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-6 xl:px-8">
        <div className="flex flex-col gap-1 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
            {eyebrow}
          </p>
          <h2 className="text-lg font-black tracking-tight text-[var(--color-text-primary)]">
            {title}
          </h2>
        </div>
      </div>
      <div className="relative overflow-hidden py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-20 bg-[linear-gradient(90deg,var(--color-surface)_0%,transparent_100%)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-20 bg-[linear-gradient(270deg,var(--color-surface)_0%,transparent_100%)]" />
        <div className="sponsor-marquee-track flex w-max items-center gap-16 md:gap-24">
          <div className="flex shrink-0 items-center gap-16 md:gap-24">
          {repeatedSponsors.map((sponsor, index) => (
            <a
              key={`a-${sponsor.id}-${index}`}
              href={sponsor.website_url || '#'}
              target={sponsor.website_url ? '_blank' : undefined}
              rel={sponsor.website_url ? 'noopener noreferrer' : undefined}
              className="shrink-0 opacity-60 transition-opacity duration-300 hover:opacity-100"
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
          <div className="flex shrink-0 items-center gap-16 md:gap-24" aria-hidden>
          {repeatedSponsors.map((sponsor, index) => (
            <a
              key={`b-${sponsor.id}-${index}`}
              href={sponsor.website_url || '#'}
              target={sponsor.website_url ? '_blank' : undefined}
              rel={sponsor.website_url ? 'noopener noreferrer' : undefined}
              className="shrink-0 opacity-60 transition-opacity duration-300 hover:opacity-100"
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
    </section>
  );
}
