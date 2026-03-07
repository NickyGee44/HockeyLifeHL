import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SubscriptionWall } from '@/components/shared';
import {
  ArrowLeft,
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Shield,
  Mail,
  Phone,
  Swords,
} from 'lucide-react';
import {
  getLeagueBySlug,
  getCurrentSeason,
  getTeamWithCaptain,
  getTeamRoster,
  getTeamRosterStats,
  getTeamStats,
  getTeamSchedule,
  getTeamRivals,
} from '@/lib/data';
import type { Player, ScheduleGame } from '@/lib/types';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';

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
    description: `${team.name} roster, stats, and schedule`,
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const { leagueSlug, teamSlug } = await params;
  const { tab = 'roster' } = await searchParams;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const team = await getTeamWithCaptain(league.id, teamSlug);
  if (!team) {
    notFound();
  }

  const currentSeason = await getCurrentSeason(league.id);

  // Fetch all data in parallel
  const [roster, teamStats, schedule, rivals] = await Promise.all([
    getTeamRoster(team.id, currentSeason?.id),
    getTeamStats(team.id, league.id),
    getTeamSchedule(team.id, 20),
    getTeamRivals(team.id, 3),
  ]);
  const rosterStatsByPlayer = await getTeamRosterStats(team.id, currentSeason?.id);

  // Find captain from roster
  const captain = roster.find((p) => p.leadership_role === 'captain');

  // Separate upcoming and past games
  const now = new Date();
  const upcomingGames = schedule.filter((g) => new Date(g.scheduled_at) >= now || g.status === 'scheduled');
  const recentGames = schedule.filter((g) => g.status === 'completed').slice(0, 5);

  return (
    <SubscriptionWall>
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Back Link */}
      <Link
        href={`/${leagueSlug}/teams`}
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Teams
      </Link>

      {/* Team Header */}
      <div className="card p-8 mb-8">
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Team Logo */}
          <div className="flex-shrink-0">
            <Image
              src={team.logo_url || team.logo || '/blank_team.png'}
              alt={team.name}
              width={120}
              height={120}
              className="rounded-2xl object-cover"
            />
          </div>

          {/* Team Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{team.name}</h1>
            {team.division && (
              <p className="text-[var(--color-text-secondary)] mb-4">
                {team.division.name} Division
              </p>
            )}

            {/* Team Stats Summary */}
            {teamStats && (
              <div className="flex flex-wrap gap-6 mt-4">
                <StatBox label="Record" value={`${teamStats.wins}-${teamStats.losses}-${teamStats.ties}`} />
                <StatBox label="Points" value={teamStats.points} highlight />
                <StatBox label="GF" value={teamStats.goals_for} />
                <StatBox label="GA" value={teamStats.goals_against} />
                <StatBox
                  label="Diff"
                  value={teamStats.goal_differential > 0 ? `+${teamStats.goal_differential}` : teamStats.goal_differential}
                  color={teamStats.goal_differential > 0 ? 'text-green-400' : teamStats.goal_differential < 0 ? 'text-red-400' : undefined}
                />
              </div>
            )}
          </div>

          {/* Captain Info */}
          {captain && (
            <div className="lg:ml-auto bg-[var(--color-surface-hover)] rounded-xl p-4 min-w-[220px]">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-500">Team Captain</span>
              </div>
              <div className="flex items-center gap-3">
                <Image
                  src={captain.profile?.avatar_url || '/blank_player.png'}
                  alt={captain.profile?.full_name || 'Captain'}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">{captain.profile?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">#{captain.jersey_number}</p>
                </div>
              </div>
              {team.contact_email && (
                <div className="flex items-center gap-2 mt-3 text-sm text-[var(--color-text-secondary)]">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${team.contact_email}`} className="hover:text-[var(--league-primary)] transition-colors">
                    {team.contact_email}
                  </a>
                </div>
              )}
              {team.contact_phone && (
                <div className="flex items-center gap-2 mt-1 text-sm text-[var(--color-text-secondary)]">
                  <Phone className="w-4 h-4" />
                  <span>{team.contact_phone}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rivals Section */}
      {rivals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <Swords className="w-5 h-5 text-[var(--league-primary)]" />
            Rivals
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rivals.map((rival) => (
              <Link
                key={rival.team.id}
                href={`/${leagueSlug}/teams/${rival.team.slug}`}
                className="card p-4 flex items-center gap-4 hover:border-[var(--league-primary)] transition-colors"
              >
                {rival.team.logo ? (
                  <Image
                    src={rival.team.logo}
                    alt={rival.team.name}
                    width={48}
                    height={48}
                    className="rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[var(--league-primary)] flex items-center justify-center text-lg font-bold text-[var(--color-accent-text)]">
                    {rival.team.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{rival.team.name}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {rival.games_played} games played
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--league-primary)]">
                    {rival.wins}-{rival.losses}{rival.ties > 0 ? `-${rival.ties}` : ''}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {rival.wins > rival.losses ? 'Leading' : rival.wins < rival.losses ? 'Trailing' : 'Tied'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)] mb-6">
        <nav className="flex gap-1 -mb-px">
          <TabLink href={`/${leagueSlug}/teams/${teamSlug}?tab=roster`} active={tab === 'roster'} icon={Users}>
            Roster
          </TabLink>
          <TabLink href={`/${leagueSlug}/teams/${teamSlug}?tab=stats`} active={tab === 'stats'} icon={BarChart3}>
            Player Stats
          </TabLink>
          <TabLink href={`/${leagueSlug}/teams/${teamSlug}?tab=schedule`} active={tab === 'schedule'} icon={Calendar}>
            Schedule
          </TabLink>
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'roster' && (
        <RosterTab roster={roster} leagueSlug={leagueSlug} rosterStatsByPlayer={rosterStatsByPlayer} />
      )}
      {tab === 'stats' && (
        <PlayerStatsTab roster={roster} leagueSlug={leagueSlug} rosterStatsByPlayer={rosterStatsByPlayer} />
      )}
      {tab === 'schedule' && (
        <ScheduleTab upcomingGames={upcomingGames} recentGames={recentGames} teamId={team.id} leagueSlug={leagueSlug} />
      )}
    </div>
    </SubscriptionWall>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StatBox({ label, value, highlight, color }: { label: string; value: string | number; highlight?: boolean; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color || (highlight ? 'text-[var(--league-primary)]' : '')}`}>
        {value}
      </div>
      <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function TabLink({ href, active, icon: Icon, children }: { href: string; active: boolean; icon: any; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-[var(--league-primary)] text-[var(--league-primary)]'
          : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}

// =============================================================================
// Roster Tab
// =============================================================================

type RosterStatsByPlayer = Awaited<ReturnType<typeof getTeamRosterStats>>;

function RosterTab({
  roster,
  leagueSlug,
  rosterStatsByPlayer,
}: {
  roster: Player[];
  leagueSlug: string;
  rosterStatsByPlayer: RosterStatsByPlayer;
}) {
  const sortedRoster = [...roster].sort((a, b) => {
    const aNumber = a.jersey_number ?? Number.MAX_SAFE_INTEGER;
    const bNumber = b.jersey_number ?? Number.MAX_SAFE_INTEGER;
    if (aNumber !== bNumber) return aNumber - bNumber;

    const aName = a.profile?.full_name || '';
    const bName = b.profile?.full_name || '';
    return aName.localeCompare(bName);
  });

  if (sortedRoster.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Users className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
        <p className="text-[var(--color-text-secondary)]">
          The roster will appear here once players are added.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold">Team Roster</h3>
        <span className="text-sm text-[var(--color-text-secondary)]">{sortedRoster.length} players</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">#</th>
              <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Player</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">Pos</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">GP</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">G</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">A</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">PTS</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">PIM</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">W-L</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">SV%</th>
              <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">GAA</th>
            </tr>
          </thead>
          <tbody>
            {sortedRoster.map((player) => {
              const fullName = player.profile?.full_name || 'Unknown Player';
              const stats = rosterStatsByPlayer[player.player_id];
              const isGoalie = Boolean(player.is_goalie || isGoaliePosition(player.position) || stats?.is_goalie);
              const gp = stats?.games_played ?? 0;

              return (
                <tr key={player.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)]">
                  <td className="py-3 px-4">{player.jersey_number ?? '-'}</td>
                  <td className="py-3 px-4">
                    <Link href={`/${leagueSlug}/players/${player.player_id}`} className="group flex items-center gap-3 min-w-0">
                      <Image
                        src={player.profile?.avatar_url || '/blank_player.png'}
                        alt={fullName}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate group-hover:text-[var(--league-primary)] transition-colors">
                            {fullName}
                          </span>
                          {player.leadership_role === 'captain' && (
                            <span className="text-xs bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-medium">C</span>
                          )}
                          {player.leadership_role === 'alternate_captain' && (
                            <span className="text-xs bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded font-medium">A</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-center text-[var(--color-text-secondary)]">
                    {getPositionShortLabel(player.position, isGoalie)}
                  </td>
                  <td className="py-3 px-4 text-center">{gp > 0 ? gp : '-'}</td>
                  <td className="py-3 px-4 text-center">{!isGoalie ? (stats?.goals ?? 0) : '-'}</td>
                  <td className="py-3 px-4 text-center">{!isGoalie ? (stats?.assists ?? 0) : '-'}</td>
                  <td className="py-3 px-4 text-center font-semibold">{!isGoalie ? (stats?.points ?? 0) : '-'}</td>
                  <td className="py-3 px-4 text-center">{!isGoalie ? (stats?.penalty_minutes ?? 0) : '-'}</td>
                  <td className="py-3 px-4 text-center">{isGoalie ? `${stats?.wins ?? 0}-${stats?.losses ?? 0}` : '-'}</td>
                  <td className="py-3 px-4 text-center">{isGoalie ? formatSavePercentage(stats?.save_percentage ?? null) : '-'}</td>
                  <td className="py-3 px-4 text-center">{isGoalie && stats?.goals_against_average != null ? stats.goals_against_average.toFixed(2) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isGoaliePosition(position: string | null): boolean {
  const value = (position || '').toUpperCase();
  return value === 'G' || value === 'GOALIE' || value === 'GOALTENDER';
}

function getPositionShortLabel(position: string | null, isGoalie: boolean): string {
  if (isGoalie) return 'G';

  const value = (position || '').toUpperCase();
  if (value === 'C' || value === 'LW' || value === 'RW' || value === 'D') return value;
  if (value === 'FORWARD') return 'F';
  if (value === 'DEFENSE' || value === 'DEFENCEMAN' || value === 'DEFENSEMAN' || value === 'LD' || value === 'RD') {
    return 'D';
  }
  return value || '-';
}

function formatSavePercentage(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '-';
  return `.${Math.round(value * 1000).toString().padStart(3, '0')}`;
}

// =============================================================================
// Player Stats Tab
// =============================================================================

function PlayerStatsTab({
  roster,
  leagueSlug,
  rosterStatsByPlayer,
}: {
  roster: Player[];
  leagueSlug: string;
  rosterStatsByPlayer: RosterStatsByPlayer;
}) {
  // Filter out goalies for skater stats
  const skaters = roster.filter((p) => p.position !== 'G' && p.position !== 'Goalie' && !p.is_goalie);
  const goalies = roster.filter((p) => p.position === 'G' || p.position === 'Goalie' || p.is_goalie);

  // Sort skaters by points descending
  const sortedSkaters = [...skaters].sort((a, b) => {
    const aStats = rosterStatsByPlayer[a.player_id];
    const bStats = rosterStatsByPlayer[b.player_id];
    return (bStats?.points ?? 0) - (aStats?.points ?? 0);
  });

  // Sort goalies by wins descending
  const sortedGoalies = [...goalies].sort((a, b) => {
    const aStats = rosterStatsByPlayer[a.player_id];
    const bStats = rosterStatsByPlayer[b.player_id];
    return (bStats?.wins ?? 0) - (aStats?.wins ?? 0);
  });

  return (
    <div className="space-y-8">
      {/* Skater Stats */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-semibold">Skater Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">#</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Player</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">Pos</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">GP</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">G</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">A</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">PTS</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">PIM</th>
              </tr>
            </thead>
            <tbody>
              {sortedSkaters.length > 0 ? (
                sortedSkaters.map((player) => {
                  const stats = rosterStatsByPlayer[player.player_id];
                  const gp = stats?.games_played ?? 0;
                  return (
                    <tr key={player.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)]">
                      <td className="py-3 px-4">{player.jersey_number || '-'}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/${leagueSlug}/players/${player.player_id}`}
                          className="font-medium hover:text-[var(--league-primary)] transition-colors"
                        >
                          {player.profile?.full_name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--color-text-secondary)]">
                        {player.position || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? gp : '-'}</td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? (stats?.goals ?? 0) : '-'}</td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? (stats?.assists ?? 0) : '-'}</td>
                      <td className="py-3 px-4 text-center font-semibold">{gp > 0 ? (stats?.points ?? 0) : '-'}</td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? (stats?.penalty_minutes ?? 0) : '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--color-text-secondary)]">
                    No skater statistics available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goalie Stats */}
      {sortedGoalies.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-semibold">Goaltender Statistics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">#</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Player</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">GP</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">W</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">L</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">GAA</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">SV%</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-muted)]">SO</th>
                </tr>
              </thead>
              <tbody>
                {sortedGoalies.map((goalie) => {
                  const stats = rosterStatsByPlayer[goalie.player_id];
                  const gp = stats?.games_played ?? 0;
                  return (
                    <tr key={goalie.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)]">
                      <td className="py-3 px-4">{goalie.jersey_number || '-'}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/${leagueSlug}/players/${goalie.player_id}`}
                          className="font-medium hover:text-[var(--league-primary)] transition-colors"
                        >
                          {goalie.profile?.full_name || 'Unknown'}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? gp : '-'}</td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? (stats?.wins ?? 0) : '-'}</td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? (stats?.losses ?? 0) : '-'}</td>
                      <td className="py-3 px-4 text-center">{gp > 0 && stats?.goals_against_average != null ? stats.goals_against_average.toFixed(2) : '-'}</td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? formatSavePercentage(stats?.save_percentage ?? null) : '-'}</td>
                      <td className="py-3 px-4 text-center">{gp > 0 ? (stats?.shutouts ?? 0) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Schedule Tab
// =============================================================================

function ScheduleTab({
  upcomingGames,
  recentGames,
  teamId,
  leagueSlug,
}: {
  upcomingGames: ScheduleGame[];
  recentGames: ScheduleGame[];
  teamId: string;
  leagueSlug: string;
}) {
  return (
    <div className="space-y-8">
      {/* Upcoming Games */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
          Upcoming Games
        </h3>
        {upcomingGames.length > 0 ? (
          <div className="space-y-3">
            {upcomingGames.slice(0, 5).map((game) => (
              <GameRow key={game.id} game={game} teamId={teamId} leagueSlug={leagueSlug} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-[var(--color-text-secondary)]">
            No upcoming games scheduled
          </div>
        )}
      </div>

      {/* Recent Results */}
      {recentGames.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--league-primary)]" />
            Recent Results
          </h3>
          <div className="space-y-3">
            {recentGames.map((game) => (
              <GameRow key={game.id} game={game} teamId={teamId} leagueSlug={leagueSlug} showResult />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GameRow({
  game,
  teamId,
  leagueSlug,
  showResult,
}: {
  game: ScheduleGame;
  teamId: string;
  leagueSlug: string;
  showResult?: boolean;
}) {
  const isHome = game.home_team?.id === teamId;
  const opponent = isHome ? game.away_team : game.home_team;
  const gameDate = new Date(game.scheduled_at);

  // Determine result
  let result = '';
  let resultColor = '';
  if (showResult && game.status === 'completed') {
    const myScore = isHome ? game.home_score : game.away_score;
    const theirScore = isHome ? game.away_score : game.home_score;
    if (myScore! > theirScore!) {
      result = 'W';
      resultColor = 'text-green-400';
    } else if (myScore! < theirScore!) {
      result = 'L';
      resultColor = 'text-red-400';
    } else {
      result = 'T';
      resultColor = 'text-[var(--color-text-secondary)]';
    }
  }

  return (
    <Link
      href={`/${leagueSlug}/games/${game.id}`}
      className="card p-4 flex items-center gap-4 hover:border-[var(--league-primary)] transition-colors"
    >
      {/* Date */}
      <div className="text-center min-w-[60px]">
        <p className="text-sm font-semibold">{format(gameDate, 'MMM d')}</p>
        <p className="text-xs text-[var(--color-text-secondary)]">{format(gameDate, 'h:mm a')}</p>
      </div>

      {/* Home/Away indicator */}
      <div className="text-xs text-[var(--color-text-muted)] w-8">
        {isHome ? 'vs' : '@'}
      </div>

      {/* Opponent */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {opponent?.logo ? (
          <Image src={opponent.logo} alt={opponent.name} width={32} height={32} className="rounded" />
        ) : (
          <div className="w-8 h-8 rounded bg-[var(--league-primary)] flex items-center justify-center text-sm font-bold text-[var(--color-accent-text)]">
            {opponent?.name?.charAt(0) || '?'}
          </div>
        )}
        <span className="font-medium truncate">{opponent?.name || 'TBD'}</span>
      </div>

      {/* Score/Result */}
      {showResult && game.status === 'completed' ? (
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">
            {isHome ? game.home_score : game.away_score}-{isHome ? game.away_score : game.home_score}
          </span>
          <span className={`text-sm font-bold ${resultColor}`}>{result}</span>
        </div>
      ) : (
        <div className="text-sm text-[var(--color-text-secondary)]">
          {game.venue || 'TBD'}
        </div>
      )}
    </Link>
  );
}
