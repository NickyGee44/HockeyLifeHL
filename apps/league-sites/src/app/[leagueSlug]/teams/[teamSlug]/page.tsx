import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Mail,
  Medal,
  Phone,
  Shield,
  Swords,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { SubscriptionWall } from '@/components/shared';
import {
  getCurrentSeason,
  getGameRecap,
  getLeagueBySlug,
  getSeasons,
  getStandings,
  getTeamRoster,
  getTeamRosterStats,
  getTeamRivals,
  getTeamSchedule,
  getTeamWithCaptain,
} from '@/lib/data';
import type { ScheduleGame } from '@/lib/types';
import {
  buildRivalCardInsights,
  buildTeamLeaders,
  buildTeamPointInsights,
  formatSavePercentage,
  getPositionShortLabel,
  getTeamStandingRank,
  normalizeTeamScheduleView,
  partitionTeamSchedule,
  splitRosterByRole,
  summarizeTeamChampionships,
  type TeamLeaderCard,
  type TeamLeaderMetric,
  type TeamPageRosterStatsByPlayer,
} from '@/lib/team-page';

interface TeamPageProps {
  params: Promise<{ leagueSlug: string; teamSlug: string }>;
  searchParams: Promise<{ schedule?: string; tab?: string }>;
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
  const { schedule: scheduleViewParam, tab: leaderTabParam } = await searchParams;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const team = await getTeamWithCaptain(league.id, teamSlug);
  if (!team) notFound();

  const currentSeason = await getCurrentSeason(league.id);

  const [roster, rosterStatsByPlayer, standings, schedule, rivals, seasons] = await Promise.all([
    getTeamRoster(team.id, currentSeason?.id),
    getTeamRosterStats(team.id, currentSeason?.id),
    getStandings(league.id, currentSeason?.id),
    getTeamSchedule(team.id, 24),
    getTeamRivals(team.id, 4),
    getSeasons(league.id),
  ]);

  const teamStats = standings.find((standing) => standing.team_id === team.id) ?? null;
  const teamRank = getTeamStandingRank(standings, team.id);

  const now = new Date();
  const { skaters, goalies } = splitRosterByRole(roster, rosterStatsByPlayer);
  const { upcomingGames, pastGames } = partitionTeamSchedule(schedule, now);
  const scheduleView = normalizeTeamScheduleView(scheduleViewParam);
  const visibleGames = (scheduleView === 'past' ? pastGames : upcomingGames).slice(0, 6);
  const leaderTab = normalizeLeaderTab(leaderTabParam);

  const recapEntries = scheduleView === 'past'
    ? await Promise.all(
        visibleGames
          .filter((game) => game.status === 'completed')
          .map(async (game) => [game.id, await getGameRecap(game.id)] as const),
      )
    : [];
  const recapByGameId = new Map(recapEntries);

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
  const teamLeaders = buildTeamLeaders(skaters, rosterStatsByPlayer, leaderTab);
  const pointInsights = buildTeamPointInsights({
    teamName: team.name,
    teamId: team.id,
    standings,
    teamStats,
    rosterStatsByPlayer,
  });
  const teamScheduleHref = `/${leagueSlug}/schedule?team=${encodeURIComponent(team.id)}`;
  const logoSrc = team.logo_url || team.logo || '/blank_team.png';
  const titleMeta = [team.division?.name ? `${team.division.name} Division` : null, currentSeason?.name ?? null].filter(Boolean);

  return (
    <SubscriptionWall>
      <div className="min-h-screen bg-[var(--color-background)] px-4 py-8">
        <div className="mx-auto max-w-[1200px] animate-fade-in">
          <Link
            href={`/${leagueSlug}/teams`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teams
          </Link>

          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {titleMeta.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full border border-[var(--league-primary)]/20 bg-[var(--color-surface)]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl font-black tracking-tight text-[var(--color-text-primary)] md:text-5xl">
                {team.name}
              </h1>
            </div>
            {teamStats?.points != null ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                {teamStats.points} points in {teamStats.games_played} games
              </p>
            ) : null}
          </div>

          <section className="league-reading-panel relative isolate overflow-hidden rounded-[34px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />
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
                    <div className="absolute -bottom-4 -right-[2.5rem] md:-bottom-5 md:-right-[3.125rem]">
                      <Image
                        src="/trophy.png"
                        alt="Championship trophy"
                        width={120}
                        height={120}
                        className="h-20 w-20 object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.6)] md:h-[6.25rem] md:w-[6.25rem]"
                      />
                      <div className="absolute left-[68%] top-[56%] rounded-full border border-amber-400/35 bg-black/65 px-3 py-1.5 text-lg font-black tracking-tight text-amber-300 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                        x{championshipSummary.count}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                      Team Record
                    </p>
                    <p className="text-3xl font-black text-[var(--color-text-primary)] md:text-4xl">
                      {teamStats ? formatRecord(teamStats.wins, teamStats.losses, teamStats.ties) : 'No games yet'}
                    </p>
                    <p className="max-w-sm text-sm leading-6 text-[var(--color-text-secondary)]">
                      {championshipSummary.count > 0
                        ? championshipSummary.latestTitleSeasonName
                          ? `Latest championship: ${championshipSummary.latestTitleSeasonName}${championshipSummary.latestTitleLabel ? ` (${championshipSummary.latestTitleLabel})` : ''}.`
                          : 'Championship history found in league records.'
                        : 'No recorded championships yet in league history data.'}
                    </p>
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
                      <HeroMetric label="Streak" value={teamStats?.streak || 'N/A'} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6 space-y-6">
            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeader
                  icon={BarChart3}
                  title="Team Leaders"
                />

                <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
                  {([
                    ['points', 'P'],
                    ['goals', 'G'],
                    ['assists', 'A'],
                    ['penalty_minutes', 'PM'],
                  ] as const).map(([value, label]) => (
                    <ScheduleToggleLink
                      key={value}
                      href={`/${leagueSlug}/teams/${teamSlug}?tab=${value}${scheduleView === 'past' ? '&schedule=past' : ''}`}
                      active={leaderTab === value}
                    >
                      {label}
                    </ScheduleToggleLink>
                  ))}
                </div>
              </div>

              {teamLeaders.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {teamLeaders.map((leader, index) => (
                    <TeamLeaderPodiumCard key={`${leader.playerId}-${leader.metric}`} leader={leader} place={index + 1} leagueSlug={leagueSlug} />
                  ))}
                </div>
              ) : (
                <EmptyPanel
                  title="No team leaders yet"
                  description="Leader cards will populate once current-season player stats are recorded."
                />
              )}

              {pointInsights.length > 0 ? (
                <div className="mt-8 border-t border-[var(--color-border)]/50 pt-6">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[var(--league-primary)]" />
                    <h3 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">Points Insights</h3>
                  </div>
                  <div className="space-y-3">
                    {pointInsights.map((insight) => (
                      <div key={insight.key} className="rounded-[22px] border border-white/10 bg-[var(--color-surface)]/72 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                          {insight.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{insight.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <SectionHeader
                icon={Users}
                title="Roster"
              />

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
            </section>

            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeader
                  icon={Calendar}
                  title="Schedule"
                  description="Flip between upcoming games and recent results. Recaps surface when a published game story exists."
                />

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
                    <ScheduleToggleLink
                      href={`/${leagueSlug}/teams/${teamSlug}?schedule=upcoming${leaderTab ? `&tab=${leaderTab}` : ''}`}
                      active={scheduleView === 'upcoming'}
                    >
                      Upcoming
                    </ScheduleToggleLink>
                    <ScheduleToggleLink
                      href={`/${leagueSlug}/teams/${teamSlug}?schedule=past${leaderTab ? `&tab=${leaderTab}` : ''}`}
                      active={scheduleView === 'past'}
                    >
                      Past
                    </ScheduleToggleLink>
                  </div>
                  <Link
                    href={teamScheduleHref}
                    className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--league-primary)]/35 hover:text-[var(--league-primary)]"
                  >
                    Full Schedule
                  </Link>
                </div>
              </div>

              {visibleGames.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {visibleGames.map((game) => (
                    <ScheduleCard
                      key={game.id}
                      game={game}
                      leagueSlug={leagueSlug}
                      teamId={team.id}
                      recapSlug={recapByGameId.get(game.id)?.slug ?? null}
                    />
                  ))}
                </div>
              ) : (
                <EmptyPanel
                  title={scheduleView === 'past' ? 'No completed games yet' : 'No upcoming games scheduled'}
                  description={scheduleView === 'past'
                    ? 'Recent results and recap links will appear here once games have been completed.'
                    : 'The next scheduled game will show up here as soon as it is published.'}
                />
              )}
            </section>

            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <SectionHeader
                icon={Swords}
                title="Rivals"
                description="Derived matchup notes based on recorded head-to-head results only."
              />

              {rivalCards.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {rivalCards.map((rival) => (
                    <Link
                      key={rival.team.id}
                      href={`/${leagueSlug}/teams/${rival.team.slug}`}
                      className="group rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/82 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--league-primary)]/35"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {rival.team.logo ? (
                            <Image
                              src={rival.team.logo}
                              alt={rival.team.name}
                              width={44}
                              height={44}
                              className="h-11 w-11 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--league-primary)]/12 text-sm font-black text-[var(--league-primary)]">
                              {rival.team.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)]">
                              {rival.team.name}
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {rival.games_played} {rival.games_played === 1 ? 'game' : 'games'}
                            </p>
                          </div>
                        </div>
                        <StatusChip status={rival.status}>
                          {rival.status === 'leading' ? 'Edge' : rival.status === 'trailing' ? 'Chasing' : 'Even'}
                        </StatusChip>
                      </div>

                      <div className="mb-3 rounded-[18px] border border-[var(--league-primary)]/15 bg-[var(--league-primary)]/8 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                          Head-to-head
                        </p>
                        <p className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">
                          {rival.recordLabel}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                          Key Insight
                        </p>
                        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                          {rival.insight}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyPanel
                  title="No rivalry sample yet"
                  description="Rival cards will appear after this team logs completed games against opponents."
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

function TeamLeaderPodiumCard({
  leader,
  place,
  leagueSlug,
}: {
  leader: TeamLeaderCard;
  place: number;
  leagueSlug: string;
}) {
  const medalStyles = [
    'from-amber-400/30 via-amber-300/18 to-transparent border-amber-300/35 text-amber-200',
    'from-slate-200/25 via-slate-100/15 to-transparent border-slate-300/30 text-slate-100',
    'from-orange-500/22 via-orange-300/14 to-transparent border-orange-300/25 text-orange-200',
  ];
  const labels: Record<TeamLeaderMetric, string> = {
    goals: 'Goals',
    assists: 'Assists',
    points: 'Points',
    penalty_minutes: 'PIM',
  };

  return (
    <Link
      href={`/${leagueSlug}/players/${leader.playerId}`}
      className={`rounded-[24px] border bg-gradient-to-br p-5 transition-transform duration-200 hover:-translate-y-0.5 ${medalStyles[place - 1] || medalStyles[2]}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]">
          <Medal className="h-3.5 w-3.5" />
          {place === 1 ? 'Gold' : place === 2 ? 'Silver' : 'Bronze'}
        </div>
        <span className="text-3xl font-black leading-none">{leader.value}</span>
      </div>

      <div className="flex items-center gap-3">
        <Image
          src={leader.avatarUrl || '/blank_player.png'}
          alt={leader.name}
          width={60}
          height={60}
          className="h-14 w-14 rounded-full border border-white/10 object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold text-[var(--color-text-primary)]">{leader.name}</p>
            {leader.leadershipRole === 'captain' ? <CaptainBadge label="C" /> : null}
            {leader.leadershipRole === 'alternate_captain' ? <CaptainBadge label="A" muted /> : null}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {labels[leader.metric]} leader • {leader.positionLabel}
            {leader.jerseyNumber != null ? ` • #${leader.jerseyNumber}` : ''}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {leader.gamesPlayed} GP
          </p>
        </div>
      </div>
    </Link>
  );
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

function ScheduleToggleLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
      }`}
    >
      {children}
    </Link>
  );
}

function ScheduleCard({
  game,
  leagueSlug,
  teamId,
  recapSlug,
}: {
  game: ScheduleGame;
  leagueSlug: string;
  teamId: string;
  recapSlug: string | null;
}) {
  const isHome = game.home_team?.id === teamId;
  const opponent = isHome ? game.away_team : game.home_team;
  const gameDate = new Date(game.scheduled_at);
  const result = buildGameResult(game, teamId);

  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/82 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
            {format(gameDate, 'EEEE, MMM d')}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{format(gameDate, 'h:mm a')}</p>
        </div>
        <StatusChip status={game.status === 'completed' ? result.outcome : 'level'}>
          {game.status === 'completed' ? result.label : formatScheduleStatus(game.status)}
        </StatusChip>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
          {isHome ? 'vs' : '@'}
        </span>
        {opponent?.logo ? (
          <Image
            src={opponent.logo}
            alt={opponent.name}
            width={42}
            height={42}
            className="h-10 w-10 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--league-primary)]/12 text-sm font-black text-[var(--league-primary)]">
            {opponent?.name?.charAt(0) || '?'}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-[var(--color-text-primary)]">{opponent?.name || 'TBD'}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{game.venue || 'Venue TBD'}</p>
        </div>
      </div>

      <div className="mb-4 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-hover)]/45 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {game.status === 'completed' ? 'Final' : 'Game Details'}
        </p>
        <p className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">
          {game.status === 'completed'
            ? `${result.myScore}-${result.opponentScore}${result.label ? ` ${result.label}` : ''}`
            : `${opponent?.id ? (isHome ? 'Home game' : 'Road game') : 'Opponent TBD'}${game.division?.name ? ` • ${game.division.name}` : ''}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/${leagueSlug}/games/${game.id}`}
          className="inline-flex items-center rounded-full bg-[var(--league-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90"
        >
          Game Center
        </Link>
        {recapSlug ? (
          <Link
            href={`/${leagueSlug}/news/${recapSlug}`}
            className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--league-primary)]/35 hover:text-[var(--league-primary)]"
          >
            Read Recap
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function StatusChip({
  status,
  children,
}: {
  status: 'leading' | 'trailing' | 'level' | 'W' | 'L' | 'T';
  children: ReactNode;
}) {
  const className =
    status === 'leading' || status === 'W'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
      : status === 'trailing' || status === 'L'
        ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${className}`}>
      {children}
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

function buildGameResult(game: ScheduleGame, teamId: string) {
  const isHome = game.home_team?.id === teamId;
  const myScore = isHome ? game.home_score ?? 0 : game.away_score ?? 0;
  const opponentScore = isHome ? game.away_score ?? 0 : game.home_score ?? 0;

  if (myScore > opponentScore) {
    return { label: 'W', outcome: 'W' as const, myScore, opponentScore };
  }
  if (myScore < opponentScore) {
    return { label: 'L', outcome: 'L' as const, myScore, opponentScore };
  }
  return { label: 'T', outcome: 'T' as const, myScore, opponentScore };
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

function formatScheduleStatus(status: ScheduleGame['status']) {
  if (status === 'in_progress') return 'Live';
  if (status === 'pending_verification') return 'Pending';
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
