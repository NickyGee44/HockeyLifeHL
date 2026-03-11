'use client';

import { Info } from 'lucide-react';

interface RatingsHelpTooltipProps {
  label: string;
  description: string;
}

export function RatingsHelpTooltip({ label, description }: RatingsHelpTooltipProps) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label={`${label}: ${description}`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rink-500"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden w-64 -translate-y-1/2 rounded-lg border border-white/10 bg-neutral-950/95 px-3 py-2 text-left text-xs leading-5 text-neutral-200 shadow-2xl group-hover:block group-focus-within:block">
        <span className="mb-1 block font-semibold text-white">{label}</span>
        {description}
      </span>
    </span>
  );
}
