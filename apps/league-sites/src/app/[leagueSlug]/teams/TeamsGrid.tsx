'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Users, ChevronRight } from 'lucide-react';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import { SeasonSelector } from '@/components/SeasonSelector';
import type { Team, Division, Season } from '@/lib/types';

interface TeamsGridProps {
  teams: Team[];
  divisions: Division[];
  leagueSlug: string;
  seasons?: Season[];
  currentSeasonId?: string | null;
  seasonName?: string;
}

export function TeamsGrid({ teams, divisions, leagueSlug, seasons = [], currentSeasonId, seasonName }: TeamsGridProps) {
  const { selectedDivisionId, selectedDivision, setDivision } = useDivisionFilter();

  // Apply global division filter
  const filteredTeams = selectedDivisionId
    ? teams.filter((t) => t.division?.id === selectedDivisionId || t.division_id === selectedDivisionId)
    : teams;

  // Group by division when showing all
  const teamsByDivision = groupTeamsByDivision(filteredTeams, divisions);

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-[var(--league-primary)]" />
            Teams
          </h1>
          <SeasonSelector
            seasons={seasons}
            currentSeasonId={currentSeasonId || null}
            leagueSlug={leagueSlug}
            basePath="teams"
          />
        </div>
        <p className="text-[var(--color-text-secondary)]">
          {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
          {selectedDivision ? ` in ${selectedDivision.name}` : ''}
          {seasonName ? ` — ${seasonName}` : ''}
        </p>
      </div>

      {/* Division Filter Buttons */}
      {divisions.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setDivision(null)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              !selectedDivisionId
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)] shadow-md'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            All Divisions
          </button>
          {divisions.map((div) => (
            <button
              key={div.id}
              onClick={() => setDivision(div.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedDivisionId === div.id
                  ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)] shadow-md'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {div.name}
            </button>
          ))}
        </div>
      )}

      {/* Teams Grid */}
      {filteredTeams.length > 0 ? (
        selectedDivisionId || divisions.length <= 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTeams.map((team) => (
              <TeamCard key={team.id} team={team} leagueSlug={leagueSlug} />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(teamsByDivision).map(([divisionName, divisionTeams]) => (
              <section key={divisionName}>
                <h2 className="text-lg font-bold mb-4 text-[var(--league-primary)]">
                  {divisionName}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {divisionTeams.map((team) => (
                    <TeamCard key={team.id} team={team} leagueSlug={leagueSlug} />
                  ))}
                </div>
              </section>
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

function TeamCard({ team, leagueSlug }: { team: Team; leagueSlug: string }) {
  const logoSrc = team.logo_url || team.logo;
  const teamColor = team.primary_color || team.colors;

  return (
    <Link
      href={`/${leagueSlug}/teams/${team.slug}`}
      className="card group hover:border-[var(--league-primary)] transition-all"
    >
      <div className="p-6 text-center">
        <div className="mb-4 flex justify-center">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={team.name}
              width={80}
              height={80}
              className="rounded-xl group-hover:scale-105 transition-transform"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold group-hover:scale-105 transition-transform"
              style={{
                backgroundColor: teamColor || 'var(--league-primary)',
                color: 'var(--color-accent-text)',
              }}
            >
              {team.name.charAt(0)}
            </div>
          )}
        </div>

        <h3 className="font-bold text-lg mb-1">{team.name}</h3>

        {team.division && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {team.division.name}
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-1 text-sm text-[var(--league-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          View Roster
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

function groupTeamsByDivision(teams: Team[], divisions: Division[]): Record<string, Team[]> {
  if (divisions.length === 0) {
    return { 'All Teams': teams };
  }

  const result: Record<string, Team[]> = {};

  divisions.forEach((division) => {
    const divisionTeams = teams.filter(
      (team) => team.division?.id === division.id || team.division_id === division.id
    );
    if (divisionTeams.length > 0) {
      result[division.name] = divisionTeams;
    }
  });

  const unassigned = teams.filter((team) => !team.division && !team.division_id);
  if (unassigned.length > 0) {
    result['Unassigned'] = unassigned;
  }

  return result;
}
