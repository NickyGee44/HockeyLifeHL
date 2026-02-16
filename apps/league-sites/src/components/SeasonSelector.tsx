'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Season } from '@/lib/types';

interface SeasonSelectorProps {
  seasons: Season[];
  currentSeasonId: string | null;
  leagueSlug: string;
  basePath: string;
}

export function SeasonSelector({ seasons, currentSeasonId, leagueSlug, basePath }: SeasonSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (seasons.length <= 1) return null;

  function handleChange(seasonId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (seasonId) {
      params.set('season', seasonId);
    } else {
      params.delete('season');
    }
    const qs = params.toString();
    router.push(`/${leagueSlug}/${basePath}${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="flex-1 min-w-0 max-w-xs">
      <label htmlFor="season-selector" className="sr-only">Season</label>
      <select
        id="season-selector"
        value={currentSeasonId || ''}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-transparent transition-all cursor-pointer appearance-none"
      >
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}{season.status === 'active' ? ' (Current)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
