import type { ReactNode } from 'react';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, ImageIcon, Sparkles, Trophy } from 'lucide-react';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { getStandings } from '@/lib/standings/actions';
import { LeagueLogo } from '@/components/ui/league-logo';
import { SocialGraphicsWorkspace } from './SocialGraphicsWorkspace';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type RawGameRow = {
  id: string;
  season_id: string;
  scheduled_at: string;
  location: string | null;
  home_score: number | null;
  away_score: number | null;
  round_number: number | null;
  game_number: number | null;
  home_team: {
    id: string;
    name: string;
    short_name: string | null;
    primary_color: string | null;
  } | null;
  away_team: {
    id: string;
    name: string;
    short_name: string | null;
    primary_color: string | null;
  } | null;
};

export default async function LeagueSocialGraphicsPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const [{ data: league }, { data: seasons }, { data: games }] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name, logo_url, primary_color, secondary_color, city, state_province, timezone')
      .eq('id', leagueId)
      .single(),
    supabase
      .from('seasons')
      .select('id, name, status, start_date')
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false }),
    supabase
      .from('games')
      .select(`
        id,
        season_id,
        scheduled_at,
        location,
        home_score,
        away_score,
        round_number,
        game_number,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color)
      `)
      .eq('league_id', leagueId)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false }),
  ]);

  if (!league) {
    notFound();
  }

  const seasonRows = seasons ?? [];
  const completedGames = (games ?? []) as RawGameRow[];

  const standingsBySeason = new Map(
    await Promise.all(
      seasonRows.map(async (season) => [season.id, await getStandings(season.id)] as const),
    ),
  );

  const seasonData = seasonRows.map((season) => ({
    id: season.id,
    name: season.name,
    status: season.status,
    standings: (standingsBySeason.get(season.id) ?? []).map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      shortName: team.shortName,
      points: team.points,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDiff: team.goalDiff,
      rank: team.rank,
    })),
    games: completedGames
      .filter((game) => game.season_id === season.id)
      .map((game) => ({
        id: game.id,
        seasonId: game.season_id,
        scheduledAt: game.scheduled_at,
        location: game.location,
        homeScore: game.home_score ?? 0,
        awayScore: game.away_score ?? 0,
        roundNumber: game.round_number,
        gameNumber: game.game_number,
        homeTeam: game.home_team
          ? {
              id: game.home_team.id,
              name: game.home_team.name,
              shortName: game.home_team.short_name,
              primaryColor: game.home_team.primary_color,
            }
          : null,
        awayTeam: game.away_team
          ? {
              id: game.away_team.id,
              name: game.away_team.name,
              shortName: game.away_team.short_name,
              primaryColor: game.away_team.primary_color,
            }
          : null,
      })),
  }));

  const totalGraphicsReady = seasonData.filter((season) => season.games.length > 0).length;
  const totalGames = completedGames.length;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {league.name}
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <LeagueLogo
                logoUrl={league.logo_url}
                leagueName={league.name}
                primaryColor={league.primary_color || '#22D3EE'}
                size="lg"
                shape="square"
                bordered
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rink-300/80">
                  Social Graphics
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                  {league.name} creative workspace
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-300">
                  Generate real score cards, weekly recaps, and standings updates from completed games and live standings, then preview and download them on the spot.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.10] bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-neutral-300">
                {league.timezone || 'Timezone not set'}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <InfoMetric
              label="Completed games"
              value={String(totalGames)}
              helper="Ready to turn into graphics"
            />
            <InfoMetric
              label="Season coverage"
              value={String(totalGraphicsReady)}
              helper={`${seasonData.length} season${seasonData.length === 1 ? '' : 's'} loaded`}
            />
            <InfoMetric
              label="Exports"
              value="SVG downloads"
              helper="Vector output for posting or editing"
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center gap-2 text-neutral-400">
              <span className="rounded-xl bg-rink-500/10 p-2 text-rink-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                What this workspace does
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <StepRow title="Score cards" body="Pick any completed game in the selected week and export a branded final-score card." icon={<ImageIcon className="h-4 w-4" />} />
              <StepRow title="Weekly recaps" body="Bundle a week of final scores into one consistent roundup graphic for league channels." icon={<Download className="h-4 w-4" />} />
              <StepRow title="Standings updates" body="Turn the live standings table into a clean rankings graphic without leaving the league dashboard." icon={<Trophy className="h-4 w-4" />} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-300">
              <li>Built from real completed games only.</li>
              <li>Week windows are grouped into deterministic seven-day buckets inside each season.</li>
              <li>Exports are SVG so owners can post immediately or refine in design tools later.</li>
            </ul>
          </div>
        </section>

        <SocialGraphicsWorkspace
          league={{
            id: league.id,
            name: league.name,
            primaryColor: league.primary_color,
            secondaryColor: league.secondary_color,
            city: league.city,
            stateProvince: league.state_province,
            timezone: league.timezone,
          }}
          seasons={seasonData}
        />
      </div>
    </div>
  );
}

function InfoMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4 backdrop-blur-xl">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-3 truncate text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-neutral-400">{helper}</p>
    </div>
  );
}

function StepRow({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-rink-300">
        {icon}
        <p className="font-semibold text-white">{title}</p>
      </div>
      <p className="mt-2 leading-6 text-neutral-400">{body}</p>
    </div>
  );
}
