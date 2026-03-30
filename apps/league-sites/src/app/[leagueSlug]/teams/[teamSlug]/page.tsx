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
  Phone,
  Shield,
  Swords,
  Trophy,
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
  getTeamStats,
  getTeamWithCaptain,
} from '@/lib/data';
import type { ScheduleGame } from '@/lib/types';
import {
  buildRivalCardInsights,
  formatSavePercentage,
  getPositionShortLabel,
  normalizeTeamScheduleView,
  partitionTeamSchedule,
  splitRosterByRole,
  summarizeTeamChampionships,
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
  const { schedule: scheduleViewParam } = await searchParams;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const team = await getTeamWithCaptain(league.id, teamSlug);
  if (!team) notFound();

  const currentSeason = await getCurrentSeason(league.id);

  const [roster, rosterStatsByPlayer, teamStats, schedule, rivals, seasons] = await Promise.all([
    getTeamRoster(team.id, currentSeason?.id),
    getTeamRosterStats(team.id, currentSeason?.id),
    getTeamStats(team.id, league.id),
    getTeamSchedule(team.id, 24),
    getTeamRivals(team.id, 4),
    getSeasons(league.id),
  ]);

  const now = new Date();
  const { skaters, goalies } = splitRosterByRole(roster, rosterStatsByPlayer);
  const { upcomingGames, pastGames } = partitionTeamSchedule(schedule, now);
  const scheduleView = normalizeTeamScheduleView(scheduleViewParam);
  const visibleGames = (scheduleView === 'past' ? pastGames : upcomingGames).slice(0, 6);

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
  const skaterLeaders = buildSkaterLeaders(skaters, rosterStatsByPlayer);
  const goalieLeaders = buildGoalieLeaders(goalies, rosterStatsByPlayer);
  const teamScheduleHref = `/${leagueSlug}/schedule?team=${encodeURIComponent(team.id)}`;
  const logoSrc = team.logo_url || team.logo || '/blank_team.png';

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

          <section className="league-reading-panel overflow-hidden rounded-[32px]">
            <div className="grid lg:grid-cols-[minmax(0,1.7fr)_360px]">
              <div className="relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_42%)]" />
                <div className="relative flex flex-col gap-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 shadow-sm">
                      <Image
                        src={logoSrc}
                        alt={team.name}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {team.division?.name && (
                          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                            {team.division.name} Division
                          </span>
                        )}
                        {currentSeason?.name && (
                          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                            {currentSeason.name}
                          </span>
                        )}
                      </div>

                      <h1 className="text-4xl font-black tracking-tight text-[var(--color-text-primary)] md:text-5xl">
                        {team.name}
                      </h1>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <div className="rounded-[20px] border border-[var(--league-primary)]/20 bg-[var(--league-primary)]/10 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--league-primary)]">
                            Record
                          </p>
                          <p className="text-2xl font-black text-[var(--color-text-primary)]">
                            {teamStats ? formatRecord(teamStats.wins, teamStats.losses, teamStats.ties) : 'No games yet'}
                          </p>
                        </div>
                        {teamStats?.points != null && (
                          <p className="pb-1 text-sm text-[var(--color-text-secondary)]">
                            {teamStats.points} points in {teamStats.games_played} games
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <HeroMetric label="Points" value={teamStats?.points ?? '-'} accent />
                    <HeroMetric label="Goals For" value={teamStats?.goals_for ?? '-'} />
                    <HeroMetric label="Goals Against" value={teamStats?.goals_against ?? '-'} />
                    <HeroMetric
                      label="Goal Diff"
                      value={teamStats ? formatGoalDifferential(teamStats.goal_differential) : '-'}
                      accent={Boolean(teamStats && teamStats.goal_differential > 0)}
                    />
                    <HeroMetric label="Streak" value={teamStats?.streak || 'N/A'} />
                  </div>
                </div>
              </div>

              <aside className="border-t border-[var(--color-border)]/80 bg-[var(--color-surface)]/58 px-6 py-8 md:px-8 lg:border-l lg:border-t-0">
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/88 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-[var(--league-primary)]" />
                      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                        Championship Count
                      </h2>
                    </div>
                    <p className="text-4xl font-black text-[var(--color-text-primary)]">
                      {championshipSummary.count}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      {championshipSummary.count > 0
                        ? championshipSummary.latestTitleSeasonName
                          ? `Latest recorded title: ${championshipSummary.latestTitleSeasonName}${championshipSummary.latestTitleLabel ? ` (${championshipSummary.latestTitleLabel})` : ''}.`
                          : 'Recorded from historical season data.'
                        : 'No recorded championships yet in league history data.'}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/88 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-[var(--league-primary)]" />
                      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--league-primary)]">
                        Team Contact
                      </h2>
                    </div>

                    {captain ? (
                      <div className="mb-4 flex items-center gap-3">
                        <Image
                          src={captain.profile?.avatar_url || '/blank_player.png'}
                          alt={captain.profile?.full_name || 'Captain'}
                          width={52}
                          height={52}
                          className="h-[52px] w-[52px] rounded-full object-cover"
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
                      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
                        Captain information is not listed yet.
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      {team.contact_email ? (
                        <a
                          href={`mailto:${team.contact_email}`}
                          className="flex items-center gap-2 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--league-primary)]"
                        >
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{team.contact_email}</span>
                        </a>
                      ) : null}
                      {team.contact_phone ? (
                        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                          <Phone className="h-4 w-4" />
                          <span>{team.contact_phone}</span>
                        </div>
                      ) : null}
                      {!team.contact_email && !team.contact_phone && (
                        <p className="text-[var(--color-text-secondary)]">
                          Public contact details are not available for this team.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <div className="mt-6 space-y-6">
            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <SectionHeader
                icon={BarChart3}
                title="Player Stats"
                description="Current roster skater production for the selected season."
              />

              <div className="mb-6 grid gap-3 md:grid-cols-3">
                <LeaderCard
                  label="Points Leader"
                  playerName={skaterLeaders.points?.name || 'No stats yet'}
                  statValue={skaterLeaders.points ? `${skaterLeaders.points.value} PTS` : 'Waiting for games'}
                />
                <LeaderCard
                  label="Goals Leader"
                  playerName={skaterLeaders.goals?.name || 'No stats yet'}
                  statValue={skaterLeaders.goals ? `${skaterLeaders.goals.value} G` : 'Waiting for games'}
                />
                <LeaderCard
                  label="Assist Leader"
                  playerName={skaterLeaders.assists?.name || 'No stats yet'}
                  statValue={skaterLeaders.assists ? `${skaterLeaders.assists.value} A` : 'Waiting for games'}
                />
              </div>

              <StatsTableCard
                columns={['#', 'Player', 'Pos', 'GP', 'G', 'A', 'PTS', 'PIM']}
                emptyTitle="No skater statistics yet"
                emptyDescription="Skater stats will populate once official games are recorded."
              >
                {skaters.map((player) => {
                  const stats = rosterStatsByPlayer[player.player_id];
                  const gp = stats?.games_played ?? 0;
                  return (
                    <tr key={player.id} className="border-b border-[var(--color-border)]/50 last:border-b-0 hover:bg-[var(--color-surface-hover)]/50">
                      <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{player.jersey_number ?? '-'}</td>
                      <td className="px-4 py-3">
                        <PlayerCell
                          leagueSlug={leagueSlug}
                          playerId={player.player_id}
                          name={player.profile?.full_name || 'Unknown Player'}
                          avatarUrl={player.profile?.avatar_url || '/blank_player.png'}
                          leadershipRole={player.leadership_role}
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">
                        {getPositionShortLabel(player.position, false)}
                      </td>
                      <td className="px-4 py-3 text-center">{gp > 0 ? gp : '-'}</td>
                      <td className="px-4 py-3 text-center">{gp > 0 ? stats?.goals ?? 0 : '-'}</td>
                      <td className="px-4 py-3 text-center">{gp > 0 ? stats?.assists ?? 0 : '-'}</td>
                      <td className="px-4 py-3 text-center font-semibold">{gp > 0 ? stats?.points ?? 0 : '-'}</td>
                      <td className="px-4 py-3 text-center">{gp > 0 ? stats?.penalty_minutes ?? 0 : '-'}</td>
                    </tr>
                  );
                })}
              </StatsTableCard>
            </section>

            <section className="league-reading-panel rounded-[28px] p-6 md:p-8">
              <SectionHeader
                icon={Shield}
                title="Goalie Stats"
                description="Team goaltending totals using the same public season data."
              />

              <div className="mb-6 grid gap-3 md:grid-cols-3">
                <LeaderCard
                  label="Wins Leader"
                  playerName={goalieLeaders.wins?.name || 'No goalie stats yet'}
                  statValue={goalieLeaders.wins ? `${goalieLeaders.wins.value} W` : 'Waiting for games'}
                />
                <LeaderCard
                  label="Best Save %"
                  playerName={goalieLeaders.savePercentage?.name || 'No goalie stats yet'}
                  statValue={goalieLeaders.savePercentage ? formatSavePercentage(goalieLeaders.savePercentage.value) : 'Waiting for games'}
                />
                <LeaderCard
                  label="Shutout Leader"
                  playerName={goalieLeaders.shutouts?.name || 'No goalie stats yet'}
                  statValue={goalieLeaders.shutouts ? `${goalieLeaders.shutouts.value} SO` : 'Waiting for games'}
                />
              </div>

              <StatsTableCard
                columns={['#', 'Goalie', 'GP', 'W', 'L', 'GAA', 'SV%', 'SO']}
                emptyTitle="No goalie statistics yet"
                emptyDescription="Goalie stats will appear once this team has official goaltending entries."
              >
                {goalies.map((goalie) => {
                  const stats = rosterStatsByPlayer[goalie.player_id];
                  const gp = stats?.games_played ?? 0;
                  return (
                    <tr key={goalie.id} className="border-b border-[var(--color-border)]/50 last:border-b-0 hover:bg-[var(--color-surface-hover)]/50">
                      <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{goalie.jersey_number ?? '-'}</td>
                      <td className="px-4 py-3">
                        <PlayerCell
                          leagueSlug={leagueSlug}
                          playerId={goalie.player_id}
                          name={goalie.profile?.full_name || 'Unknown Goalie'}
                          avatarUrl={goalie.profile?.avatar_url || '/blank_player.png'}
                          leadershipRole={goalie.leadership_role}
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
                      href={`/${leagueSlug}/teams/${teamSlug}?schedule=upcoming`}
                      active={scheduleView === 'upcoming'}
                    >
                      Upcoming
                    </ScheduleToggleLink>
                    <ScheduleToggleLink
                      href={`/${leagueSlug}/teams/${teamSlug}?schedule=past`}
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
  description: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[var(--league-primary)]" />
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">{title}</h2>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function HeroMetric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)]/74 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-black ${accent ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-primary)]'}`}>
        {value}
      </p>
    </div>
  );
}

function LeaderCard({
  label,
  playerName,
  statValue,
}: {
  label: string;
  playerName: string;
  statValue: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)]/82 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-2 truncate text-lg font-bold text-[var(--color-text-primary)]">{playerName}</p>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{statValue}</p>
    </div>
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

function PlayerCell({
  leagueSlug,
  playerId,
  name,
  avatarUrl,
  leadershipRole,
}: {
  leagueSlug: string;
  playerId: string;
  name: string;
  avatarUrl: string;
  leadershipRole: 'captain' | 'alternate_captain' | null | undefined;
}) {
  return (
    <Link href={`/${leagueSlug}/players/${playerId}`} className="group flex items-center gap-3">
      <Image
        src={avatarUrl}
        alt={name}
        width={38}
        height={38}
        className="h-9 w-9 rounded-full object-cover"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--league-primary)]">
            {name}
          </span>
          {leadershipRole === 'captain' ? (
            <span className="rounded-full bg-amber-500/18 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500">
              C
            </span>
          ) : null}
          {leadershipRole === 'alternate_captain' ? (
            <span className="rounded-full bg-[var(--color-surface-hover)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              A
            </span>
          ) : null}
        </div>
      </div>
    </Link>
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

function buildSkaterLeaders(
  skaters: ReturnType<typeof splitRosterByRole>['skaters'],
  rosterStatsByPlayer: TeamPageRosterStatsByPlayer,
) {
  return {
    points: pickLeader(skaters, rosterStatsByPlayer, (stats) => stats.points),
    goals: pickLeader(skaters, rosterStatsByPlayer, (stats) => stats.goals),
    assists: pickLeader(skaters, rosterStatsByPlayer, (stats) => stats.assists),
  };
}

function buildGoalieLeaders(
  goalies: ReturnType<typeof splitRosterByRole>['goalies'],
  rosterStatsByPlayer: TeamPageRosterStatsByPlayer,
) {
  return {
    wins: pickLeader(goalies, rosterStatsByPlayer, (stats) => stats.wins),
    savePercentage: pickLeader(goalies, rosterStatsByPlayer, (stats) => stats.save_percentage ?? -1),
    shutouts: pickLeader(goalies, rosterStatsByPlayer, (stats) => stats.shutouts),
  };
}

function pickLeader(
  players: ReturnType<typeof splitRosterByRole>['skaters'],
  rosterStatsByPlayer: TeamPageRosterStatsByPlayer,
  getValue: (stats: TeamPageRosterStatsByPlayer[string]) => number,
) {
  const leader = players.reduce<{ name: string; value: number } | null>((best, player) => {
    const stats = rosterStatsByPlayer[player.player_id];
    if (!stats || stats.games_played === 0) return best;

    const value = getValue(stats);
    if (best == null || value > best.value) {
      return {
        name: player.profile?.full_name || 'Unknown Player',
        value,
      };
    }

    return best;
  }, null);

  if (leader && leader.value >= 0) {
    return leader;
  }

  return null;
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
