import { Metadata } from 'next';
import { Trophy } from 'lucide-react';
import { getLeagueBySlug, getStandings, getDivisions, getCurrentSeason } from '@/lib/data';
import { StandingsWithSearch } from '@/components/StandingsWithSearch';
import type { TeamStanding, Division } from '@/lib/types';

interface StandingsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export const metadata: Metadata = {
  title: 'Standings',
  description: 'League standings and team rankings',
};

export default async function StandingsPage({ params }: StandingsPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) return null;

  const season = await getCurrentSeason(league.id);
  const [standings, divisions] = await Promise.all([
    getStandings(league.id, season?.id),
    getDivisions(league.id),
  ]);

  // Group standings by division
  const standingsByDivision = groupByDivision(standings, divisions);

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-4">
          <Trophy className="w-8 h-8 text-[var(--league-primary)]" />
          Standings
        </h1>
        {season && (
          <p className="text-[var(--color-text-secondary)]">
            {season.name} Season
          </p>
        )}
      </div>

      {/* Standings */}
      {standings.length > 0 ? (
        <StandingsWithSearch
          standings={standings}
          divisions={divisions}
          standingsByDivision={standingsByDivision}
        />
      ) : (
        <div className="card p-12 text-center">
          <Trophy className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Standings Available</h3>
          <p className="text-[var(--color-text-secondary)]">
            Standings will appear once games have been played.
          </p>
        </div>
      )}

      {/* Standings Legend */}
      {standings.length > 0 && (
        <div className="mt-8 card p-4">
          <h3 className="font-semibold mb-3 text-sm">Legend</h3>
          <div className="flex flex-wrap gap-6 text-sm text-[var(--color-text-secondary)]">
            <span><strong>GP</strong> - Games Played</span>
            <span><strong>W</strong> - Wins</span>
            <span><strong>L</strong> - Losses</span>
            <span><strong>T</strong> - Ties</span>
            <span><strong>OTL</strong> - Overtime Losses</span>
            <span><strong>PTS</strong> - Points</span>
            <span><strong>GF</strong> - Goals For</span>
            <span><strong>GA</strong> - Goals Against</span>
            <span><strong>DIFF</strong> - Goal Differential</span>
          </div>
        </div>
      )}
    </div>
  );
}

function groupByDivision(standings: TeamStanding[], divisions: Division[]): Record<string, TeamStanding[]> {
  const result: Record<string, TeamStanding[]> = {};

  // For single/no division leagues, show all standings under "all"
  // For multi-division leagues, only show per-division (no combined "all")
  if (divisions.length <= 1) {
    result['all'] = standings;
  }

  // Group by actual divisions
  divisions.forEach((division) => {
    result[division.id] = standings.filter(
      (team) => team.division_id === division.id
    );
  });

  return result;
}
