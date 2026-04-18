'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { SeasonSelector } from '@/components/SeasonSelector';
import {
  buildTeamsDirectoryBumpChartNarrative,
  TEAMS_DIRECTORY_BUMP_CHART_COLUMNS,
  type TeamsDirectoryBumpChartData,
  type TeamsDirectoryBumpChartMetricKey,
  type TeamsDirectoryBumpChartTeam,
} from '@/lib/teams-directory-bump-chart';
import type { Team, Division, Season } from '@/lib/types';

interface TeamsGridProps {
  teams: Team[];
  divisions: Division[];
  leagueSlug: string;
  seasons?: Season[];
  currentSeasonId?: string | null;
  seasonName?: string;
  bumpChartData?: TeamsDirectoryBumpChartData | null;
}

const CHART_RANK_COLUMN_WIDTH = 32;
const CHART_COLUMN_WIDTH = 140;
const CHART_WIDTH = CHART_RANK_COLUMN_WIDTH + (CHART_COLUMN_WIDTH * TEAMS_DIRECTORY_BUMP_CHART_COLUMNS.length);
const CHART_ROW_HEIGHT = 64;
const CHART_HEADER_HEIGHT = 48;
const CHART_PATH_INSET_X = CHART_RANK_COLUMN_WIDTH + (CHART_COLUMN_WIDTH / 2);
const CHART_LOGO_SIZE = 56;
const CHART_TOP_PADDING = 16;
const CHART_FALLBACK_PATH_COLOR = 'var(--league-primary)';

export function TeamsGrid({
  teams,
  divisions,
  leagueSlug,
  seasons = [],
  currentSeasonId,
  seasonName,
  bumpChartData,
}: TeamsGridProps) {
  const { selectedDivisionId, selectedDivision, setDivision } = useDivisionFilter();

  const filteredTeams = selectedDivisionId
    ? teams.filter((t) => t.division?.id === selectedDivisionId || t.division_id === selectedDivisionId)
    : teams;

  const teamsByDivision = groupTeamsByDivision(filteredTeams, divisions);

  const filteredBumpChartData = useMemo(() => {
    if (!bumpChartData) return null;
    if (!selectedDivisionId) return bumpChartData;

    const filteredChartTeams = bumpChartData.teams.filter((team) => team.divisionId === selectedDivisionId);
    if (filteredChartTeams.length === 0) return null;

    return {
      ...bumpChartData,
      totalTeams: filteredChartTeams.length,
      teams: filteredChartTeams,
    } satisfies TeamsDirectoryBumpChartData;
  }, [bumpChartData, selectedDivisionId]);

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
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

      {filteredTeams.length > 0 ? (
        <>
          {selectedDivisionId || divisions.length <= 1 ? (
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
          )}

          {filteredBumpChartData && (
            <TeamsDirectoryBumpChart
              data={filteredBumpChartData}
              leagueSlug={leagueSlug}
            />
          )}
        </>
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

  return (
    <Link
      href={`/${leagueSlug}/teams/${team.slug}`}
      className="card group hover:border-[var(--league-primary)] transition-all"
    >
      <div className="p-6 text-center">
        <div className="mb-5 flex justify-center">
          <Image
            src={logoSrc || '/blank_team.png'}
            alt={team.name}
            width={160}
            height={160}
            className="h-40 w-40 rounded-xl object-contain transition-transform group-hover:scale-105"
          />
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

function TeamsDirectoryBumpChart({
  data,
  leagueSlug,
}: {
  data: TeamsDirectoryBumpChartData;
  leagueSlug: string;
}) {
  const [selectedMetric, setSelectedMetric] = useState<{
    teamId: string;
    metricKey: TeamsDirectoryBumpChartMetricKey;
  } | null>(null);
  const totalTeams = Math.max(data.teams.length, 1);
  const chartHeight = CHART_HEADER_HEIGHT + CHART_TOP_PADDING + (totalTeams * CHART_ROW_HEIGHT);

  const chartTeams = useMemo(
    () => [...data.teams].sort((left, right) => left.metrics.overall.rank - right.metrics.overall.rank),
    [data.teams],
  );

  const selectedTeam = selectedMetric
    ? chartTeams.find((team) => team.teamId === selectedMetric.teamId) || null
    : null;
  const selectedNarrative = selectedTeam && selectedMetric
    ? buildTeamsDirectoryBumpChartNarrative(selectedTeam, selectedMetric.metricKey, totalTeams)
    : null;

  return (
    <section className="mt-12">
      <h2 className="mb-3 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
        Team Positioning
      </h2>

      <div className="overflow-x-auto pb-2">
        <div className="relative min-w-[592px]" style={{ width: CHART_WIDTH, height: chartHeight }}>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            width={CHART_WIDTH}
            height={chartHeight}
            viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
          >
            {chartTeams.map((team) => {
              const path = buildBumpPath(team, totalTeams);
              const isActive = !selectedMetric || selectedMetric.teamId === team.teamId;
              return (
                <path
                  key={team.teamId}
                  d={path}
                  fill="none"
                  stroke={team.primaryColor || CHART_FALLBACK_PATH_COLOR}
                  strokeWidth={selectedMetric?.teamId === team.teamId ? 4 : 2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isActive ? 0.95 : 0.14}
                  style={{ transition: 'opacity 180ms ease, stroke-width 180ms ease' }}
                />
              );
            })}
          </svg>

          <div
            className="grid h-full"
            style={{ gridTemplateColumns: `${CHART_RANK_COLUMN_WIDTH}px repeat(${TEAMS_DIRECTORY_BUMP_CHART_COLUMNS.length}, ${CHART_COLUMN_WIDTH}px)` }}
          >
            <div className="relative border-r border-[var(--color-border)]/70">
              <div className="h-12 border-b border-[var(--color-border)]/80" />
              <div className="relative" style={{ height: chartHeight - CHART_HEADER_HEIGHT }}>
                {Array.from({ length: totalTeams }, (_, index) => (
                  <span
                    key={`rank-${index + 1}`}
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--color-text-muted)]"
                    style={{ top: metricContentTop(index + 1) }}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
            </div>

            {TEAMS_DIRECTORY_BUMP_CHART_COLUMNS.map((column, columnIndex) => (
              <div key={column.key} className="relative border-r border-[var(--color-border)]/70 last:border-r-0">
                <div className="flex h-12 items-center justify-center border-b border-[var(--color-border)]/80 px-1 text-center text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-primary)] sm:px-2 sm:text-xs">
                  {column.label}
                </div>

                <div className="relative" style={{ height: chartHeight - CHART_HEADER_HEIGHT }}>
                  {chartTeams.map((team) => {
                    const metric = team.metrics[column.key];
                    const top = metricContentTop(metric.rank);
                    const isSelected = selectedMetric?.teamId === team.teamId && selectedMetric.metricKey === column.key;
                    const isDimmed = Boolean(selectedMetric && selectedMetric.teamId !== team.teamId);
                    const label = `${team.teamName}: #${metric.rank} in ${column.label}, ${metric.valueLabel}`;

                    return (
                      <button
                        key={`${team.teamId}-${column.key}`}
                        type="button"
                        title={label}
                        aria-label={label}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedMetric((current) => (
                          current?.teamId === team.teamId && current.metricKey === column.key
                            ? null
                            : { teamId: team.teamId, metricKey: column.key }
                        ))}
                        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/55"
                        style={{
                          top,
                          opacity: isDimmed ? 0.24 : 1,
                          transform: `translate(-50%, -50%) scale(${isSelected ? 1.08 : 1})`,
                          filter: isSelected ? 'drop-shadow(0 0 0.6rem color-mix(in srgb, var(--league-primary) 25%, transparent))' : 'none',
                        }}
                      >
                        <TeamLogo
                          logoUrl={team.logoUrl}
                          teamName={team.teamName}
                          teamColor={team.primaryColor}
                          size="md"
                          className="rounded-xl"
                        />
                      </button>
                    );
                  })}
                </div>

                {columnIndex < TEAMS_DIRECTORY_BUMP_CHART_COLUMNS.length - 1 && (
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-[var(--color-border)]/50" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedTeam && selectedMetric && selectedNarrative && (
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          <Link href={`/${leagueSlug}/teams/${selectedTeam.teamSlug}`} className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--league-primary)]">
            {selectedTeam.teamName}
          </Link>{' '}
          {selectedNarrative.replace(`${selectedTeam.teamName} `, '')}
        </p>
      )}
    </section>
  );
}

function metricContentTop(rank: number) {
  return CHART_TOP_PADDING + ((rank - 1) * CHART_ROW_HEIGHT) + (CHART_LOGO_SIZE / 2);
}

function metricTop(rank: number) {
  return CHART_HEADER_HEIGHT + metricContentTop(rank);
}

function buildBumpPath(team: TeamsDirectoryBumpChartTeam, totalTeams: number) {
  const points = TEAMS_DIRECTORY_BUMP_CHART_COLUMNS.map((column, columnIndex) => {
    const x = (columnIndex * CHART_COLUMN_WIDTH) + CHART_PATH_INSET_X;
    const y = metricTop(Math.min(team.metrics[column.key].rank, totalTeams));
    return { x, y };
  });

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function groupTeamsByDivision(teams: Team[], divisions: Division[]): Record<string, Team[]> {
  if (divisions.length === 0) {
    return { 'All Teams': teams };
  }

  const result: Record<string, Team[]> = {};

  divisions.forEach((division) => {
    const divisionTeams = teams.filter(
      (team) => team.division?.id === division.id || team.division_id === division.id,
    );
    if (divisionTeams.length > 0) {
      result[division.name] = divisionTeams;
    }
  });

  const unassigned = teams.filter((team) => !team.division && !team.division_id);
  if (unassigned.length > 0) {
    result.Unassigned = unassigned;
  }

  return result;
}
