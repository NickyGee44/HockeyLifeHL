'use client';

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import type { LeagueAward } from '@/lib/types';
import { AwardCard } from './AwardCard';

interface AwardsShowcaseProps {
  awards: LeagueAward[];
}

export function AwardsShowcase({ awards }: AwardsShowcaseProps) {
  // Extract unique seasons
  const seasonMap = new Map<string, string>();
  awards.forEach((award) => {
    if (award.season_id && award.season) {
      seasonMap.set(award.season_id, award.season.name);
    }
  });
  const seasons = Array.from(seasonMap.entries());

  const [selectedSeason, setSelectedSeason] = useState<string | null>(
    seasons.length > 0 ? seasons[0][0] : null
  );

  // Filter awards by selected season
  const filteredAwards = selectedSeason
    ? awards.filter((a) => a.season_id === selectedSeason)
    : awards;

  if (awards.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Season Selector */}
      {seasons.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedSeason(null)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${
                selectedSeason === null
                  ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)] shadow-md'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            All Seasons
          </button>
          {seasons.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setSelectedSeason(id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${
                  selectedSeason === id
                    ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)] shadow-md'
                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
                }
              `}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Awards Grid */}
      {filteredAwards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAwards.map((award) => (
            <AwardCard key={award.id} award={award} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-[var(--color-text-secondary)]">
            No awards for this season yet.
          </p>
        </div>
      )}
    </div>
  );
}
