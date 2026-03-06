import { notFound } from 'next/navigation';
import { Trophy, Crown } from 'lucide-react';
import type { Metadata } from 'next';
import { getLeagueBySlug, getSeasons, getCurrentSeason } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { SeasonSelector } from '@/components/SeasonSelector';
import { SeedPreviewButton } from '@/components/playoffs/SeedPreviewButton';

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
}

async function getPlayoffBracket(leagueId: string, seasonId: string): Promise<PlayoffSeries[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('playoff_series')
    .select(`
      id, round_number, series_number,
      high_seed_id, low_seed_id,
      high_seed_wins, low_seed_wins,
      winner_id, status,
      high_seed:teams!playoff_series_high_seed_id_fkey(name, logo_url),
      low_seed:teams!playoff_series_low_seed_id_fkey(name, logo_url),
      winner:teams!playoff_series_winner_id_fkey(name)
    `)
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .order('round_number')
    .order('series_number');

  if (error || !data) return [];
  return data as unknown as PlayoffSeries[];
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

function SeriesCard({ series, totalRounds }: { series: PlayoffSeries; totalRounds: number }) {
  const isCompleted = series.status === 'completed';
  const hasTeams = series.high_seed_id || series.low_seed_id;
  const isByeHigh = series.high_seed_id === null;
  const isByeLow = series.low_seed_id === null;

  return (
    <div
      className={`rounded-xl border p-1 min-w-[180px] ${
        isCompleted
          ? 'border-white/15 bg-[var(--color-surface)]'
          : hasTeams
          ? 'border-[var(--league-primary)]/30 bg-[var(--color-surface)]'
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
    </div>
  );
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

  const series = activeSeason ? await getPlayoffBracket(league.id, activeSeason.id) : [];

  const hasBracket = series.length > 0;
  const totalRounds = hasBracket ? Math.max(...series.map((s) => s.round_number)) : 0;

  // Group by round
  const byRound: Record<number, PlayoffSeries[]> = {};
  for (const s of series) {
    if (!byRound[s.round_number]) byRound[s.round_number] = [];
    byRound[s.round_number].push(s);
  }

  // Find champion (winner of final series)
  const finalSeries = hasBracket ? series.find((s) => s.round_number === totalRounds && s.status === 'completed') : null;
  const champion = finalSeries?.winner ?? null;

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-6 h-6 text-[var(--league-primary)]" />
            <h1 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
              Playoff Bracket
            </h1>
            {activeSeason && (
              <SeedPreviewButton
                leagueId={league.id}
                seasonId={activeSeason.id}
                seasonName={activeSeason.name}
              />
            )}
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

        {/* Bracket */}
        {hasBracket ? (
          <div className="overflow-x-auto">
            <div className="flex gap-8 min-w-max pb-4">
              {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
                const roundSeries = byRound[round] ?? [];
                return (
                  <div key={round} className="flex flex-col">
                    {/* Round label */}
                    <div className="mb-4 text-center">
                      <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                        {getRoundLabel(round, totalRounds)}
                      </span>
                    </div>

                    {/* Series in this round — vertically spaced to suggest bracket alignment */}
                    <div
                      className="flex flex-col"
                      style={{ gap: `${Math.pow(2, round - 1) * 0.5}rem` }}
                    >
                      {roundSeries.map((s) => (
                        <div
                          key={s.id}
                          style={{ marginTop: round > 1 ? `${Math.pow(2, round - 2) * 0.5}rem` : 0 }}
                        >
                          <SeriesCard series={s} totalRounds={totalRounds} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-30" />
            <p className="text-lg font-semibold text-[var(--color-text-secondary)]">
              Playoff bracket not yet generated
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] opacity-60 mt-1">
              Check back when the playoffs begin.
            </p>
            {activeSeason && (
              <div className="mt-4">
                <SeedPreviewButton
                  leagueId={league.id}
                  seasonId={activeSeason.id}
                  seasonName={activeSeason.name}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
