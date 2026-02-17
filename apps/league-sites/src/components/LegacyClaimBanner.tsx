'use client';

import { useState } from 'react';
import { History, X, ExternalLink } from 'lucide-react';

interface LegacyClaimBannerProps {
  leagueBuilderUrl?: string;
}

export function LegacyClaimBanner({
  leagueBuilderUrl = 'https://beerleaguehockey.ca',
}: LegacyClaimBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--league-primary)]/30 bg-[var(--league-primary)]/5 px-5 py-4 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--league-primary)]/15">
          <History className="h-4.5 w-4.5 text-[var(--league-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--league-primary)]">
              Player History Found
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            We found player history that may be yours. Claim it to see your
            career stats.
          </p>
          <a
            href={`${leagueBuilderUrl}/claim-history`}
            className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-[var(--league-primary)] hover:underline"
          >
            View matches
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
