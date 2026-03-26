'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { TeamStanding } from '@/lib/types';
import { RankChangeIndicator } from './ui/animations';

interface StandingsWidgetProps {
  standings: TeamStanding[];
  previousStandings?: TeamStanding[]; // Optional previous standings for rank change calculation
  showRankChange?: boolean;
}

export function StandingsWidget({
  standings,
  previousStandings,
  showRankChange = false,
}: StandingsWidgetProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection Observer for triggering animations
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(table);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(table);
    return () => observer.disconnect();
  }, []);

  // Calculate rank change for a team
  const getRankChange = (teamId: string, currentRank: number): number => {
    if (!previousStandings || previousStandings.length === 0) return 0;

    const prevIndex = previousStandings.findIndex((t) => t.team_id === teamId);
    if (prevIndex === -1) return 0;

    // Previous rank (1-indexed)
    const prevRank = prevIndex + 1;
    // Positive = moved up (lower rank number is better)
    return prevRank - currentRank;
  };

  if (standings.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[var(--color-text-secondary)]">
          No standings available yet
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
      <table ref={tableRef} className="standings-table">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th>Team</th>
            <th className="text-center">W</th>
            <th className="text-center">L</th>
            <th className="text-center">PTS</th>
            {showRankChange && <th className="w-10 text-center" />}
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => {
            const rank = index + 1;
            const rankChange = getRankChange(team.team_id, rank);
            const isTopThree = rank <= 3;

            return (
              <tr
                key={team.team_id}
                className={`
                  standings-row
                  ${isTopThree ? 'standings-row-top' : ''}
                  ${isVisible ? 'standings-row-visible' : ''}
                `}
                style={
                  {
                    '--row-index': index,
                    animationDelay: `${index * 50}ms`,
                  } as React.CSSProperties
                }
              >
                <td className="font-medium">
                  <span
                    className={`
                      inline-flex items-center justify-center w-6 h-6 rounded-full text-sm
                      transition-all duration-300
                      ${
                        isTopThree
                          ? 'bg-[var(--league-primary-strong)] text-[var(--league-on-primary)] font-bold'
                          : 'text-[var(--color-text-muted)]'
                      }
                    `}
                  >
                    {rank}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2 group/team">
                    <div className="relative overflow-hidden rounded transition-transform duration-300 group-hover/team:scale-110">
                      <Image
                        src={team.team_logo || '/blank_team.png'}
                        alt={team.team_name}
                        width={32}
                        height={32}
                        className="rounded"
                      />
                      {/* Subtle shine on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover/team:opacity-100 transition-opacity duration-300" />
                    </div>
                    <span className="font-medium truncate max-w-[120px] transition-colors duration-300 group-hover/team:text-[var(--color-accent)]">
                      {team.team_name || 'Unknown Team'}
                    </span>
                  </div>
                </td>
                <td className="text-center tabular-nums">{team.wins}</td>
                <td className="text-center tabular-nums">{team.losses}</td>
                <td className="text-center">
                  <span className="inline-block font-bold tabular-nums text-[var(--color-accent)] transition-all duration-300 hover:scale-110">
                    {team.points}
                  </span>
                </td>
                {showRankChange && (
                  <td className="text-center">
                    <RankChangeIndicator change={rankChange} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export function StandingsWidgetSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th>Team</th>
            <th className="text-center">W</th>
            <th className="text-center">L</th>
            <th className="text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index}>
              <td>
                <div className="w-6 h-6 rounded-full shimmer-effect" />
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded shimmer-effect" />
                  <div className="h-4 w-24 rounded shimmer-effect" />
                </div>
              </td>
              <td className="text-center">
                <div className="h-4 w-6 mx-auto rounded shimmer-effect" />
              </td>
              <td className="text-center">
                <div className="h-4 w-6 mx-auto rounded shimmer-effect" />
              </td>
              <td className="text-center">
                <div className="h-4 w-8 mx-auto rounded shimmer-effect" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
