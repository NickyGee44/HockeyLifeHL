import type { Metadata } from 'next';
import Image from 'next/image';
import {
  getLeagueBySlug,
  getCurrentSeason,
  getStandings,
  getActiveSeasons,
} from '@/lib/data/league';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
};

export const metadata: Metadata = {
  title: 'Standings',
};

export default async function StandingsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { season: seasonParam } = await searchParams;
  const league = await getLeagueBySlug(slug);

  if (!league) return null;

  const seasons = await getActiveSeasons(league.id);
  const currentSeason = seasonParam
    ? seasons.find((s) => s.id === seasonParam) || (await getCurrentSeason(league.id))
    : await getCurrentSeason(league.id);

  const standings = currentSeason ? await getStandings(currentSeason.id) : [];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[var(--league-primary)]" />
            Standings
          </h1>
          {currentSeason && (
            <p className="text-[var(--color-text-secondary)] mt-1">
              {currentSeason.name}
            </p>
          )}
        </div>

        {/* Season Selector */}
        {seasons.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="season-select" className="text-sm text-[var(--color-text-secondary)]">
              Season:
            </label>
            <form>
              <select
                id="season-select"
                name="season"
                defaultValue={currentSeason?.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('season', e.target.value);
                  window.location.href = url.toString();
                }}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </form>
          </div>
        )}
      </div>

      {/* Standings Table */}
      {standings.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <Trophy className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            No standings available yet
          </p>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
                  <th className="text-left py-4 px-4 text-xs uppercase text-[var(--color-text-secondary)] font-medium w-12">
                    #
                  </th>
                  <th className="text-left py-4 px-4 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                    Team
                  </th>
                  <th className="text-center py-4 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                    GP
                  </th>
                  <th className="text-center py-4 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                    W
                  </th>
                  <th className="text-center py-4 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                    L
                  </th>
                  <th className="text-center py-4 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                    T
                  </th>
                  <th className="text-center py-4 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                    GF
                  </th>
                  <th className="text-center py-4 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                    GA
                  </th>
                  <th className="text-center py-4 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                    DIFF
                  </th>
                  <th className="text-center py-4 px-4 text-xs uppercase font-bold text-[var(--league-primary)]">
                    PTS
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, index) => {
                  const goalDiff = team.goalsFor - team.goalsAgainst;
                  const isTopThree = index < 3;

                  return (
                    <tr
                      key={team.teamId}
                      className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors ${
                        isTopThree ? 'bg-[var(--league-primary)]/5' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                            index === 0
                              ? 'bg-[var(--color-gold-500)] text-black'
                              : index === 1
                              ? 'bg-neutral-400 text-black'
                              : index === 2
                              ? 'bg-amber-600 text-white'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {team.logoUrl ? (
                            <Image
                              src={team.logoUrl}
                              alt={team.name}
                              width={40}
                              height={40}
                              className="rounded-lg"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                              style={{
                                backgroundColor: team.primaryColor || '#333',
                                color: team.secondaryColor || '#fff',
                              }}
                            >
                              {team.shortName.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">{team.name}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">
                              {team.shortName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center text-[var(--color-text-secondary)]">
                        {team.gamesPlayed}
                      </td>
                      <td className="py-4 px-3 text-center font-medium text-[var(--color-success)]">
                        {team.wins}
                      </td>
                      <td className="py-4 px-3 text-center font-medium text-[var(--color-error)]">
                        {team.losses}
                      </td>
                      <td className="py-4 px-3 text-center font-medium text-[var(--color-text-secondary)]">
                        {team.ties}
                      </td>
                      <td className="py-4 px-3 text-center text-[var(--color-text-secondary)]">
                        {team.goalsFor}
                      </td>
                      <td className="py-4 px-3 text-center text-[var(--color-text-secondary)]">
                        {team.goalsAgainst}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            goalDiff > 0
                              ? 'text-[var(--color-success)]'
                              : goalDiff < 0
                              ? 'text-[var(--color-error)]'
                              : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          {goalDiff > 0 && <TrendingUp className="w-3 h-3" />}
                          {goalDiff < 0 && <TrendingDown className="w-3 h-3" />}
                          {goalDiff === 0 && <Minus className="w-3 h-3" />}
                          {goalDiff > 0 ? '+' : ''}
                          {goalDiff}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-xl font-bold text-[var(--league-primary)]">
                          {team.points}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[var(--color-gold-500)]" />
          <span>1st Place</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-neutral-400" />
          <span>2nd Place</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-600" />
          <span>3rd Place</span>
        </div>
        <div className="ml-auto text-xs">
          GP=Games Played, W=Wins, L=Losses, T=Ties, GF=Goals For, GA=Goals Against, DIFF=Goal Differential, PTS=Points
        </div>
      </div>
    </div>
  );
}
