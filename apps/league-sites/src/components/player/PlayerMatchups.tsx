import { Target, Shield } from 'lucide-react';

interface MatchupRow {
  id: string;
  name: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  shootingPct: number | null;
}

interface PlayerMatchupsProps {
  matchups: MatchupRow[];
  isGoalie: boolean;
  leagueSlug: string;
}

export function PlayerMatchups({ matchups, isGoalie, leagueSlug: _leagueSlug }: PlayerMatchupsProps) {
  if (matchups.length === 0) return null;

  const title = isGoalie ? 'vs Skaters' : 'vs Goalies';
  const icon = isGoalie
    ? <Target className="w-5 h-5 text-[var(--league-primary)]" />
    : <Shield className="w-5 h-5 text-[var(--league-primary)]" />;
  const nameHeader = isGoalie ? 'Skater' : 'Goalie';

  return (
    <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
              <th className="text-left px-3 py-2 font-semibold">{nameHeader}</th>
              <th className="text-right px-3 py-2 font-semibold">GP</th>
              <th className="text-right px-3 py-2 font-semibold">G</th>
              <th className="text-right px-3 py-2 font-semibold">A</th>
              <th className="text-right px-3 py-2 font-semibold">PTS</th>
              <th className="text-right px-3 py-2 font-semibold">SOG</th>
              <th className="text-right px-3 py-2 font-semibold">SH%</th>
            </tr>
          </thead>
          <tbody>
            {matchups.map((m) => (
              <tr
                key={m.id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <td className="px-3 py-2.5 font-medium text-[var(--color-text-primary)]">
                  {m.name}
                </td>
                <td className="px-3 py-2.5 text-right text-[var(--color-text-secondary)] tabular-nums">{m.gamesPlayed}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-[var(--color-text-primary)] tabular-nums">{m.goals}</td>
                <td className="px-3 py-2.5 text-right text-[var(--color-text-secondary)] tabular-nums">{m.assists}</td>
                <td className="px-3 py-2.5 text-right font-bold text-[var(--league-primary)] tabular-nums">{m.points}</td>
                <td className="px-3 py-2.5 text-right text-[var(--color-text-secondary)] tabular-nums">{m.shots}</td>
                <td className="px-3 py-2.5 text-right text-[var(--color-text-secondary)] tabular-nums">
                  {m.shootingPct !== null ? `${m.shootingPct.toFixed(1)}%` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
