'use client';

import { useRouter } from 'next/navigation';
import type { Season } from '@/lib/types';

interface SeasonSelectorProps {
  seasons: Season[];
  currentSeasonId?: string;
  leagueSlug: string;
  playerId: string;
}

export function SeasonSelector({
  seasons,
  currentSeasonId,
  leagueSlug,
  playerId,
}: SeasonSelectorProps) {
  const router = useRouter();

  const handleSeasonChange = (seasonId: string) => {
    if (seasonId === 'all') {
      router.push(`/${leagueSlug}/players/${playerId}?season=all`);
    } else {
      router.push(`/${leagueSlug}/players/${playerId}?season=${seasonId}`);
    }
  };

  if (seasons.length === 0) {
    return null;
  }

  return (
    <div className="glass-control rounded-xl">
      <select
        value={currentSeasonId || 'all'}
        onChange={(e) => handleSeasonChange(e.target.value)}
        className="
          min-h-11 px-4 py-2 rounded-xl
          border border-[var(--color-border)]
          text-[var(--color-text-primary)] text-sm
          focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50
          cursor-pointer transition-all duration-200
          hover:border-[var(--league-primary)]/50
        "
      >
        <option value="all">Career Stats</option>
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
    </div>
  );
}
