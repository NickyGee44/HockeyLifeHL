import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getLeagueBySlug,
  getSeasons,
  getStandings,
  getStatsLeaders,
  getGoalieLeaders,
  getLeagueAwards,
  getLeagueStats,
} from '@/lib/data';
import {
  Trophy,
  Calendar,
  Crown,
  Medal,
  Users,
  Target,
  Shield,
  Award,
  Star,
  ChevronRight,
} from 'lucide-react';
import type { Metadata } from 'next';

interface HistoryPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'History | League Not Found' };
  }

  return {
    title: `Hall of Fame & League History | ${league.name}`,
    description: `Champions, all-time leaders, and award winners of ${league.name}`,
  };
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  // Fetch all data in parallel
  const [
    seasons,
    pointsLeaders,
    goalsLeaders,
    assistsLeaders,
    goalieLeaders,
    awards,
    leagueStats,
  ] = await Promise.all([
    getSeasons(league.id),
    getStatsLeaders(league.id, 'points', 5),
    getStatsLeaders(league.id, 'goals', 5),
    getStatsLeaders(league.id, 'assists', 5),
    getGoalieLeaders(league.id, undefined, 'wins', 5),
    getLeagueAwards(league.id),
    getLeagueStats(league.id),
  ]);

  // Get past/completed seasons
  const now = new Date();
  const pastSeasons = seasons.filter((s) => {
    const endDate = new Date(s.end_date);
    return endDate < now && s.status !== 'active';
  });

  // Get standings for each past season to find champions
  const seasonsWithChampions = await Promise.all(
    pastSeasons.map(async (season) => {
      const standings = await getStandings(league.id, season.id);
      const champion = standings.length > 0 ? standings[0] : null;
      return { ...season, champion };
    })
  );

  // Dynasty tracker: count titles per team
  const titleCounts = new Map<string, { name: string; count: number }>();
  for (const season of seasonsWithChampions) {
    if (season.champion) {
      const existing = titleCounts.get(season.champion.team_id);
      if (existing) {
        existing.count += 1;
      } else {
        titleCounts.set(season.champion.team_id, {
          name: season.champion.team_name,
          count: 1,
        });
      }
    }
  }
  const dynasties = Array.from(titleCounts.values()).sort((a, b) => b.count - a.count);

  // Group awards by season
  const awardsBySeason = new Map<string, typeof awards>();
  for (const award of awards) {
    const seasonName = award.season?.name || 'General';
    const existing = awardsBySeason.get(seasonName);
    if (existing) {
      existing.push(award);
    } else {
      awardsBySeason.set(seasonName, [award]);
    }
  }

  const foundingYear = new Date(league.created_at).getFullYear();
  const uniqueChampions = new Set(
    seasonsWithChampions.map((s) => s.champion?.team_id).filter(Boolean)
  ).size;

  // Most recent champion (featured)
  const mostRecentChampion = seasonsWithChampions.find((s) => s.champion);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Hero Header */}
      <div className="relative border-b border-[var(--color-border)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--league-primary)]/10 via-transparent to-amber-500/5" />
        <div className="relative container mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--league-primary)]/15 mb-4">
            <Crown className="w-8 h-8 text-[var(--league-primary)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--color-text-primary)] mb-2">
            Hall of Fame & League History
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg">
            {league.name} &middot; Est. {foundingYear}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Champions Wall */}
        <section>
          <SectionHeader icon={<Trophy className="w-5 h-5 text-amber-400" />} title="Champions Wall" />

          {seasonsWithChampions.length === 0 || !seasonsWithChampions.some((s) => s.champion) ? (
            <EmptyState
              icon={<Trophy className="w-12 h-12 text-[var(--color-text-muted)]" />}
              message="No champions crowned yet. Check back after the current season ends!"
            />
          ) : (
            <div className="space-y-4">
              {/* Featured Most Recent Champion */}
              {mostRecentChampion?.champion && (
                <Link
                  href={`/${leagueSlug}/standings?season=${mostRecentChampion.id}`}
                  className="block group"
                >
                  <div className="relative bg-gradient-to-r from-amber-500/10 via-[var(--color-surface)] to-amber-500/10 border border-amber-500/30 rounded-2xl p-6 md:p-8 hover:border-amber-400/50 transition-all">
                    <div className="absolute top-3 right-3 bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      Latest Champion
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-amber-500/20">
                        <Trophy className="w-8 h-8 text-amber-400" />
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold mb-1">
                          {mostRecentChampion.name}
                        </p>
                        <h3 className="text-2xl md:text-3xl font-black text-[var(--color-text-primary)]">
                          {mostRecentChampion.champion.team_name}
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1 flex items-center justify-center sm:justify-start gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(mostRecentChampion.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          {' - '}
                          {new Date(mostRecentChampion.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          <span className="mx-1 text-[var(--color-text-muted)]">&middot;</span>
                          {mostRecentChampion.champion.wins}W-{mostRecentChampion.champion.losses}L-{mostRecentChampion.champion.ties}T
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] hidden sm:block group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              )}

              {/* Previous Champions Grid */}
              {seasonsWithChampions.filter((s) => s.champion && s.id !== mostRecentChampion?.id).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {seasonsWithChampions
                    .filter((s) => s.champion && s.id !== mostRecentChampion?.id)
                    .map((season) => (
                      <Link
                        key={season.id}
                        href={`/${leagueSlug}/standings?season=${season.id}`}
                        className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 shrink-0">
                            <Trophy className="w-5 h-5 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">{season.name}</p>
                            <h4 className="font-bold text-[var(--color-text-primary)] truncate">
                              {season.champion!.team_name}
                            </h4>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                              {new Date(season.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              {' - '}
                              {new Date(season.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              <span className="mx-1">&middot;</span>
                              {season.champion!.wins}W-{season.champion!.losses}L-{season.champion!.ties}T
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Dynasty Tracker */}
        {dynasties.length > 0 && (
          <section>
            <SectionHeader icon={<Crown className="w-5 h-5 text-[var(--league-primary)]" />} title="Dynasty Tracker" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dynasties.map((dynasty, index) => (
                <div
                  key={dynasty.name}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--league-primary)]/10 shrink-0">
                    {index === 0 ? (
                      <Crown className="w-6 h-6 text-amber-400" />
                    ) : (
                      <Trophy className="w-5 h-5 text-[var(--league-primary)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[var(--color-text-primary)] truncate">{dynasty.name}</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {dynasty.count} {dynasty.count === 1 ? 'title' : 'titles'}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: dynasty.count }).map((_, i) => (
                      <Trophy key={i} className="w-4 h-4 text-amber-400" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All-Time Leaders */}
        {(pointsLeaders.length > 0 || goalsLeaders.length > 0 || assistsLeaders.length > 0) && (
          <section>
            <SectionHeader icon={<Star className="w-5 h-5 text-amber-400" />} title="All-Time Leaders" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LeaderBoard title="Points Leaders" icon={<Target className="w-4 h-4 text-[var(--league-primary)]" />} leaders={pointsLeaders.map((p) => ({ name: p.player_name, value: p.points, team: p.team_name }))} />
              <LeaderBoard title="Goals Leaders" icon={<Target className="w-4 h-4 text-red-400" />} leaders={goalsLeaders.map((p) => ({ name: p.player_name, value: p.goals, team: p.team_name }))} />
              <LeaderBoard title="Assists Leaders" icon={<Target className="w-4 h-4 text-blue-400" />} leaders={assistsLeaders.map((p) => ({ name: p.player_name, value: p.assists, team: p.team_name }))} />
            </div>
          </section>
        )}

        {/* Goalie Legends */}
        {goalieLeaders.length > 0 && (
          <section>
            <SectionHeader icon={<Shield className="w-5 h-5 text-blue-400" />} title="Goalie Legends" />
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                      <th className="text-left px-4 py-3 font-semibold">#</th>
                      <th className="text-left px-4 py-3 font-semibold">Name</th>
                      <th className="text-right px-4 py-3 font-semibold">W</th>
                      <th className="text-right px-4 py-3 font-semibold">SV%</th>
                      <th className="text-right px-4 py-3 font-semibold">GAA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goalieLeaders.map((goalie, index) => (
                      <tr
                        key={goalie.player_id}
                        className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index < 3 ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--color-text-muted)]'}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[var(--color-text-primary)]">{goalie.player_name}</p>
                          {goalie.team_name && (
                            <p className="text-xs text-[var(--color-text-muted)]">{goalie.team_name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-primary)]">{goalie.wins}</td>
                        <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                          {typeof goalie.save_percentage === 'number'
                            ? goalie.save_percentage > 1
                              ? `${goalie.save_percentage.toFixed(1)}%`
                              : `${(goalie.save_percentage * 100).toFixed(1)}%`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                          {typeof goalie.goals_against_average === 'number'
                            ? goalie.goals_against_average.toFixed(2)
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Award Winners */}
        {awards.length > 0 && (
          <section>
            <SectionHeader icon={<Award className="w-5 h-5 text-amber-400" />} title="Award Winners" />
            <div className="space-y-4">
              {Array.from(awardsBySeason.entries()).map(([seasonName, seasonAwards]) => (
                <div key={seasonName}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                    {seasonName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {seasonAwards.map((award) => (
                      <div
                        key={award.id}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex items-start gap-3"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 shrink-0">
                          <Award className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                            {award.award_name}
                          </p>
                          <p className="font-bold text-[var(--color-text-primary)] truncate">
                            {award.player?.full_name || 'TBD'}
                          </p>
                          {award.team?.name && (
                            <p className="text-xs text-[var(--color-text-muted)]">{award.team.name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* League Stats Summary */}
        <section>
          <SectionHeader icon={<Medal className="w-5 h-5 text-[var(--league-primary)]" />} title="League Stats" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={<Calendar className="w-6 h-6 text-blue-400" />} value={seasons.length} label="Total Seasons" />
            <StatCard icon={<Target className="w-6 h-6 text-green-400" />} value={leagueStats.gamesPlayed} label="Games Played" />
            <StatCard icon={<Trophy className="w-6 h-6 text-amber-400" />} value={uniqueChampions} label="Unique Champions" />
            <StatCard icon={<Users className="w-6 h-6 text-[var(--league-primary)]" />} value={leagueStats.totalTeams} label="Total Teams" />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================
   Sub-components
   ============================================================ */

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2.5">
      {icon}
      {title}
    </h2>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <p className="text-[var(--color-text-secondary)]">{message}</p>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}

function LeaderBoard({
  title,
  icon,
  leaders,
}: {
  title: string;
  icon: React.ReactNode;
  leaders: { name: string; value: number; team: string }[];
}) {
  if (leaders.length === 0) return null;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">{title}</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {leaders.map((leader, index) => (
          <div key={`${leader.name}-${index}`} className="flex items-center gap-3 px-4 py-2.5">
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${index < 3 ? 'bg-amber-500/20 text-amber-400' : 'text-[var(--color-text-muted)]'}`}>
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{leader.name}</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{leader.team}</p>
            </div>
            <span className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums">{leader.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
