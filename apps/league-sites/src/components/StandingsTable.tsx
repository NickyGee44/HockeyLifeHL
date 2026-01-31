'use client';

import Image from 'next/image';
import type { TeamStanding } from '@/lib/types';

interface StandingsTableProps {
  standings: TeamStanding[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
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
          {standings.map((team, index) => (
            <tr key={team.team_id}>
              <td className="font-medium text-[var(--color-text-muted)]">
                {index + 1}
              </td>
              <td>
                <div className="flex items-center gap-3">
                  {team.team_logo ? (
                    <Image
                      src={team.team_logo}
                      alt={team.team_name}
                      width={32}
                      height={32}
                      className="rounded"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: 'var(--league-primary)',
                        color: 'var(--color-background)',
                      }}
                    >
                      {team.team_name.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium">{team.team_name}</span>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
