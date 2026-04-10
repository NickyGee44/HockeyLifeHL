'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

const INITIAL_COUNT = 5;

interface Leader {
  name: string;
  value: number;
  team: string;
  playerId?: string | null;
  teamId?: string | null;
}

export function ExpandableLeaderBoard({
  title,
  icon,
  leaders,
  leagueSlug,
}: {
  title: string;
  icon: React.ReactNode;
  leaders: Leader[];
  leagueSlug: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (leaders.length === 0) return null;

  const displayedLeaders = expanded ? leaders : leaders.slice(0, INITIAL_COUNT);
  const hasMore = leaders.length > INITIAL_COUNT;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">{title}</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {displayedLeaders.map((leader, index) => (
          <div key={`${leader.name}-${index}`} className="flex items-center gap-3 px-4 py-2.5">
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${index < 3 ? 'bg-amber-500/20 text-amber-400' : 'text-[var(--color-text-muted)]'}`}>
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              {leader.playerId ? (
                <Link
                  href={`/${leagueSlug}/players/${leader.playerId}`}
                  className="font-semibold text-sm text-[var(--color-text-primary)] truncate block hover:text-[var(--league-primary)] transition-colors"
                >
                  {leader.name}
                </Link>
              ) : (
                <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{leader.name}</p>
              )}
              {leader.teamId ? (
                <Link
                  href={`/${leagueSlug}/teams/id/${leader.teamId}`}
                  className="text-xs text-[var(--color-text-muted)] truncate block hover:text-[var(--league-primary)] transition-colors"
                >
                  {leader.team}
                </Link>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] truncate">{leader.team}</p>
              )}
            </div>
            <span className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums">{leader.value}</span>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)] transition-colors border-t border-[var(--color-border)]"
        >
          {expanded ? (
            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>View All ({leaders.length}) <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}

interface GoalieLeader {
  player_id: string;
  profile_id?: string | null;
  player_name: string;
  team_id?: string;
  team_name?: string;
  wins: number;
  save_percentage: number | null;
  goals_against_average: number | null;
}

export function ExpandableGoalieLeaderBoard({
  leaders,
  leagueSlug,
}: {
  leaders: GoalieLeader[];
  leagueSlug: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (leaders.length === 0) return null;

  const displayedLeaders = expanded ? leaders : leaders.slice(0, INITIAL_COUNT);
  const hasMore = leaders.length > INITIAL_COUNT;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
              <th className="text-left px-4 py-3 font-semibold">#</th>
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-right px-4 py-3 font-semibold">W</th>
              <th className="text-right px-4 py-3 font-semibold">SV%</th>
              <th className="text-right px-4 py-3 font-semibold">GAA</th>
            </tr>
          </thead>
          <tbody>
            {displayedLeaders.map((goalie, index) => (
              <tr
                key={goalie.player_id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index < 3 ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--color-text-muted)]'}`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {goalie.profile_id ? (
                    <Link
                      href={`/${leagueSlug}/players/${goalie.profile_id}`}
                      className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--league-primary)] transition-colors"
                    >
                      {goalie.player_name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {goalie.player_name}
                    </span>
                  )}
                  {goalie.team_name && (
                    goalie.team_id ? (
                      <Link
                        href={`/${leagueSlug}/teams/id/${goalie.team_id}`}
                        className="text-xs text-[var(--color-text-muted)] block hover:text-[var(--league-primary)] transition-colors"
                      >
                        {goalie.team_name}
                      </Link>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)]">{goalie.team_name}</p>
                    )
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-primary)]">{goalie.wins}</td>
                <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                  {typeof goalie.save_percentage === 'number'
                    ? goalie.save_percentage > 1
                      ? `${goalie.save_percentage.toFixed(1)}%`
                      : `${(goalie.save_percentage * 100).toFixed(1)}%`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                  {typeof goalie.goals_against_average === 'number'
                    ? goalie.goals_against_average.toFixed(2)
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)] transition-colors border-t border-[var(--color-border)]"
        >
          {expanded ? (
            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>View All ({leaders.length}) <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}
