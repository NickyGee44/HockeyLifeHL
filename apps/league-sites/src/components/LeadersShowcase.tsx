import Link from 'next/link';
import { TrendingUp, Shield, ChevronRight } from 'lucide-react';
import type { PlayerStatsWithAvatar, GoalieStats } from '@/lib/types';

interface LeadersShowcaseProps {
  scoringLeaders: PlayerStatsWithAvatar[];
  goalieLeaders: GoalieStats[];
  leagueSlug: string;
}

function PlayerAvatar({ name, avatarUrl, rank }: { name: string; avatarUrl: string | null; rank: number }) {
  const initials = name
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <img
        src={avatarUrl || '/blank_player.png'}
        alt={name}
        className="h-24 w-24 md:h-28 md:w-28 rounded-full object-cover border-[3px] border-[var(--color-border)]"
      />
      <span
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
        style={{
          backgroundColor: rank <= 3 ? 'var(--league-primary)' : 'var(--color-surface-hover)',
          color: rank <= 3 ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
        }}
      >
        {rank}
      </span>
    </div>
  );
}

export function LeadersShowcase({ scoringLeaders, goalieLeaders, leagueSlug }: LeadersShowcaseProps) {
  const hasScoring = scoringLeaders.length > 0;
  const hasGoalies = goalieLeaders.length > 0;

  if (!hasScoring && !hasGoalies) return null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Scoring Leaders */}
      {hasScoring && (
        <div className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-black text-[var(--color-text-primary)]">
              <TrendingUp className="h-5 w-5 text-[var(--league-primary)]" />
              Scoring Leaders
            </h3>
            <Link
              href={`/${leagueSlug}/stats`}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-[var(--league-primary)]"
            >
              Full Stats
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {scoringLeaders.slice(0, 5).map((player, idx) => (
              <div
                key={player.player_id}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <PlayerAvatar
                  name={player.player_name}
                  avatarUrl={player.avatar_url}
                  rank={idx + 1}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${leagueSlug}/players/${player.player_id}`}
                    className="truncate text-base font-semibold text-[var(--color-text-primary)] hover:text-[var(--league-primary)] transition-colors"
                  >
                    {player.player_name}
                  </Link>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{player.team_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-lg font-black text-[var(--league-primary)]">
                    {player.points}
                  </span>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                    {player.goals}G {player.assists}A
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goalie Leaders */}
      {hasGoalies && (
        <div className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-black text-[var(--color-text-primary)]">
              <Shield className="h-5 w-5 text-[var(--league-primary)]" />
              Goalie Leaders
            </h3>
            <Link
              href={`/${leagueSlug}/stats/goalies`}
              className="group inline-flex items-center gap-1 text-xs font-semibold text-[var(--league-primary)]"
            >
              Full Stats
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {goalieLeaders.slice(0, 3).map((goalie, idx) => (
              <div
                key={goalie.player_id}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <PlayerAvatar
                  name={goalie.player_name}
                  avatarUrl={goalie.avatar_url || null}
                  rank={idx + 1}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${leagueSlug}/players/${goalie.player_id}`}
                    className="truncate text-base font-semibold text-[var(--color-text-primary)] hover:text-[var(--league-primary)] transition-colors"
                  >
                    {goalie.player_name}
                  </Link>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{goalie.team_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-lg font-black text-[var(--league-primary)]">
                    {goalie.wins}W
                  </span>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                    {goalie.save_percentage}% SV | {goalie.goals_against_average} GAA
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
