import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Crown } from 'lucide-react';
import type { Metadata } from 'next';
import { getLeagueBySlug, getSeasons, getCurrentSeason, getStandings } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { SeasonSelector } from '@/components/SeasonSelector';
import { PlayoffPreviewPanel } from '@/components/playoffs/PlayoffPreviewPanel';
import { buildPlayoffPreviewContext, type PlayoffPreviewContext } from '@/lib/playoffs/preview';

interface PlayoffsPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ season?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return { title: 'Playoffs' };
  return {
    title: `Playoff Bracket | ${league.name}`,
    description: `Follow the ${league.name} playoff bracket and series results`,
  };
}

interface PlayoffSeries {
  division_id: string | null;
  division_name: string | null;
  id: string;
  round_number: number;
  series_number: number;
  high_seed_id: string | null;
  low_seed_id: string | null;
  high_seed_wins: number;
  low_seed_wins: number;
  winner_id: string | null;
  status: string;
  high_seed: { name: string; logo_url: string | null } | null;
  low_seed: { name: string; logo_url: string | null } | null;
  winner: { name: string } | null;
  next_game_at?: string | null;
  next_game_location?: string | null;
}

const PLAYOFF_SERIES_DIVISION_ID_MISSING =
  "Could not find the 'division_id' column of 'playoff_series' in the schema cache";

function isMissingPlayoffSeriesDivisionScopeError(
  error: { message?: string | null } | null | undefined,
) {
  return error?.message?.includes(PLAYOFF_SERIES_DIVISION_ID_MISSING) ?? false;
}

async function hasPlayoffSeriesDivisionScope(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase
    .from('playoff_series')
    .select('id, division_id')
    .limit(1);

  if (isMissingPlayoffSeriesDivisionScopeError(error)) {
    return false;
  }

  return true;
}

async function getPlayoffBracket(leagueId: string, seasonId: string): Promise<PlayoffSeries[]> {
  const supabase = await createClient();
  const divisionScopeEnabled = await hasPlayoffSeriesDivisionScope(supabase);
  const seriesSelect = divisionScopeEnabled
    ? `
      id, division_id, round_number, series_number,
      high_seed_id, low_seed_id,
      high_seed_wins, low_seed_wins,
      winner_id, status,
      high_seed:teams!playoff_series_high_seed_id_fkey(name, logo_url),
      low_seed:teams!playoff_series_low_seed_id_fkey(name, logo_url),
      winner:teams!playoff_series_winner_id_fkey(name)
    `
    : `
      id, round_number, series_number,
      high_seed_id, low_seed_id,
      high_seed_wins, low_seed_wins,
      winner_id, status,
      high_seed:teams!playoff_series_high_seed_id_fkey(name, logo_url),
      low_seed:teams!playoff_series_low_seed_id_fkey(name, logo_url),
      winner:teams!playoff_series_winner_id_fkey(name)
    `;

  // The selected shape changes when older environments still lack division_id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playoffSeriesTable: any = supabase.from('playoff_series');
  const { data, error } = await playoffSeriesTable
    .select(seriesSelect)
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .order('round_number')
    .order('series_number');

  if (error || !data) return [];

  const { data: scheduledGames } = await supabase
    .from('games')
    .select('id, playoff_series_id, scheduled_at, location, status')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('game_type', 'playoff')
    .not('playoff_series_id', 'is', null)
    .order('scheduled_at', { ascending: true });

  const dataRows = data as Array<{ id: string; division_id?: string | null } & Omit<PlayoffSeries, 'division_id' | 'division_name' | 'next_game_at' | 'next_game_location'>>;
  const divisionIds = divisionScopeEnabled
    ? [...new Set(
      dataRows
        .map((row) => row.division_id)
        .filter((value: string | null | undefined): value is string => Boolean(value)),
    )]
    : [];

  const divisionNameById = new Map<string, string>();
  if (divisionIds.length > 0) {
    const { data: divisions } = await supabase
      .from('divisions')
      .select('id, name')
      .in('id', divisionIds);

    for (const division of divisions ?? []) {
      divisionNameById.set(division.id, division.name);
    }
  }

  const nextGameBySeriesId = new Map<string, { scheduledAt: string; location: string | null }>();
  const now = Date.now();
  for (const game of scheduledGames ?? []) {
    if (!game.playoff_series_id || game.status === 'cancelled' || game.status === 'completed') {
      continue;
    }

    if (new Date(game.scheduled_at).getTime() < now) {
      continue;
    }

    if (!nextGameBySeriesId.has(game.playoff_series_id)) {
      nextGameBySeriesId.set(game.playoff_series_id, {
        scheduledAt: game.scheduled_at,
        location: game.location ?? null,
      });
    }
  }

  return dataRows.map((row) => ({
    ...row,
    division_id: divisionScopeEnabled ? row.division_id ?? null : null,
    division_name: divisionScopeEnabled && row.division_id
      ? divisionNameById.get(row.division_id) ?? null
      : null,
    next_game_at: nextGameBySeriesId.get(row.id)?.scheduledAt ?? null,
    next_game_location: nextGameBySeriesId.get(row.id)?.location ?? null,
  })) as PlayoffSeries[];
}

async function getPlayoffPreviewContextData(
  leagueId: string,
  seasonId: string,
): Promise<PlayoffPreviewContext> {
  return buildPlayoffPreviewContext(await getStandings(leagueId, seasonId));
}

function getRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round + 1;
  if (fromEnd === 1) return 'Championship';
  if (fromEnd === 2) return 'Semifinals';
  if (fromEnd === 3) return 'Quarterfinals';
  return `Round ${round}`;
}

function TeamRow({
  name,
  logoUrl,
  wins,
  isWinner,
  isBye,
}: {
  name: string | null;
  logoUrl?: string | null;
  wins: number;
  isWinner: boolean;
  isBye: boolean;
}) {
  if (isBye) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 opacity-40">
        <span className="text-xs text-[var(--color-text-secondary)] italic">BYE</span>
      </div>
    );
  }

  if (!name) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 opacity-30">
        <div className="w-6 h-6 rounded-full bg-white/10" />
        <span className="text-sm text-[var(--color-text-secondary)]">TBD</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors ${
        isWinner
          ? 'bg-[var(--league-primary)]/15 border border-[var(--league-primary)]/30'
          : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={name} className="w-5 h-5 rounded object-contain flex-shrink-0" />
        ) : (
          <div
            className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: 'var(--league-primary)', color: 'var(--color-accent-text)' }}
          >
            {name.charAt(0)}
          </div>
        )}
        <span className={`text-sm truncate font-medium ${isWinner ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-primary)]'}`}>
          {name}
        </span>
      </div>
      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${isWinner ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
        {wins}
      </span>
    </div>
  );
}

function SeriesCard({ series, totalRounds: _totalRounds }: { series: PlayoffSeries; totalRounds: number }) {
  const isCompleted = series.status === 'completed';
  const hasTeams = series.high_seed_id || series.low_seed_id;
  const isByeHigh = series.high_seed_id === null;
  const isByeLow = series.low_seed_id === null;

  return (
    <div
      className={`rounded-xl border p-1 min-w-[180px] ${
        isCompleted
          ? 'glass-card-strong border-white/15'
          : hasTeams
          ? 'glass-card-strong border-[var(--league-primary)]/30'
          : 'border-white/5 bg-[var(--color-surface)]/50 opacity-60'
      }`}
    >
      <TeamRow
        name={series.high_seed?.name ?? null}
        logoUrl={series.high_seed?.logo_url}
        wins={series.high_seed_wins}
        isWinner={isCompleted && series.winner_id === series.high_seed_id}
        isBye={isByeHigh && series.low_seed_id !== null}
      />
      <div className="h-px bg-white/10 mx-2" />
      <TeamRow
        name={series.low_seed?.name ?? null}
        logoUrl={series.low_seed?.logo_url}
        wins={series.low_seed_wins}
        isWinner={isCompleted && series.winner_id === series.low_seed_id}
        isBye={isByeLow && series.high_seed_id !== null}
      />
      {series.next_game_at ? (
        <div className="border-t border-white/10 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] opacity-70">
            Next Game
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--color-text-primary)]">
            {new Date(series.next_game_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          {series.next_game_location ? (
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              {series.next_game_location}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PlayoffSection = {
  key: string;
  divisionId: string | null;
  divisionName: string | null;
  rounds: number;
  roundNumbers: number[];
  seriesByRound: Record<number, PlayoffSeries[]>;
  champion: PlayoffSeries | null;
};

function groupPlayoffSections(series: PlayoffSeries[]): PlayoffSection[] {
  const sections = new Map<string, PlayoffSection>();

  for (const entry of series) {
    const key = entry.division_id ?? 'overall';
    const section = sections.get(key) ?? {
      key,
      divisionId: entry.division_id ?? null,
      divisionName: entry.division_name ?? null,
      rounds: 0,
      roundNumbers: [],
      seriesByRound: {},
      champion: null,
    };

    section.rounds = Math.max(section.rounds, entry.round_number);
    if (!section.seriesByRound[entry.round_number]) {
      section.seriesByRound[entry.round_number] = [];
      section.roundNumbers.push(entry.round_number);
    }
    section.seriesByRound[entry.round_number].push(entry);
    sections.set(key, section);
  }

  return [...sections.values()]
    .map((section) => {
      for (const round of Object.keys(section.seriesByRound).map(Number)) {
        section.seriesByRound[round].sort((a, b) => a.series_number - b.series_number);
      }

      section.roundNumbers.sort((a, b) => a - b);
      section.champion = section.seriesByRound[section.rounds]?.find(
        (entry) => entry.status === 'completed' && entry.winner_id,
      ) ?? null;

      return section;
    })
    .sort((a, b) => {
      if (!a.divisionName && !b.divisionName) return 0;
      if (!a.divisionName) return -1;
      if (!b.divisionName) return 1;
      return a.divisionName.localeCompare(b.divisionName);
    });
}

export default async function PlayoffsPage({ params, searchParams }: PlayoffsPageProps) {
  const { leagueSlug } = await params;
  const { season: seasonParam } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const [seasons, defaultSeason] = await Promise.all([
    getSeasons(league.id),
    getCurrentSeason(league.id),
  ]);

  const activeSeason = seasonParam
    ? seasons.find((s) => s.id === seasonParam) ?? defaultSeason
    : defaultSeason;

  const [series, previewContext] = activeSeason
    ? await Promise.all([
        getPlayoffBracket(league.id, activeSeason.id),
        getPlayoffPreviewContextData(league.id, activeSeason.id),
      ])
    : [[], null];

  const hasBracket = series.length > 0;
  const sections = hasBracket ? groupPlayoffSections(series) : [];
  const multipleSections = sections.length > 1;
  const champion = !multipleSections
    ? sections[0]?.champion?.winner ?? null
    : null;

  return (
    <main className="league-page-shell min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">

        {/* Header */}
        <div className="glass-card mb-8 rounded-[32px] p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-6 h-6 text-[var(--league-primary)]" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--league-primary)]">Postseason monitor</p>
              <h1 className="text-4xl font-black text-[var(--color-text-primary)] tracking-tight md:text-5xl">Playoff Bracket</h1>
            </div>
          </div>
          <p className="text-[var(--color-text-secondary)]">{league.name}</p>
        </div>

        {/* Season selector */}
        {seasons.length > 1 && (
          <div className="mb-6">
            <SeasonSelector
              seasons={seasons}
              currentSeasonId={activeSeason?.id ?? null}
              leagueSlug={leagueSlug}
              basePath="playoffs"
            />
          </div>
        )}

        {activeSeason && previewContext && (
          <PlayoffPreviewPanel
            leagueId={league.id}
            seasonId={activeSeason.id}
            seasonName={activeSeason.name}
            previewContext={previewContext}
          />
        )}

        {/* Champion banner */}
        {champion && (
          <div
            className="mb-8 p-5 rounded-2xl border flex items-center gap-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--league-primary) 12%, transparent)',
              borderColor: 'var(--league-primary)',
            }}
          >
            <Crown className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--league-primary)' }} />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                {activeSeason?.name} Champions
              </p>
              <p className="text-2xl font-black text-[var(--color-text-primary)]">{champion.name}</p>
            </div>
          </div>
        )}

        {multipleSections && (
          <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <div
                key={section.key}
                className="glass-card rounded-2xl p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-secondary)] opacity-70">
                  Division Champion
                </p>
                <h2 className="mt-2 text-xl font-black text-[var(--color-text-primary)]">
                  {section.divisionName ?? 'Overall bracket'}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {section.champion?.winner?.name ?? 'Still in progress'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Bracket */}
        {hasBracket ? (
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.key}>
                {(multipleSections || section.divisionName) && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-secondary)] opacity-70">
                      Official Bracket
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">
                      {section.divisionName ?? 'Overall bracket'}
                    </h2>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <div className="flex gap-8 min-w-max pb-4">
                    {section.roundNumbers.map((round) => {
                      const roundSeries = section.seriesByRound[round] ?? [];
                      return (
                        <div key={`${section.key}-${round}`} className="flex flex-col">
                          <div className="mb-4 text-center">
                            <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                              {getRoundLabel(round, section.rounds)}
                            </span>
                          </div>

                          <div
                            className="flex flex-col"
                            style={{ gap: `${Math.pow(2, round - 1) * 0.5}rem` }}
                          >
                            {roundSeries.map((entry) => (
                              <div
                                key={entry.id}
                                style={{ marginTop: round > 1 ? `${Math.pow(2, round - 2) * 0.5}rem` : 0 }}
                              >
                                <SeriesCard series={entry} totalRounds={section.rounds} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[32px] py-20 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-[var(--league-primary)]/70" />
            <p className="text-lg font-semibold text-[var(--color-text-secondary)]">
              Playoff bracket not yet generated
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] opacity-60 mt-1">
              Check back when the official bracket is generated.
            </p>
            <div className="mt-6 hidden justify-center gap-3 lg:flex">
              <Link href={`/${leagueSlug}/standings`} className="glass-control inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:border-[var(--league-primary)]/45">
                Current standings
              </Link>
              <Link href={`/${leagueSlug}/schedule`} className="inline-flex min-h-11 items-center rounded-full bg-[var(--league-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)]">
                Schedule
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
