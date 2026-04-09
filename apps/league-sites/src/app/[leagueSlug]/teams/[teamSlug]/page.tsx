import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Mail,
  Newspaper,
  Phone,
  Shield,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import { PointInsightsCarousel } from '@/components/team/PointInsightsCarousel';
import { RivalsCarousel } from '@/components/team/RivalsCarousel';
import { TeamLeadersSection } from '@/components/team/TeamLeadersSection';
import { TeamRosterToggle } from '@/components/team/TeamRosterToggle';
import { SeasonGamesTable } from '@/components/schedule/SeasonGamesTable';
import { HomepageWeeklyGames } from '@/components/home/HomepageWeeklyGames';
import { notFound } from 'next/navigation';
import { SubscriptionWall } from '@/components/shared';
import {
  getCurrentSeason,
  getLeagueBySlug,
  getSeasons,
  getSeasonGames,
  getStandings,
  getTeamArticles,
  getTeamRoster,
  getTeamRosterStats,
  getTeamRivals,
  getTeamWithCaptain,
  getTeams,
} from '@/lib/data';
import {
  buildRivalCardInsights,
  buildTeamLeaders,
  buildTeamPointInsights,
  formatSavePercentage,
  getPositionShortLabel,
  getTeamStandingRank,
  splitRosterByRole,
  summarizeTeamChampionships,
  type TeamLeaderMetric,
} from '@/lib/team-page';
import { stripMarkdownLinks } from '@/lib/news/rich-text';

interface TeamPageProps {
  params: Promise<{ leagueSlug: string; teamSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { leagueSlug, teamSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return { title: 'Team Not Found' };

  const team = await getTeamWithCaptain(league.id, teamSlug);
  if (!team) return { title: 'Team Not Found' };

  return {
    title: team.name,
    description: `${team.name} roster, stats, schedule, and rivalry insights`,
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const { leagueSlug, teamSlug } = await params;
  const { tab: leaderTabParam } = await searchParams;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const team = await getTeamWithCaptain(league.id, teamSlug);
  if (!team) notFound();

  const currentSeason = await getCurrentSeason(league.id);

  const [roster, rosterStatsByPlayer, standings, rivals, seasons, seasonGames, allTeams, teamArticles] = await Promise.all([
    getTeamRoster(team.id, currentSeason?.id),
    getTeamRosterStats(team.id, currentSeason?.id),
    getStandings(league.id, currentSeason?.id),
    getTeamRivals(team.id, 4, currentSeason?.id),
    getSeasons(league.id),
    currentSeason?.id ? getSeasonGames(league.id, currentSeason.id) : Promise.resolve([]),
    getTeams(league.id),
    getTeamArticles(league.id, team.id, 3),
  ]);

  const teamStats = standings.find((standing) => standing.team_id === team.id) ?? null;
  const teamRank = getTeamStandingRank(standings, team.id);

  // Compute current streak from completed games (most recent first)
  const computeStreak = (): string => {
    const completed = (seasonGames as any[])
      .filter((g) => g.status === 'completed' && (g.home_team?.id === team.id || g.away_team?.id === team.id))
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    if (completed.length === 0) return 'N/A';
    let kind: 'W' | 'L' | 'T' | null = null;
    let count = 0;
    for (const g of completed) {
      const isHome = g.home_team?.id === team.id;
      const teamScore = isHome ? Number(g.home_score) || 0 : Number(g.away_score) || 0;
      const oppScore = isHome ? Number(g.away_score) || 0 : Number(g.home_score) || 0;
      const result: 'W' | 'L' | 'T' = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T';
      if (kind === null) {
        kind = result;
        count = 1;
      } else if (result === kind) {
        count += 1;
      } else {
        break;
      }
    }
    return kind ? `${kind}${count}` : 'N/A';
  };
  const teamStreak = computeStreak();

  const now = new Date();
  const { skaters, goalies } = splitRosterByRole(roster, rosterStatsByPlayer);
  const leaderTab = normalizeLeaderTab(leaderTabParam);

  const completedSeasons = seasons.filter((season) => {
    const endDate = new Date(season.end_date);
    return endDate < now && season.status !== 'active';
  });
  const seasonsNeedingStandings = completedSeasons.filter((season) => !season.champion_team_id);
  const standingsEntries = await Promise.all(
    seasonsNeedingStandings.map(async (season) => [season.id, await getStandings(league.id, season.id)] as const),
  );
  const standingsBySeason = new Map(standingsEntries);
  const championshipSummary = summarizeTeamChampionships(
    team.id,
    completedSeasons.map((season) => ({
      ...season,
      standingsLeaderTeamId: standingsBySeason.get(season.id)?.[0]?.team_id ?? null,
    })),
  );

  const captain = roster.find((player) => player.leadership_role === 'captain');
  const rivalCards = buildRivalCardInsights(rivals);
  const leadersByMetric = {
    points: buildTeamLeaders(skaters, rosterStatsByPlayer, 'points'),
    goals: buildTeamLeaders(skaters, rosterStatsByPlayer, 'goals'),
    assists: buildTeamLeaders(skaters, rosterStatsByPlayer, 'assists'),
    penalty_minutes: buildTeamLeaders(skaters, rosterStatsByPlayer, 'penalty_minutes'),
  };

  // Build bar chart data: one row per player with all metric values
  const barChartPlayers = skaters.map((player) => {
    const stats = rosterStatsByPlayer[player.player_id];
    return {
      playerId: player.player_id,
      name: player.profile?.full_name || 'Unknown',
      avatarUrl: player.profile?.avatar_url || '/blank_player.png',
      jerseyNumber: player.jersey_number,
      values: {
        points: stats?.points ?? 0,
        goals: stats?.goals ?? 0,
        assists: stats?.assists ?? 0,
        penalty_minutes: stats?.penalty_minutes ?? 0,
      },
    };
  });

  const pointInsights = buildTeamPointInsights({
    teamName: team.name,
    teamId: team.id,
    standings,
    teamStats,
    rosterStatsByPlayer,
  });
  const logoSrc = team.logo_url || team.logo || '/blank_team.png';
  const teamScheduleGames = seasonGames.filter((game) => game.home_team?.id === team.id || game.away_team?.id === team.id);
  const nextTeamGame = [...teamScheduleGames]
    .filter((game) => game.status === 'scheduled' || game.status === 'in_progress')
    .sort((a, b) => {
      const aPriority = a.status === 'in_progress' ? 0 : 1;
      const bPriority = b.status === 'in_progress' ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    })[0] ?? null;
  const [featuredArticle, ...secondaryArticles] = teamArticles;

  return (
    <SubscriptionWall>
      <div className="min-h-screen bg-[var(--color-background)] px-4 py-8">
        <div className="mx-auto max-w-[1200px] animate-fade-in">
          <section className="relative isolate overflow-hidden rounded-[34px]">
            <div className="relative p-6 md:p-8 lg:p-10">
              <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="flex flex-col items-center text-center xl:items-start xl:text-left">
                  <div className="relative mb-4">
                    <Image
                      src={logoSrc}
                      alt={team.name}
                      width={288}
                      height={288}
                      className="h-[180px] w-[180px] object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.55)] md:h-[220px] md:w-[220px] xl:h-[260px] xl:w-[260px]"
                    />
                    <div className="absolute -bottom-7 -right-[3.25rem] md:-bottom-[2.1875rem] md:-right-[4.0625rem]">
                      <Image
                        src="/trophy.png"
                        alt="Championship trophy"
                        width={156}
                        height={156}
                        className="h-[6.5rem] w-[6.5rem] object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.6)] md:h-[8.125rem] md:w-[8.125rem]"
                      />
                      <div className="absolute left-[68%] top-[56%] rounded-full border border-amber-400/35 bg-black/65 px-3 py-1.5 text-lg font-black tracking-tight text-amber-300 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                        x{championshipSummary.count}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                      {team.name}
                    </p>
                    <p className="text-3xl font-black text-[var(--color-text-primary)] md:text-4xl">
                      {teamStats ? formatRecord(teamStats.wins, teamStats.losses, teamStats.ties) : 'No games yet'}
                    </p>
                    {championshipSummary.count > 0 && championshipSummary.latestTitleSeasonName ? (
                      <p className="max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">
                        Latest championship: {championshipSummary.latestTitleSeasonName}{championshipSummary.latestTitleLabel ? ` (${championshipSummary.latestTitleLabel})` : ''}.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                    <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
                      <HeroMetric label="Points" value={teamStats?.points ?? '-'} accent />
                      <HeroMetric label="Rank" value={teamRank ? `#${teamRank}` : '-'} accent />
                      <HeroMetric label="GF" value={teamStats?.goals_for ?? '-'} />
                      <HeroMetric label="GA" value={teamStats?.goals_against ?? '-'} />
                      <HeroMetric
                        label="Differential"
                        value={teamStats ? formatGoalDifferential(teamStats.goal_differential) : '-'}
                        accent={Boolean(teamStats && teamStats.goal_differential > 0)}
                      />
                      <HeroMetric label="Streak" value={teamStreak} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 space-y-6">
            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <HomepageWeeklyGames
                games={nextTeamGame ? [nextTeamGame] : []}
                leagueSlug={leagueSlug}
                timezone={league.timezone || 'America/Toronto'}
                eyebrowLabel="Next Up"
                title="Next Game"
                emptyTitle="No upcoming games scheduled"
                emptyDescription="This team does not have another game on the current slate yet."
                showViewToggle={false}
              />
            </section>

            <TeamLeadersSection
              leadersByMetric={leadersByMetric}
              barChartPlayers={barChartPlayers}
              leagueSlug={leagueSlug}
              initialMetric={leaderTab}
              pointInsightsElement={
                pointInsights.length > 0 ? <PointInsightsCarousel insights={pointInsights} /> : null
              }
            />

            {seasonGames.length > 0 && (
              <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-[var(--league-primary)]" />
                  <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Season Games</h2>
                </div>
                <SeasonGamesTable
                  games={seasonGames as any}
                  teams={allTeams}
                  leagueSlug={leagueSlug}
                  timezone={league.timezone || 'America/Toronto'}
                  initialTeamId={team.id}
                  hideFilter
                  collapsible
                />
              </section>
            )}

            <div className="px-1 md:px-2">
              <TeamRosterToggle
                title="Roster"
                primaryColor={(team as any).primary_color || 'var(--league-primary)'}
                secondaryColor={(team as any).secondary_color || '#e0b84a'}
                skaters={skaters.map((player) => ({
                  playerId: player.player_id,
                  name: player.profile?.full_name || 'Unknown',
                  jerseyNumber: player.jersey_number,
                  position: player.position,
                }))}
                goalies={goalies.map((goalie) => ({
                  playerId: goalie.player_id,
                  name: goalie.profile?.full_name || 'Unknown',
                  jerseyNumber: goalie.jersey_number,
                  position: 'G',
                }))}
                statsView={
                  <div className="league-reading-panel rounded-[28px] p-6 md:p-8">
                    <StatsTableCard
                      columns={['Player', 'GP', 'G', 'A', 'PTS', 'PIM', 'Pos']}
                      emptyTitle="No skater statistics yet"
                      emptyDescription="Skater stats will populate once official games are recorded."
                    >
                      {skaters.map((player) => {
                        const stats = rosterStatsByPlayer[player.player_id];
                        const gp = stats?.games_played ?? 0;
                        return (
                          <tr key={player.id} className="border-b border-[var(--color-border)]/50 last:border-b-0 hover:bg-[var(--color-surface-hover)]/50">
                            <td className="px-4 py-3">
                              <RosterPlayerCell
                                leagueSlug={leagueSlug}
                                playerId={player.player_id}
                                name={player.profile?.full_name || 'Unknown Player'}
                                avatarUrl={player.profile?.avatar_url || '/blank_player.png'}
                                leadershipRole={player.leadership_role}
                                jerseyNumber={player.jersey_number}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">{gp > 0 ? gp : '-'}</td>
                            <td className="px-4 py-3 text-center">{gp > 0 ? stats?.goals ?? 0 : '-'}</td>
                            <td className="px-4 py-3 text-center">{gp > 0 ? stats?.assists ?? 0 : '-'}</td>
                            <td className="px-4 py-3 text-center font-semibold">{gp > 0 ? stats?.points ?? 0 : '-'}</td>
                            <td className="px-4 py-3 text-center">{gp > 0 ? stats?.penalty_minutes ?? 0 : '-'}</td>
                            <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">
                              {getPositionShortLabel(player.position, false)}
                            </td>
                          </tr>
                        );
                      })}
                    </StatsTableCard>

                    {goalies.length > 0 && (
                      <div className="mt-6">
                        <div className="mb-4 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-[var(--league-primary)]" />
                          <h3 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">Goalies</h3>
                        </div>
                        <StatsTableCard
                          columns={['Goalie', 'GP', 'W', 'L', 'GAA', 'SV%', 'SO']}
                          emptyTitle="No goalie statistics yet"
                          emptyDescription="Goalie stats will appear once this team has official goaltending entries."
                        >
                          {goalies.map((goalie) => {
                            const stats = rosterStatsByPlayer[goalie.player_id];
                            const gp = stats?.games_played ?? 0;
                            return (
                              <tr key={goalie.id} className="border-b border-[var(--color-border)]/50 last:border-b-0 hover:bg-[var(--color-surface-hover)]/50">
                                <td className="px-4 py-3">
                                  <RosterPlayerCell
                                    leagueSlug={leagueSlug}
                                    playerId={goalie.player_id}
                                    name={goalie.profile?.full_name || 'Unknown Goalie'}
                                    avatarUrl={goalie.profile?.avatar_url || '/blank_player.png'}
                                    leadershipRole={goalie.leadership_role}
                                    jerseyNumber={goalie.jersey_number}
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">{gp > 0 ? gp : '-'}</td>
                                <td className="px-4 py-3 text-center">{gp > 0 ? stats?.wins ?? 0 : '-'}</td>
                                <td className="px-4 py-3 text-center">{gp > 0 ? stats?.losses ?? 0 : '-'}</td>
                                <td className="px-4 py-3 text-center">
                                  {gp > 0 && stats?.goals_against_average != null ? stats.goals_against_average.toFixed(2) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center">{gp > 0 ? formatSavePercentage(stats?.save_percentage) : '-'}</td>
                                <td className="px-4 py-3 text-center">{gp > 0 ? stats?.shutouts ?? 0 : '-'}</td>
                              </tr>
                            );
                          })}
                        </StatsTableCard>
                      </div>
                    )}
                  </div>
                }
              />
            </div>

            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <SectionHeader
                icon={Swords}
                title="Rivals"
              />

              {rivalCards.length > 0 ? (
                <div className="mt-4">
                  <RivalsCarousel rivals={rivalCards} leagueSlug={leagueSlug} />
                </div>
              ) : (
                <EmptyPanel
                  title="No rivalry sample yet"
                  description="Rival cards will appear after this team logs completed games against opponents."
                />
              )}
            </section>

            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader
                  icon={Newspaper}
                  title="Team News & Recaps"
                  description="Latest stories tied to this club, from recaps to tagged league coverage."
                />
                <Link
                  href={`/${leagueSlug}/news`}
                  className="inline-flex items-center gap-1 self-start rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--league-primary)] transition-colors hover:border-[var(--league-primary)]/50 hover:text-[var(--color-text-primary)]"
                >
                  View All
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {featuredArticle ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                  <Link
                    href={`/${leagueSlug}/news/${featuredArticle.slug || featuredArticle.id}`}
                    className="group overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)]/92 shadow-[0_22px_60px_-40px_rgba(0,0,0,0.75)]"
                  >
                    <div className="relative aspect-[16/8.4] min-h-[220px] overflow-hidden">
                      {featuredArticle.image_url ? (
                        <img
                          src={featuredArticle.image_url}
                          alt={featuredArticle.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.28),_transparent_48%),linear-gradient(160deg,rgba(18,18,18,1)_0%,rgba(8,8,8,0.96)_100%)] p-6">
                          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                            {team.name}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/24 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--league-primary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent-text)]">
                          Featured Story
                        </span>
                        <h3 className="mt-3 text-xl font-black leading-tight text-white md:text-[1.8rem]">
                          {featuredArticle.title}
                        </h3>
                        {featuredArticle.excerpt ? (
                          <p className="mt-2 max-w-2xl text-sm text-white/80 line-clamp-2">
                            {stripMarkdownLinks(featuredArticle.excerpt)}
                          </p>
                        ) : null}
                        <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
                          <Calendar className="h-3.5 w-3.5" />
                          <time dateTime={featuredArticle.published_at || featuredArticle.created_at}>
                            {formatArticleDate(featuredArticle.published_at || featuredArticle.created_at)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="flex flex-col gap-3">
                    {secondaryArticles.length > 0 ? (
                      secondaryArticles.map((article) => (
                        <Link
                          key={article.id}
                          href={`/${leagueSlug}/news/${article.slug || article.id}`}
                          className="group flex min-h-[108px] flex-col justify-between rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)]/88 px-5 py-4 transition-colors hover:border-[var(--league-primary)]/45"
                        >
                          <h3 className="text-base font-bold leading-snug text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--league-primary)]">
                            {article.title}
                          </h3>
                          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                            <Calendar className="h-3.5 w-3.5" />
                            <time dateTime={article.published_at || article.created_at}>
                              {formatArticleDate(article.published_at || article.created_at)}
                            </time>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="flex h-full items-center rounded-[22px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/48 px-5 py-6 text-sm text-[var(--color-text-secondary)]">
                        One story is live so far. More team-specific recaps will stack here as they publish.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyPanel
                  title="No team stories yet"
                  description="Team recaps and tagged league stories will appear here once they are published."
                />
              )}
            </section>

            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <SectionHeader
                icon={Shield}
                title="Captain Contact"
              />

              {captain ? (
                <div className="mt-4 flex items-center gap-3">
                  <Image
                    src={captain.profile?.avatar_url || '/blank_player.png'}
                    alt={captain.profile?.full_name || 'Captain'}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full border border-white/10 object-cover"
                  />
                  <div>
                    <p className="text-base font-semibold text-[var(--color-text-primary)]">
                      {captain.profile?.full_name || 'Unknown Captain'}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Captain{captain.jersey_number != null ? ` • #${captain.jersey_number}` : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                  Captain information is not listed yet.
                </p>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {team.contact_email ? (
                  <a
                    href={`mailto:${team.contact_email}`}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--league-primary)]"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{team.contact_email}</span>
                  </a>
                ) : null}
                {team.contact_phone ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                    <Phone className="h-4 w-4" />
                    <span>{team.contact_phone}</span>
                  </div>
                ) : null}
              </div>
              {!team.contact_email && !team.contact_phone && !captain && (
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                  Public contact details are not available for this team.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </SubscriptionWall>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[var(--league-primary)]" />
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">{title}</h2>
      </div>
      {description ? (
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
      ) : null}
    </div>
  );
}

function HeroMetric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-black ${accent ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-primary)]'}`}>
        {value}
      </p>
    </div>
  );
}

function formatArticleDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatsTableCard({
  columns,
  children,
  emptyTitle,
  emptyDescription,
}: {
  columns: string[];
  children: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const hasRows = Boolean(children && Array.isArray(children) ? children.length > 0 : children);

  if (!hasRows) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/82">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]/55">
              {columns.map((column) => (
                <th
                  key={column}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)] ${
                    column === 'Player' || column === 'Goalie' ? 'text-left' : 'text-center'
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function RosterPlayerCell({
  leagueSlug,
  playerId,
  name,
  avatarUrl,
  leadershipRole,
  jerseyNumber,
}: {
  leagueSlug: string;
  playerId: string;
  name: string;
  avatarUrl: string;
  leadershipRole: 'captain' | 'alternate_captain' | null | undefined;
  jerseyNumber: number | null | undefined;
}) {
  return (
    <Link href={`/${leagueSlug}/players/${playerId}`} className="group flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <Image
          src={avatarUrl}
          alt={name}
          width={38}
          height={38}
          className="h-9 w-9 rounded-full object-cover"
        />
        {jerseyNumber != null && (
          <span className="absolute -bottom-1.5 -left-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold leading-none text-[var(--league-primary)] ring-1 ring-white/10">
            {jerseyNumber}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--league-primary)]">
            <span className="block truncate leading-tight">{name.split(' ').slice(0, -1).join(' ') || name}</span>
            {name.includes(' ') && (
              <span className="block truncate text-xs font-semibold uppercase tracking-wide leading-tight text-[var(--color-text-secondary)]">
                {name.split(' ').slice(-1)[0]}
              </span>
            )}
          </span>
          {leadershipRole === 'captain' ? <CaptainBadge label="C" /> : null}
          {leadershipRole === 'alternate_captain' ? <CaptainBadge label="A" muted /> : null}
        </div>
      </div>
    </Link>
  );
}

function CaptainBadge({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${muted ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]' : 'bg-amber-500/18 text-amber-500'}`}>
      {label}
    </span>
  );
}


function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/55 px-6 py-10 text-center">
      <p className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function normalizeLeaderTab(value: string | undefined): TeamLeaderMetric {
  if (value === 'goals' || value === 'assists' || value === 'points' || value === 'penalty_minutes') {
    return value;
  }

  return 'points';
}

function formatRecord(wins: number, losses: number, ties: number) {
  return `${wins}-${losses}-${ties}`;
}

function formatGoalDifferential(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}


