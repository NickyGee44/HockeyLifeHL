'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Shield, TrendingUp } from 'lucide-react';
import type { GoalieStatsWithDivision, HomepageSeasonLeader } from '@/lib/types';

type LeaderTab = 'skaters' | 'goalies';

interface HomepageLeadersTabsProps {
  leagueSlug: string;
  eyebrow?: string;
  seasonName?: string | null;
  description?: string;
  scoringLeaders: HomepageSeasonLeader[];
  goalieLeaders: GoalieStatsWithDivision[];
}

function LeaderAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null | undefined }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[var(--league-primary)]/10 text-sm font-black text-[var(--league-primary)]">
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}

function SkaterRow({
  leagueSlug,
  player,
  rank,
}: {
  leagueSlug: string;
  player: HomepageSeasonLeader;
  rank: number;
}) {
  const teamLine = player.division_name ? `${player.division_name} | ${player.team_name}` : player.team_name;

  return (
    <Link
      href={`/${leagueSlug}/players/${player.player_id}`}
      className="group grid grid-cols-[auto_1fr] gap-2.5 rounded-xl px-1 py-2.5 transition-colors hover:bg-[var(--color-surface)]/65 sm:grid-cols-[auto_1fr_auto] sm:items-center"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${
          rank === 1
            ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
            : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
        }`}
      >
        {rank}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <LeaderAvatar name={player.player_name} avatarUrl={player.avatar_url} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--league-primary)]">
            {player.player_name}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {teamLine}
          </p>
        </div>
      </div>
      <div className="col-span-2 ml-9 grid grid-cols-4 gap-2 text-left sm:col-span-1 sm:ml-0 sm:min-w-[196px] sm:grid-cols-4 sm:gap-3 sm:text-right">
        <div>
          <p className="text-base font-black leading-none text-[var(--color-text-primary)]">{player.points}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">PTS</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-none text-[var(--color-text-primary)]">{player.goals}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">G</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-none text-[var(--color-text-primary)]">{player.assists}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">A</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-none text-[var(--color-text-primary)]">{player.games_played}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">GP</p>
        </div>
      </div>
    </Link>
  );
}

function GoalieRow({
  leagueSlug,
  goalie,
  rank,
}: {
  leagueSlug: string;
  goalie: GoalieStatsWithDivision;
  rank: number;
}) {
  const teamLine = goalie.division_name
    ? `${goalie.division_name} | ${goalie.team_name || 'Goalie Leader'}`
    : goalie.team_name || 'Goalie Leader';

  return (
    <Link
      href={`/${leagueSlug}/players/${goalie.player_id}`}
      className="group grid grid-cols-[auto_1fr] gap-2.5 rounded-xl px-1 py-2.5 transition-colors hover:bg-[var(--color-surface)]/65 sm:grid-cols-[auto_1fr_auto] sm:items-center"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${
          rank === 1
            ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
            : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
        }`}
      >
        {rank}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <LeaderAvatar name={goalie.player_name} avatarUrl={goalie.avatar_url} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--league-primary)]">
            {goalie.player_name}
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {teamLine}
          </p>
        </div>
      </div>
      <div className="col-span-2 ml-9 grid grid-cols-4 gap-2 text-left sm:col-span-1 sm:ml-0 sm:min-w-[196px] sm:grid-cols-4 sm:gap-3 sm:text-right">
        <div>
          <p className="text-base font-black leading-none text-[var(--color-text-primary)]">{goalie.wins}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">W</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-none text-[var(--color-text-primary)]">{goalie.games_played}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">GP</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-none text-[var(--color-text-primary)]">
            {goalie.save_percentage.toFixed(1)}%
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">SV%</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-none text-[var(--color-text-primary)]">
            {goalie.goals_against_average.toFixed(2)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">GAA</p>
        </div>
      </div>
    </Link>
  );
}

export function HomepageLeadersTabs({
  leagueSlug,
  eyebrow = 'This Season',
  seasonName,
  description = 'See the skaters and goalies setting the pace this season.',
  scoringLeaders,
  goalieLeaders,
}: HomepageLeadersTabsProps) {
  const hasSkaters = scoringLeaders.length > 0;
  const hasGoalies = goalieLeaders.length > 0;
  const [activeTab, setActiveTab] = useState<LeaderTab>('skaters');

  if (!hasSkaters && !hasGoalies) {
    return null;
  }

  const defaultTab: LeaderTab = hasSkaters ? 'skaters' : 'goalies';
  const resolvedTab = activeTab === 'goalies' && hasGoalies ? 'goalies' : defaultTab;
  const isGoalieTab = resolvedTab === 'goalies';
  const statHref = isGoalieTab ? `/${leagueSlug}/stats/goalies` : `/${leagueSlug}/stats`;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-[var(--color-text-primary)] md:text-[1.15rem]">
            {seasonName ? `${seasonName} leaders` : 'Top players right now'}
          </h3>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-[var(--color-text-secondary)]">
            {description}
          </p>
        </div>
        <Link
          href={statHref}
          className="group inline-flex items-center gap-1 text-sm font-semibold text-[var(--league-primary)]"
        >
          Full Stats
          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {hasSkaters && hasGoalies && (
        <div className="mt-4 inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('skaters')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all ${
              !isGoalieTab
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Skaters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('goalies')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all ${
              isGoalieTab
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Goalies
          </button>
        </div>
      )}

      <div className="mt-4 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {isGoalieTab
          ? goalieLeaders.slice(0, 5).map((goalie, index) => (
              <GoalieRow
                key={goalie.player_id}
                leagueSlug={leagueSlug}
                goalie={goalie}
                rank={index + 1}
              />
            ))
          : scoringLeaders.slice(0, 5).map((player, index) => (
              <SkaterRow
                key={player.player_id}
                leagueSlug={leagueSlug}
                player={player}
                rank={index + 1}
              />
            ))}
      </div>
    </div>
  );
}

export default HomepageLeadersTabs;
