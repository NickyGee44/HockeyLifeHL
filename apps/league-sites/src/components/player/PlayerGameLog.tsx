import Image from 'next/image';
import { format } from 'date-fns';
import type { PlayerGameLogEntry } from '@/lib/types';

interface PlayerGameLogProps {
  gameLog: PlayerGameLogEntry[];
  isGoalie?: boolean;
}

export function PlayerGameLog({ gameLog, isGoalie = false }: PlayerGameLogProps) {
  if (isGoalie) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-3 px-2 font-medium text-[var(--color-text-muted)]">Date</th>
              <th className="text-left py-3 px-2 font-medium text-[var(--color-text-muted)]">Opponent</th>
              <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">Result</th>
              <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">Score</th>
              <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">SV</th>
              <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">GA</th>
              <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">SV%</th>
            </tr>
          </thead>
          <tbody>
            {gameLog.map((entry) => (
              <tr
                key={entry.game_id}
                className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <td className="py-3 px-2 text-[var(--color-text-secondary)]">
                  {entry.date ? format(new Date(entry.date), 'MMM d') : '-'}
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-text-muted)] text-xs">
                      {entry.is_home ? 'vs' : '@'}
                    </span>
                    {entry.opponent_logo && (
                      <Image
                        src={entry.opponent_logo}
                        alt={entry.opponent_name || entry.opponent || 'Opponent'}
                        width={20}
                        height={20}
                        className="rounded"
                      />
                    )}
                    <span className="font-medium">{entry.opponent_name || entry.opponent || 'TBD'}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center">
                  <ResultBadge result={entry.result} />
                </td>
                <td className="py-3 px-2 text-center font-medium">{entry.score || '-'}</td>
                <td className="py-3 px-2 text-center">{entry.saves ?? '-'}</td>
                <td className="py-3 px-2 text-center">{entry.goals_against ?? '-'}</td>
                <td className="py-3 px-2 text-center">
                  {entry.save_percentage != null
                    ? `.${Math.round(entry.save_percentage * 1000)}`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left py-3 px-2 font-medium text-[var(--color-text-muted)]">Date</th>
            <th className="text-left py-3 px-2 font-medium text-[var(--color-text-muted)]">Opponent</th>
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">Result</th>
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">Score</th>
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">G</th>
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">A</th>
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">PTS</th>
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">PIM</th>
            <th className="text-center py-3 px-2 font-medium text-[var(--color-text-muted)]">+/-</th>
          </tr>
        </thead>
        <tbody>
          {gameLog.map((entry) => (
            <tr
              key={entry.game_id}
              className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <td className="py-3 px-2 text-[var(--color-text-secondary)]">
                {entry.date ? format(new Date(entry.date), 'MMM d') : '-'}
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-muted)] text-xs">
                    {entry.is_home ? 'vs' : '@'}
                  </span>
                  {entry.opponent_logo && (
                    <Image
                      src={entry.opponent_logo}
                      alt={entry.opponent_name || entry.opponent || 'Opponent'}
                      width={20}
                      height={20}
                      className="rounded"
                    />
                  )}
                  <span className="font-medium">{entry.opponent_name || entry.opponent || 'TBD'}</span>
                </div>
              </td>
              <td className="py-3 px-2 text-center">
                <ResultBadge result={entry.result} />
              </td>
              <td className="py-3 px-2 text-center font-medium">{entry.score || '-'}</td>
              <td className="py-3 px-2 text-center">
                <span className={entry.goals > 0 ? 'text-[var(--league-primary)] font-semibold' : ''}>
                  {entry.goals}
                </span>
              </td>
              <td className="py-3 px-2 text-center">
                <span className={entry.assists > 0 ? 'text-[var(--league-primary)] font-semibold' : ''}>
                  {entry.assists}
                </span>
              </td>
              <td className="py-3 px-2 text-center font-semibold">{entry.points}</td>
              <td className="py-3 px-2 text-center">{entry.penalty_minutes ?? entry.pim ?? 0}</td>
              <td className="py-3 px-2 text-center">
                <span
                  className={
                    entry.plus_minus > 0
                      ? 'text-green-400'
                      : entry.plus_minus < 0
                      ? 'text-red-400'
                      : ''
                  }
                >
                  {entry.plus_minus >= 0 ? `+${entry.plus_minus}` : entry.plus_minus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultBadge({ result }: { result: 'W' | 'L' | 'T' | 'OTL' | '-' }) {
  const colors: Record<string, string> = {
    W: 'bg-green-500/20 text-green-400',
    L: 'bg-red-500/20 text-red-400',
    T: 'bg-gray-500/20 text-gray-400',
    OTL: 'bg-orange-500/20 text-orange-400',
    '-': 'bg-gray-500/20 text-gray-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[result] || colors['-']}`}>
      {result}
    </span>
  );
}
