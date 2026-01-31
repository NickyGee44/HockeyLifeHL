import Image from 'next/image';
import type { TeamStanding } from '@/lib/types';

interface StandingsWidgetProps {
  standings: TeamStanding[];
}

export function StandingsWidget({ standings }: StandingsWidgetProps) {
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
          {standings.map((team, index) => (
            <tr key={team.team_id}>
              <td className="font-medium text-[var(--color-text-muted)]">
                {index + 1}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  {team.team_logo ? (
                    <Image
                      src={team.team_logo}
                      alt={team.team_name}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: 'var(--league-primary)',
                        color: 'var(--color-background)',
                      }}
                    >
                      {team.team_name.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium truncate max-w-[120px]">
                    {team.team_name}
                  </span>
                </div>
              </td>
              <td className="text-center">{team.wins}</td>
              <td className="text-center">{team.losses}</td>
              <td className="text-center font-bold text-[var(--league-primary)]">
                {team.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
