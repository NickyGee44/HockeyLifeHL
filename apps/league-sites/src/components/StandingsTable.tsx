'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { StandingsTable as SharedStandingsTable } from '@hockey-life/ui';
import type { StandingsTeam } from '@hockey-life/ui';
import type { TeamStanding } from '@/lib/types';

interface StandingsTableProps {
  standings: TeamStanding[];
  searchTerm?: string;
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
  if (team.logoUrl) {
    return (
      <Image
        src={team.logoUrl}
        alt={team.name}
        width={32}
        height={32}
        className="rounded"
      />
    );
  }
  return null;
}

export function StandingsTable({ standings, searchTerm = '' }: StandingsTableProps) {
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
    />
  );
}
