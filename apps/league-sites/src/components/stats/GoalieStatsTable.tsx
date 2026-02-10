'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronUp, ChevronDown, Medal } from 'lucide-react';
import type { GoalieStats } from '@/lib/types';

interface GoalieStatsTableProps {
  goalies: GoalieStats[];
  leagueSlug: string;
  currentSort: 'wins' | 'save_percentage' | 'goals_against_average' | 'shutouts';
}

type SortKey = 'wins' | 'save_percentage' | 'goals_against_average' | 'shutouts';

// Extracted SortHeader component to fix lint error (components should not be created during render)
function SortHeader({
  label,
  sortKey,
  className = '',
  currentSort,
  onSort
}: {
  label: string;
  sortKey: SortKey;
  className?: string;
  currentSort: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th
      className={`py-3 px-2 font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-center gap-1">
        {label}
        {currentSort === sortKey ? (
          <ChevronUp className="w-3 h-3 text-[var(--league-primary)]" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );
}

export function GoalieStatsTable({ goalies, leagueSlug, currentSort }: GoalieStatsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (sort: SortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    router.push(`/${leagueSlug}/stats/goalies?${params.toString()}`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)] w-12">Rank</th>
            <th className="text-left py-3 px-2 font-medium text-[var(--color-text-muted)]">Player</th>
            <th className="text-left py-3 px-2 font-medium text-[var(--color-text-muted)]">Team</th>
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">GP</th>
            <SortHeader label="W" sortKey="wins" className="text-center" currentSort={currentSort} onSort={handleSort} />
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">L</th>
            <SortHeader label="GAA" sortKey="goals_against_average" className="text-center" currentSort={currentSort} onSort={handleSort} />
            <SortHeader label="SV%" sortKey="save_percentage" className="text-center" currentSort={currentSort} onSort={handleSort} />
            <SortHeader label="SO" sortKey="shutouts" className="text-center" currentSort={currentSort} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {goalies.map((goalie, index) => (
            <tr
              key={`${goalie.player_id}-${index}`}
              className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <td className="py-3 px-2 text-center">
                <RankBadge rank={index + 1} />
              </td>
              <td className="py-3 px-2">
                <Link
                  href={`/${leagueSlug}/players/${goalie.player_id}`}
                  className="flex items-center gap-2 hover:text-[var(--league-primary)] transition-colors"
                >
                  {goalie.jersey_number && (
                    <span className="text-xs text-[var(--color-text-muted)]">#{goalie.jersey_number}</span>
                  )}
                  <span className="font-medium">{goalie.player_name}</span>
                </Link>
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  {goalie.team_logo && (
                    <Image
                      src={goalie.team_logo}
                      alt={goalie.team_name || ''}
                      width={20}
                      height={20}
                      className="rounded"
                    />
                  )}
                  <span className="text-[var(--color-text-secondary)]">{goalie.team_name}</span>
                </div>
              </td>
              <td className="py-3 px-2 text-center">{goalie.games_played}</td>
              <td className="py-3 px-2 text-center">
                <span className={currentSort === 'wins' ? 'text-[var(--league-primary)] font-semibold' : ''}>
                  {goalie.wins}
                </span>
              </td>
              <td className="py-3 px-2 text-center">{goalie.losses}</td>
              <td className="py-3 px-2 text-center">
                <span className={currentSort === 'goals_against_average' ? 'text-[var(--league-primary)] font-semibold' : ''}>
                  {goalie.goals_against_average.toFixed(2)}
                </span>
              </td>
              <td className="py-3 px-2 text-center">
                <span className={currentSort === 'save_percentage' ? 'text-[var(--league-primary)] font-semibold' : ''}>
                  .{Math.round(goalie.save_percentage * 1000).toString().padStart(3, '0')}
                </span>
              </td>
              <td className="py-3 px-2 text-center">
                <span className={currentSort === 'shutouts' ? 'text-[var(--league-primary)] font-semibold' : ''}>
                  {goalie.shutouts}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20">
        <Medal className="w-4 h-4 text-amber-400" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-surface-hover)]">
        <Medal className="w-4 h-4 text-[var(--color-text-secondary)]" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20">
        <Medal className="w-4 h-4 text-amber-700" />
      </span>
    );
  }
  return <span className="text-[var(--color-text-muted)]">{rank}</span>;
}
