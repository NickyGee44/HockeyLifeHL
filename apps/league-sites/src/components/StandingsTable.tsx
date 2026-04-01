'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { StandingsTable as SharedStandingsTable } from '@hockey-life/ui';
import type { StandingsTeam } from '@hockey-life/ui';
import type { TeamStanding } from '@/lib/types';

interface StandingsTableProps {
  standings: TeamStanding[];
  searchTerm?: string;
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
    <Image
      src={team.logoUrl || '/blank_team.png'}
      alt={team.name}
      width={40}
      height={40}
      className="rounded bg-white object-contain p-1"
    />
  );
}

export function StandingsTable({ standings, searchTerm = '', leagueSlug }: StandingsTableProps) {
  const mapped = useMemo(
    () => standings.map((t, i) => toStandingsTeam(t, i)),
    [standings],
  );

  return (
    <SharedStandingsTable
      standings={mapped}
      variant="public"
      showOvertimeLosses
      searchTerm={searchTerm}
      renderLogo={(team) => <TeamLogo team={team} />}
      getTeamHref={(team) => leagueSlug ? `/${leagueSlug}/teams/id/${team.id}` : undefined}
    />
  );
}
