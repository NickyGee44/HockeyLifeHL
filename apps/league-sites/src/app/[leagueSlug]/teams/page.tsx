import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Users, ChevronRight } from 'lucide-react';
import { getLeagueBySlug, getTeams, getDivisions, getCurrentSeason } from '@/lib/data';

interface TeamsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export const metadata: Metadata = {
  title: 'Teams',
  description: 'View all teams in the league',
};

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) return null;

  const [teams, season] = await Promise.all([
    getTeams(league.id),
    getCurrentSeason(league.id),
  ]);

  const divisions = season ? await getDivisions(season.id) : [];

  // Group teams by division
  const teamsByDivision = groupTeamsByDivision(teams, divisions);

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-4">
          <Users className="w-8 h-8 text-[var(--league-primary)]" />
          Teams
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {teams.length} teams in the league
        </p>
      </div>

      {/* Teams Grid */}
      {teams.length > 0 ? (
        divisions.length > 1 ? (
          <div className="space-y-12">
            {Object.entries(teamsByDivision).map(([divisionName, divisionTeams]) => (
              <section key={divisionName}>
                <h2 className="text-xl font-bold mb-6 text-[var(--league-primary)]">
                  {divisionName}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {divisionTeams.map((team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      leagueSlug={leagueSlug}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} leagueSlug={leagueSlug} />
            ))}
          </div>
        )
      ) : (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
          <p className="text-[var(--color-text-secondary)]">
            Teams will appear here once they are added to the league.
          </p>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, leagueSlug }: { team: any; leagueSlug: string }) {
  return (
    <Link
      href={`/${leagueSlug}/teams/${team.slug}`}
      className="card group hover:border-[var(--league-primary)] transition-all"
    >
      <div className="p-6 text-center">
        {/* Team Logo */}
        <div className="mb-4 flex justify-center">
          {team.logo ? (
            <Image
              src={team.logo}
              alt={team.name}
              width={80}
              height={80}
              className="rounded-xl group-hover:scale-105 transition-transform"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold group-hover:scale-105 transition-transform"
              style={{
                backgroundColor: team.colors || 'var(--league-primary)',
                color: 'var(--color-background)',
              }}
            >
              {team.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Team Name */}
        <h3 className="font-bold text-lg mb-1">{team.name}</h3>

        {/* Division */}
        {team.division && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {team.division.name}
          </p>
        )}

        {/* View Team Link */}
        <div className="mt-4 flex items-center justify-center gap-1 text-sm text-[var(--league-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          View Roster
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

function groupTeamsByDivision(teams: any[], divisions: any[]) {
  if (divisions.length === 0) {
    return { 'All Teams': teams };
  }

  const result: Record<string, any[]> = {};

  divisions.forEach((division) => {
    const divisionTeams = teams.filter((team) => team.division?.id === division.id);
    if (divisionTeams.length > 0) {
      result[division.name] = divisionTeams;
    }
  });

  // Add teams without a division
  const unassigned = teams.filter((team) => !team.division);
  if (unassigned.length > 0) {
    result['Unassigned'] = unassigned;
  }

  return result;
}
