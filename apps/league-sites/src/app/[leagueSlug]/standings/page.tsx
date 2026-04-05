import { Metadata } from 'next';
import { Trophy } from 'lucide-react';
import { notFound } from 'next/navigation';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getStandings, getDivisions, getCurrentSeason } from '@/lib/data';
import { StandingsWithSearch } from '@/components/StandingsWithSearch';
import { DivisionUrlSync } from '@/components/DivisionUrlSync';
import type { TeamStanding, Division } from '@/lib/types';
import { filterPublicStandings } from '@/lib/publicSiteVisibility';

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

  if (!league) notFound();

  const currentSeason = await getCurrentSeason(league.id);
  const selectedSeasonId = currentSeason?.id || null;

  const [rawStandings, divisions] = await Promise.all([
    getStandings(league.id, selectedSeasonId || undefined),
    getDivisions(league.id),
  ]);
  const standings = filterPublicStandings(rawStandings);

  // Group standings by division
  const standingsByDivision = groupByDivision(standings, divisions);

  return (
    <SubscriptionWall>
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[var(--league-primary)]" />
            Standings
          </h1>
        </div>
        {currentSeason && (
          <p className="text-[var(--color-text-secondary)]">
            {currentSeason.name} Season
          </p>
        )}
      </div>

      {/* Division filter URL sync */}
      <DivisionUrlSync pagePath={`/${leagueSlug}/standings`} />

      {/* Standings */}
      {standings.length > 0 ? (
        <StandingsWithSearch
          standings={standings}
          divisions={divisions}
          standingsByDivision={standingsByDivision}
          leagueSlug={leagueSlug}
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

    </div>
    </SubscriptionWall>
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
