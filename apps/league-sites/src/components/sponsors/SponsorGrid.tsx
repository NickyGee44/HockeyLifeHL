import type { LeagueSponsor } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

interface SponsorGridProps {
  sponsors: LeagueSponsor[];
}

const TIER_ORDER = ['premier', 'gold', 'silver', 'bronze'];
const TIER_LABELS: Record<string, string> = {
  premier: 'Premier Partners',
  gold: 'Gold Sponsors',
  silver: 'Silver Sponsors',
  bronze: 'Bronze Sponsors',
};

export function SponsorGrid({ sponsors }: SponsorGridProps) {
  // Group by tier
  const groupedSponsors = new Map<string, LeagueSponsor[]>();
  TIER_ORDER.forEach((tier) => {
    const tierSponsors = sponsors.filter((s) => s.tier === tier);
    if (tierSponsors.length > 0) {
      groupedSponsors.set(tier, tierSponsors);
    }
  });

  // Any sponsors with unrecognized tiers
  const otherSponsors = sponsors.filter((s) => !TIER_ORDER.includes(s.tier || ''));
  if (otherSponsors.length > 0) {
    groupedSponsors.set('other', otherSponsors);
  }

  if (sponsors.length === 0) return null;

  return (
    <div className="space-y-10">
      {Array.from(groupedSponsors.entries()).map(([tier, tierSponsors]) => (
        <div key={tier}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--league-primary)] mb-4">
            {TIER_LABELS[tier] || 'Sponsors'}
          </h3>

          <div
            className={`grid gap-4 ${
              tier === 'premier'
                ? 'grid-cols-1 md:grid-cols-2'
                : tier === 'gold'
                ? 'grid-cols-2 md:grid-cols-3'
                : 'grid-cols-2 md:grid-cols-4'
            }`}
          >
            {tierSponsors.map((sponsor) => (
              <SponsorCard key={sponsor.id} sponsor={sponsor} tier={tier} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SponsorCard({ sponsor, tier }: { sponsor: LeagueSponsor; tier: string }) {
  const isPremier = tier === 'premier';

  const content = (
    <div
      className={`
        glass-card rounded-xl
        ${isPremier ? 'p-6' : 'p-4'}
        flex flex-col items-center text-center group
      `}
    >
      {sponsor.logo_url ? (
        <div className={`${isPremier ? 'h-24 mb-4' : 'h-14 mb-3'} flex items-center justify-center`}>
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className={`${isPremier ? 'max-h-24' : 'max-h-14'} max-w-full object-contain group-hover:scale-105 transition-transform`}
          />
        </div>
      ) : (
        <div className={`${isPremier ? 'w-24 h-24 mb-4' : 'w-14 h-14 mb-3'} rounded-full bg-[var(--league-primary)]/10 flex items-center justify-center`}>
          <span className={`${isPremier ? 'text-3xl' : 'text-xl'} font-bold text-[var(--league-primary)]`}>
            {sponsor.name.charAt(0)}
          </span>
        </div>
      )}

      <h4 className={`font-semibold text-[var(--color-text-primary)] ${isPremier ? 'text-lg' : 'text-sm'}`}>
        {sponsor.name}
      </h4>

      {isPremier && sponsor.description && (
        <p className="text-sm text-[var(--color-text-secondary)] mt-2 line-clamp-3">
          {sponsor.description}
        </p>
      )}

      {sponsor.website_url && (
        <div className="flex items-center gap-1 mt-2 text-xs text-[var(--color-text-muted)] group-hover:text-[var(--league-primary)] transition-colors">
          <ExternalLink className="w-3 h-3" />
          <span>Visit Website</span>
        </div>
      )}
    </div>
  );

  if (sponsor.website_url) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
}
