import type { Metadata } from 'next';
import Image from 'next/image';
import {
  getLeagueBySlug,
  getCurrentSeason,
  getStatsLeaders,
  getActiveSeasons,
} from '@/lib/data/league';
import { BarChart3, Trophy, Target, Handshake } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
};

export const metadata: Metadata = {
  title: 'Stats Leaders',
};

export default async function StatsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { season: seasonParam } = await searchParams;
  const league = await getLeagueBySlug(slug);

  if (!league) return null;

  const seasons = await getActiveSeasons(league.id);
  const currentSeason = seasonParam
    ? seasons.find((s) => s.id === seasonParam) || (await getCurrentSeason(league.id))
    : await getCurrentSeason(league.id);

  const leaders = currentSeason ? await getStatsLeaders(currentSeason.id, 25) : [];

  // Calculate leaders for different categories
  const goalLeaders = [...leaders].sort((a, b) => b.goals - a.goals).slice(0, 10);
  const assistLeaders = [...leaders].sort((a, b) => b.assists - a.assists).slice(0, 10);
  const ppgLeaders = [...leaders]
    .filter((p) => p.gamesPlayed >= 3)
    .sort((a, b) => b.pointsPerGame - a.pointsPerGame)
    .slice(0, 10);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-[var(--league-primary)]" />
            Stats Leaders
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

      {leaders.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <BarChart3 className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            No stats available yet
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Points Leaders - Full Table */}
          <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center gap-3">
              <Trophy className="w-6 h-6 text-[var(--league-primary)]" />
              <h2 className="text-xl font-bold">Points Leaders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
                    <th className="text-left py-3 px-4 text-xs uppercase text-[var(--color-text-secondary)] font-medium w-12">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                      Player
                    </th>
                    <th className="text-left py-3 px-4 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                      Team
                    </th>
                    <th className="text-center py-3 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                      GP
                    </th>
                    <th className="text-center py-3 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                      G
                    </th>
                    <th className="text-center py-3 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                      A
                    </th>
                    <th className="text-center py-3 px-4 text-xs uppercase font-bold text-[var(--league-primary)]">
                      PTS
                    </th>
                    <th className="text-center py-3 px-3 text-xs uppercase text-[var(--color-text-secondary)] font-medium">
                      PPG
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((player, index) => (
                    <tr
                      key={player.playerId}
                      className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-semibold">{player.fullName}</div>
                            <div className="text-xs text-[var(--color-text-muted)]">
                              #{player.jerseyNumber || '-'} • {player.position || 'F'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: player.teamColor || '#333' }}
                          />
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            {player.teamShortName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-[var(--color-text-secondary)]">
                        {player.gamesPlayed}
                      </td>
                      <td className="py-3 px-3 text-center font-medium">
                        {player.goals}
                      </td>
                      <td className="py-3 px-3 text-center font-medium">
                        {player.assists}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-lg font-bold text-[var(--league-primary)]">
                          {player.points}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-[var(--color-text-secondary)]">
                        {player.pointsPerGame.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Side by Side Leaders */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Goals Leaders */}
            <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--color-error)]" />
                <h3 className="font-bold">Goals</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {goalLeaders.map((player, index) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-sm text-[var(--color-text-muted)]">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{player.fullName}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {player.teamShortName}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-[var(--color-error)]">
                        {player.goals}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Assists Leaders */}
            <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
                <Handshake className="w-5 h-5 text-[var(--color-info)]" />
                <h3 className="font-bold">Assists</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {assistLeaders.map((player, index) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-sm text-[var(--color-text-muted)]">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{player.fullName}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {player.teamShortName}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-[var(--color-info)]">
                        {player.assists}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* PPG Leaders */}
            <section className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
              <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[var(--color-success)]" />
                <h3 className="font-bold">Points Per Game</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {ppgLeaders.map((player, index) => (
                    <div
                      key={player.playerId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-sm text-[var(--color-text-muted)]">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{player.fullName}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {player.teamShortName}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-[var(--color-success)]">
                        {player.pointsPerGame.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
