'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { StandingsTable as SharedStandingsTable } from '@hockey-life/ui';
import type { StandingsTeam } from '@hockey-life/ui';
import type { TeamStanding } from '@/lib/types';

interface StandingsTableProps {
  standings: TeamStanding[];
  leagueSlug?: string;
}

function toStandingsTeam(team: TeamStanding, index: number): StandingsTeam {
  return {
    id: team.team_id,
    name: team.team_name || 'Unknown Team',
    logoUrl: team.team_logo,
    gamesPlayed: team.games_played,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    overtimeLosses: team.overtime_losses,
    points: team.points,
    goalsFor: team.goals_for,
    goalsAgainst: team.goals_against,
    goalDifferential: team.goal_differential,
    rank: index + 1,
  };
}

function TeamLogo({ team }: { team: StandingsTeam }) {
  return (
    <span className="relative block h-10 w-10 shrink-0">
      <Image
        src={team.logoUrl || '/blank_team.png'}
        alt={team.name}
        width={40}
        height={40}
        className="rounded"
      />
      <span className="absolute -bottom-1 -right-1 bg-[var(--color-background)] px-1 py-0.5 text-[10px] font-black leading-none text-[var(--color-text-primary)] shadow-sm">
        {team.rank}
      </span>
    </span>
  );
}

export function StandingsTable({ standings, leagueSlug }: StandingsTableProps) {
  const mapped = useMemo(
    () => standings.map((t, i) => toStandingsTeam(t, i)),
    [standings],
  );

  return (
    <SharedStandingsTable
      standings={mapped}
      variant="public"
      showOvertimeLosses
      renderLogo={(team) => <TeamLogo team={team} />}
      getTeamHref={(team) => leagueSlug ? `/${leagueSlug}/teams/id/${team.id}` : undefined}
    />
  );
}
