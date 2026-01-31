import { Metadata } from 'next';
import { Calendar, Filter } from 'lucide-react';
import { getLeagueBySlug, getSchedule, getTeams, getCurrentSeason } from '@/lib/data';
import { ScheduleList } from '@/components/ScheduleList';

interface SchedulePageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ team?: string; month?: string }>;
}

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'View the complete game schedule',
};

export default async function SchedulePage({ params, searchParams }: SchedulePageProps) {
  const { leagueSlug } = await params;
  const { team: teamFilter, month: monthFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return null;

  const [games, teams, season] = await Promise.all([
    getSchedule(league.id),
    getTeams(league.id),
    getCurrentSeason(league.id),
  ]);

  // Group games by month
  const gamesByMonth = groupGamesByMonth(games);

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-4">
          <Calendar className="w-8 h-8 text-[var(--league-primary)]" />
          Schedule
        </h1>
        {season && (
          <p className="text-[var(--color-text-secondary)]">
            {season.name} Season
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm font-medium">Filter by:</span>
          </div>

          {/* Team Filter */}
          <select
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
            defaultValue={teamFilter || ''}
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.slug}>
                {team.name}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
            defaultValue={monthFilter || ''}
          >
            <option value="">All Months</option>
            {Object.keys(gamesByMonth).map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule List */}
      {games.length > 0 ? (
        <ScheduleList
          gamesByMonth={gamesByMonth}
          leagueSlug={leagueSlug}
          teamFilter={teamFilter}
          monthFilter={monthFilter}
        />
      ) : (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Games Scheduled</h3>
          <p className="text-[var(--color-text-secondary)]">
            Check back later for the upcoming schedule.
          </p>
        </div>
      )}
    </div>
  );
}

function groupGamesByMonth(games: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  games.forEach((game) => {
    const date = new Date(game.scheduled_at);
    const monthKey = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });

    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(game);
  });

  return grouped;
}
