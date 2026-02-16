import { notFound } from 'next/navigation';
import {
  getLeagueBySlug,
  getSeasons,
  getStandings,
  getStatsLeaders,
  getGoalieLeaders,
  getLeagueAwards,
  getLeagueStats,
  getChampionshipRoster,
  getChampionshipGame,
  getLegacyChampions,
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
} from 'lucide-react';
import { ExpandableLeaderBoard, ExpandableGoalieLeaderBoard } from '@/components/history/ExpandableLeaderBoard';
import { ChampionsTimeline, type TimelineChampion } from '@/components/history/ChampionsTimeline';
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
    getStatsLeaders(league.id, 'points', 25),
    getStatsLeaders(league.id, 'goals', 25),
    getStatsLeaders(league.id, 'assists', 25),
    getGoalieLeaders(league.id, undefined, 'wins', 25),
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

  // Fetch championship details (roster + final game) for each champion
  const championDetails = await Promise.all(
    seasonsWithChampions
      .filter(s => s.champion)
      .map(async (season) => {
        const [roster, finalGame] = await Promise.all([
          getChampionshipRoster(season.champion!.team_id, season.id),
          getChampionshipGame(season.id, season.champion!.team_id),
        ]);
        return { seasonId: season.id, roster, finalGame };
      })
  );

  const championDetailsMap = new Map(championDetails.map(d => [d.seasonId, d]));

  // Build timeline data: merge database champions + legacy photos
  const legacyChampions = getLegacyChampions(leagueSlug);

  const dbTimelineEntries: TimelineChampion[] = seasonsWithChampions
    .filter(s => s.champion)
    .map(season => {
      const details = championDetailsMap.get(season.id);
      const startYear = new Date(season.start_date).getFullYear();
      const endYear = new Date(season.end_date).getFullYear();
      const year = startYear === endYear ? `${startYear}` : `${startYear}-${String(endYear).slice(2)}`;
      return {
        id: season.id,
        type: 'database' as const,
        year,
        seasonName: season.name,
        teamName: season.champion!.team_name,
        teamLogo: season.champion!.team_logo,
        photo: (season as any).photo_gallery_url?.[0] || null,
        record: {
          wins: season.champion!.wins,
          losses: season.champion!.losses,
          ties: season.champion!.ties,
        },
        seasonId: season.id,
        roster: details?.roster || [],
        finalGame: details?.finalGame || null,
        seasonSummary: (season as any).season_summary || null,
      };
    });

  const legacyTimelineEntries: TimelineChampion[] = legacyChampions.map((lc, i) => ({
    id: `legacy-${i}`,
    type: 'legacy' as const,
    year: lc.year,
    seasonName: `${lc.year} Season`,
    teamName: lc.teamName || `${lc.year} Champions`,
    photo: lc.photo,
    record: null,
    roster: [],
    finalGame: null,
  }));

  // Merge and sort: newest first
  const allTimelineChampions = [...dbTimelineEntries, ...legacyTimelineEntries]
    .sort((a, b) => {
      const yearA = parseInt(a.year.split('-')[0]);
      const yearB = parseInt(b.year.split('-')[0]);
      return yearB - yearA;
    });

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
        {/* Champions Timeline */}
        <section>
          <SectionHeader icon={<Trophy className="w-5 h-5 text-amber-400" />} title="Champions Wall" />
          <ChampionsTimeline champions={allTimelineChampions} leagueSlug={leagueSlug} />
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
              <ExpandableLeaderBoard title="Points Leaders" icon={<Target className="w-4 h-4 text-[var(--league-primary)]" />} leaders={pointsLeaders.map((p) => ({ name: p.player_name, value: p.points, team: p.team_name }))} />
              <ExpandableLeaderBoard title="Goals Leaders" icon={<Target className="w-4 h-4 text-red-400" />} leaders={goalsLeaders.map((p) => ({ name: p.player_name, value: p.goals, team: p.team_name }))} />
              <ExpandableLeaderBoard title="Assists Leaders" icon={<Target className="w-4 h-4 text-blue-400" />} leaders={assistsLeaders.map((p) => ({ name: p.player_name, value: p.assists, team: p.team_name }))} />
            </div>
          </section>
        )}

        {/* Goalie Legends */}
        {goalieLeaders.length > 0 && (
          <section>
            <SectionHeader icon={<Shield className="w-5 h-5 text-blue-400" />} title="Goalie Legends" />
            <ExpandableGoalieLeaderBoard leaders={goalieLeaders} />
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


