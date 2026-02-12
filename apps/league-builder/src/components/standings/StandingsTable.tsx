'use client';

import { useMemo } from 'react';
import { StandingsTable as SharedStandingsTable } from '@hockey-life/ui';
import type { StandingsTeam } from '@hockey-life/ui';
import type { TeamStanding } from '@/lib/standings/types';

interface StandingsTableProps {
  standings: TeamStanding[];
  playoffSpots?: number;
  showHomeAway?: boolean;
  className?: string;
}

function toStandingsTeam(team: TeamStanding): StandingsTeam {
  return {
    id: team.teamId,
    name: team.teamName,
    logoUrl: team.logoUrl,
    gamesPlayed: team.gamesPlayed,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    points: team.points,
    goalsFor: team.goalsFor,
    goalsAgainst: team.goalsAgainst,
    goalDifferential: team.goalDiff,
    homeRecord: team.homeRecord,
    awayRecord: team.awayRecord,
    rank: team.rank,
    isPlayoffSpot: team.isPlayoffSpot,
  };
}

export function StandingsTable({
  standings,
  playoffSpots = 8,
  showHomeAway = false,
  className,
}: StandingsTableProps) {
  const mapped = useMemo(() => standings.map(toStandingsTeam), [standings]);

  return (
    <SharedStandingsTable
      standings={mapped}
      variant="admin"
      playoffSpots={playoffSpots}
      showHomeAway={showHomeAway}
      className={className}
    />
  );
}
