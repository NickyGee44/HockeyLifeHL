'use client';

import Image from 'next/image';
import type { TeamStanding } from '@/lib/types';

interface StandingsTableProps {
  standings: TeamStanding[];
  searchTerm?: string;
}

export function StandingsTable({ standings, searchTerm = '' }: StandingsTableProps) {
  const normalizedSearch = searchTerm.toLowerCase().trim();

  // Filter standings based on search (safely handle undefined team_name)
  const filteredStandings = normalizedSearch
    ? standings.filter((team) =>
        (team.team_name || '').toLowerCase().includes(normalizedSearch)
      )
    : standings;

  return (
    <div className="overflow-x-auto">
      <table className="standings-table w-full">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th>Team</th>
            <th className="text-center">GP</th>
            <th className="text-center">W</th>
            <th className="text-center">L</th>
            <th className="text-center">T</th>
            <th className="text-center">OTL</th>
            <th className="text-center">PTS</th>
            <th className="text-center hidden md:table-cell">GF</th>
            <th className="text-center hidden md:table-cell">GA</th>
            <th className="text-center hidden md:table-cell">DIFF</th>
          </tr>
        </thead>
        <tbody>
          {filteredStandings.map((team) => {
            // Find original rank
            const originalRank = standings.findIndex((s) => s.team_id === team.team_id) + 1;
            const teamName = team.team_name || 'Unknown Team';
            const isHighlighted = normalizedSearch && teamName.toLowerCase().includes(normalizedSearch);

            return (
              <tr
                key={team.team_id}
                className={isHighlighted ? 'bg-[var(--league-primary)]/10 border-l-2 border-l-[var(--league-primary)]' : ''}
              >
                <td className="font-medium text-[var(--color-text-muted)]">
                  {originalRank}
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    {team.team_logo ? (
                      <Image
                        src={team.team_logo}
                        alt={teamName}
                        width={32}
                        height={32}
                        className="rounded"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: 'var(--league-primary)',
                          color: 'var(--color-accent-text)',
                        }}
                      >
                        {teamName.charAt(0)}
                      </div>
                    )}
                    <span className={`font-medium ${isHighlighted ? 'text-[var(--league-primary)]' : ''}`}>
                      {teamName}
                    </span>
                  </div>
                </td>
                <td className="text-center">{team.games_played}</td>
                <td className="text-center">{team.wins}</td>
                <td className="text-center">{team.losses}</td>
                <td className="text-center">{team.ties}</td>
                <td className="text-center">{team.overtime_losses}</td>
                <td className="text-center font-bold text-[var(--league-primary)]">
                  {team.points}
                </td>
                <td className="text-center hidden md:table-cell">{team.goals_for}</td>
                <td className="text-center hidden md:table-cell">{team.goals_against}</td>
                <td className="text-center hidden md:table-cell">
                  <span
                    className={
                      team.goal_differential > 0
                        ? 'text-green-500'
                        : team.goal_differential < 0
                        ? 'text-red-500'
                        : ''
                    }
                  >
                    {team.goal_differential > 0 ? '+' : ''}
                    {team.goal_differential}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
