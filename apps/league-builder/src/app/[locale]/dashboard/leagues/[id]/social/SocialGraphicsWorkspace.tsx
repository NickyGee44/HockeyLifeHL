'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarRange, Download, ImageIcon, RefreshCw, Trophy } from 'lucide-react';

type SocialGameTeam = {
  id: string;
  name: string;
  shortName: string | null;
  primaryColor: string | null;
};

type SocialGame = {
  id: string;
  seasonId: string;
  scheduledAt: string;
  location: string | null;
  homeScore: number;
  awayScore: number;
  roundNumber: number | null;
  gameNumber: number | null;
  homeTeam: SocialGameTeam | null;
  awayTeam: SocialGameTeam | null;
};

type SocialStanding = {
  teamId: string;
  teamName: string;
  shortName: string;
  points: number;
  wins: number;
  losses: number;
  ties: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  rank: number;
  primaryColor: string | null;
};

type SocialSeason = {
  id: string;
  name: string;
  status: string | null;
  standings: SocialStanding[];
  standingsSnapshots: Array<{
    weekId: string;
    standings: Array<{
      teamId: string;
      rank: number;
    }>;
  }>;
  games: SocialGame[];
};

type Props = {
  league: {
    id: string;
    name: string;
    primaryColor: string | null;
    secondaryColor: string | null;
    city: string | null;
    stateProvince: string | null;
    timezone: string | null;
  };
  seasons: SocialSeason[];
};

type GraphicContext = 'score-card' | 'weekly-recap' | 'standings-update';

type WeekOption = {
  id: string;
  label: string;
  start: string;
  end: string;
  games: SocialGame[];
};

type RenderState = {
  seasonId: string;
  weekId: string;
  context: GraphicContext;
  gameId: string;
  svgMarkup: string;
};

const TEMPLATE_META: Record<GraphicContext, { label: string; icon: typeof ImageIcon; accent: string }> = {
  'score-card': { label: 'Score card', icon: ImageIcon, accent: '#38bdf8' },
  'weekly-recap': { label: 'Weekly recap', icon: CalendarRange, accent: '#e879f9' },
  'standings-update': { label: 'Standings update', icon: Trophy, accent: '#fbbf24' },
};

const SVG_WIDTH = 1080;
const SVG_HEIGHT = 1350;

export function SocialGraphicsWorkspace({ league, seasons }: Props) {
  const defaultSeasonId = useMemo(() => {
    const activeWithGames = seasons.find((season) => season.status === 'active' && season.games.length > 0);
    return activeWithGames?.id ?? seasons.find((season) => season.games.length > 0)?.id ?? seasons[0]?.id ?? '';
  }, [seasons]);

  const [seasonId, setSeasonId] = useState(defaultSeasonId);
  const [context, setContext] = useState<GraphicContext>('score-card');
  const [weekId, setWeekId] = useState('all');
  const [gameId, setGameId] = useState('');
  const [rendered, setRendered] = useState<RenderState | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === seasonId) ?? seasons[0] ?? null,
    [seasonId, seasons],
  );

  const weekOptions = useMemo(() => buildWeekOptions(selectedSeason?.games ?? []), [selectedSeason?.games]);

  useEffect(() => {
    const fallbackWeekId = weekOptions[0]?.id ?? 'all';
    setWeekId((current) => (weekOptions.some((week) => week.id === current) ? current : fallbackWeekId));
  }, [weekOptions]);

  const selectedWeek = useMemo(
    () => weekOptions.find((week) => week.id === weekId) ?? weekOptions[0] ?? null,
    [weekId, weekOptions],
  );

  const weekGames = selectedWeek?.games ?? selectedSeason?.games ?? [];

  useEffect(() => {
    const fallbackGameId = weekGames[0]?.id ?? '';
    setGameId((current) => (weekGames.some((game) => game.id === current) ? current : fallbackGameId));
  }, [weekGames]);

  const selectedGame = useMemo(
    () => weekGames.find((game) => game.id === gameId) ?? weekGames[0] ?? null,
    [gameId, weekGames],
  );

  useEffect(() => {
    if (!selectedSeason) {
      setRendered(null);
      return;
    }

    setRendered((current) => {
      if (current) return current;
      const svgMarkup = renderGraphic({ league, season: selectedSeason, week: selectedWeek, game: selectedGame, context });
      return {
        seasonId: selectedSeason.id,
        weekId: selectedWeek?.id ?? 'all',
        context,
        gameId: selectedGame?.id ?? '',
        svgMarkup,
      };
    });
  }, [context, league, selectedGame, selectedSeason, selectedWeek]);

  const currentSvgMarkup = useMemo(() => {
    if (!selectedSeason) return '';
    return renderGraphic({ league, season: selectedSeason, week: selectedWeek, game: selectedGame, context });
  }, [context, league, selectedGame, selectedSeason, selectedWeek]);

  const activeSvgMarkup = rendered?.svgMarkup ?? '';
  const isDirty =
    rendered?.seasonId !== selectedSeason?.id ||
    rendered?.weekId !== (selectedWeek?.id ?? 'all') ||
    rendered?.context !== context ||
    rendered?.gameId !== (selectedGame?.id ?? '');

  const downloadBaseName = useMemo(() => {
    const base = slugify(league.name || 'league');
    const season = slugify(selectedSeason?.name || 'season');
    const week = slugify(selectedWeek?.id || 'all');
    return `${base}-${season}-${context}-${week}`;
  }, [context, league.name, selectedSeason?.name, selectedWeek?.id]);

  const handleGenerate = () => {
    if (!selectedSeason) return;
    setRendered({
      seasonId: selectedSeason.id,
      weekId: selectedWeek?.id ?? 'all',
      context,
      gameId: selectedGame?.id ?? '',
      svgMarkup: currentSvgMarkup,
    });
  };

  const handleDownloadSvg = () => {
    if (!activeSvgMarkup) return;
    downloadBlob(new Blob([activeSvgMarkup], { type: 'image/svg+xml;charset=utf-8' }), `${downloadBaseName}.svg`);
  };

  const handleDownloadPng = async () => {
    if (!activeSvgMarkup || isExportingPng) return;
    setIsExportingPng(true);
    try {
      const pngBlob = await svgToPngBlob(activeSvgMarkup, SVG_WIDTH, SVG_HEIGHT);
      downloadBlob(pngBlob, `${downloadBaseName}.png`);
    } finally {
      setIsExportingPng(false);
    }
  };

  const totalPoints = (selectedSeason?.standings ?? []).reduce((sum, team) => sum + team.points, 0);

  return (
    <section className="mt-8 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rink-300/80">Generator</p>
          <h2 className="mt-2 text-2xl font-black text-white">Build a live graphic</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Pick a season, a week, and a graphic type. The preview is rendered from completed games and live standings snapshots.
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Season">
              <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-rink-400">
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Graphic type">
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(TEMPLATE_META) as GraphicContext[]).map((key) => {
                  const meta = TEMPLATE_META[key];
                  const Icon = meta.icon;
                  const active = context === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setContext(key)}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        active ? 'border-rink-400/60 bg-rink-500/10 text-white' : 'border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/20'
                      }`}
                    >
                      <span className="rounded-xl p-2" style={{ backgroundColor: `${meta.accent}22`, color: meta.accent }}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Week window">
              <select value={weekId} onChange={(event) => setWeekId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-rink-400">
                {weekOptions.map((week) => (
                  <option key={week.id} value={week.id}>
                    {week.label}
                  </option>
                ))}
              </select>
            </Field>

            {context === 'score-card' ? (
              <Field label="Game">
                <select value={gameId} onChange={(event) => setGameId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-rink-400">
                  {weekGames.map((game) => (
                    <option key={game.id} value={game.id}>
                      {formatGameLabel(game)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={handleGenerate} disabled={!currentSvgMarkup} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rink-400/30 bg-rink-500/10 px-4 py-3 text-sm font-semibold text-rink-100 transition hover:bg-rink-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              {rendered ? <RefreshCw className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {rendered ? 'Regenerate preview' : 'Generate preview'}
            </button>
            <button type="button" onClick={handleDownloadSvg} disabled={!activeSvgMarkup} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" />
              Download SVG
            </button>
            <button type="button" onClick={handleDownloadPng} disabled={!activeSvgMarkup || isExportingPng} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" />
              {isExportingPng ? 'Rendering PNG...' : 'Download PNG'}
            </button>
          </div>

          {isDirty ? <p className="mt-3 text-xs text-amber-300">Selections changed. Regenerate to refresh the branded preview before exporting.</p> : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Live data summary</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <Metric label="Completed games" value={String(selectedSeason?.games.length ?? 0)} helper="Across the selected season" />
            <Metric label="Week games" value={String(weekGames.length)} helper={selectedWeek?.label ?? 'No week selected'} />
            <Metric label="Standings rows" value={String(selectedSeason?.standings.length ?? 0)} helper={`${totalPoints} total points in table`} />
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-[#050816] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center justify-between gap-3 px-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Preview</p>
            <h3 className="mt-1 text-lg font-bold text-white">{TEMPLATE_META[context].label}</h3>
          </div>
          <div className="text-right text-xs text-neutral-400">
            <p>1080 × 1350</p>
            <p>SVG and PNG export</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
          {activeSvgMarkup ? <div className="aspect-[4/5] w-full" dangerouslySetInnerHTML={{ __html: activeSvgMarkup }} /> : <div className="flex aspect-[4/5] items-center justify-center p-6 text-center text-sm text-neutral-500">No social graphic can be generated yet. Add completed games to this season first.</div>}
        </div>
      </div>
    </section>
  );
}

function renderGraphic({ league, season, week, game, context }: { league: Props['league']; season: SocialSeason; week: WeekOption | null; game: SocialGame | null; context: GraphicContext }) {
  switch (context) {
    case 'weekly-recap':
      return buildWeeklyRecapSvg({ league, season, week });
    case 'standings-update':
      return buildStandingsSvg({ league, season, week });
    case 'score-card':
    default:
      return buildScoreCardSvg({ league, season, game, week });
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-neutral-400">{helper}</p>
    </div>
  );
}

function buildWeekOptions(games: SocialGame[]): WeekOption[] {
  if (!games.length) {
    return [{ id: 'all', label: 'All completed games', start: '', end: '', games: [] }];
  }

  const sorted = [...games].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const anchor = startOfDay(sorted[0].scheduledAt).getTime();
  const buckets = new Map<number, SocialGame[]>();

  for (const game of sorted) {
    const current = startOfDay(game.scheduledAt).getTime();
    const index = Math.max(0, Math.floor((current - anchor) / WEEK_MS));
    buckets.set(index, [...(buckets.get(index) ?? []), game]);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([index, bucket]) => {
      const dates = bucket.map((game) => new Date(game.scheduledAt).getTime()).sort((a, b) => a - b);
      return {
        id: `week-${index + 1}`,
        label: `Week ${index + 1} • ${formatShortDate(dates[0])} to ${formatShortDate(dates[dates.length - 1])}`,
        start: new Date(dates[0]).toISOString(),
        end: new Date(dates[dates.length - 1]).toISOString(),
        games: [...bucket].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
      };
    });
}

function buildScoreCardSvg({ league, season, game, week }: { league: Props['league']; season: SocialSeason; game: SocialGame | null; week: WeekOption | null }) {
  if (!game) return '';
  const primary = league.primaryColor || '#22d3ee';
  const secondary = league.secondaryColor || '#0f172a';
  const home = game.homeTeam;
  const away = game.awayTeam;
  const winner = game.homeScore === game.awayScore ? null : game.homeScore > game.awayScore ? 'home' : 'away';

  return wrapSvg(`
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${escapeXml(primary)}" stop-opacity="0.36" />
        <stop offset="100%" stop-color="${escapeXml(secondary)}" stop-opacity="0.96" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="#020617" />
    <rect width="1080" height="1350" fill="url(#bg)" />
    <circle cx="910" cy="180" r="240" fill="${escapeXml(primary)}" fill-opacity="0.18" />
    <circle cx="170" cy="1130" r="220" fill="#ffffff" fill-opacity="0.06" />
    <text x="72" y="94" fill="#93c5fd" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700" letter-spacing="3">FINAL SCORE</text>
    <text x="72" y="154" fill="#ffffff" font-size="64" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(league.name)}</text>
    <text x="72" y="196" fill="#cbd5e1" font-size="28" font-family="Inter, Arial, sans-serif">${escapeXml(season.name)}${week ? ` • ${escapeXml(week.label)}` : ''}</text>

    ${renderTeamBlock({ x: 72, y: 320, width: 420, team: away, score: game.awayScore, winner: winner === 'away' })}
    ${renderTeamBlock({ x: 588, y: 320, width: 420, team: home, score: game.homeScore, winner: winner === 'home' })}

    <rect x="72" y="870" width="936" height="220" rx="32" fill="#0f172a" fill-opacity="0.82" stroke="#ffffff" stroke-opacity="0.12" />
    <text x="110" y="942" fill="#f8fafc" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="700">Game details</text>
    <text x="110" y="996" fill="#cbd5e1" font-size="30" font-family="Inter, Arial, sans-serif">${escapeXml(formatLongDate(game.scheduledAt))}</text>
    <text x="110" y="1048" fill="#cbd5e1" font-size="28" font-family="Inter, Arial, sans-serif">${escapeXml(game.location || 'Location TBD')}</text>
    <text x="110" y="1100" fill="#94a3b8" font-size="24" font-family="Inter, Arial, sans-serif">${escapeXml(buildGameMeta(game))}</text>

    <text x="72" y="1248" fill="#94a3b8" font-size="24" font-family="Inter, Arial, sans-serif">Generated from completed BLH game data</text>
  `);
}

function buildWeeklyRecapSvg({ league, season, week }: { league: Props['league']; season: SocialSeason; week: WeekOption | null }) {
  const primary = league.primaryColor || '#22d3ee';
  const secondary = league.secondaryColor || '#1d4ed8';
  const games = week?.games ?? season.games;
  const topTeam = season.standings[0];
  const totalGoals = games.reduce((sum, game) => sum + game.homeScore + game.awayScore, 0);
  const highlightGame = [...games].sort((a, b) => Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore))[0] ?? null;
  const topScoringGame = [...games].sort((a, b) => b.homeScore + b.awayScore - (a.homeScore + a.awayScore))[0] ?? null;
  const recapGames = games.slice(0, 10);
  const leftColumn = recapGames.filter((_, index) => index % 2 === 0);
  const rightColumn = recapGames.filter((_, index) => index % 2 === 1);
  const remainingGames = Math.max(0, games.length - recapGames.length);

  return wrapSvg(`
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="${escapeXml(secondary)}" stop-opacity="0.92" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#bg)" />
    <circle cx="160" cy="160" r="220" fill="${escapeXml(primary)}" fill-opacity="0.18" />
    <circle cx="960" cy="260" r="200" fill="#ffffff" fill-opacity="0.06" />
    <text x="72" y="96" fill="#f0abfc" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700" letter-spacing="3">WEEKLY RECAP</text>
    <text x="72" y="156" fill="#ffffff" font-size="64" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(league.name)}</text>
    <text x="72" y="198" fill="#dbeafe" font-size="28" font-family="Inter, Arial, sans-serif">${escapeXml(week?.label || season.name)}</text>

    <rect x="72" y="236" width="936" height="156" rx="32" fill="#020617" fill-opacity="0.55" stroke="#ffffff" stroke-opacity="0.08" />
    <text x="116" y="302" fill="#f8fafc" font-size="42" font-family="Inter, Arial, sans-serif" font-weight="800">${games.length} completed games</text>
    <text x="116" y="350" fill="#cbd5e1" font-size="28" font-family="Inter, Arial, sans-serif">${totalGoals} total goals${topTeam ? ` • ${escapeXml(topTeam.teamName)} leads with ${topTeam.points} pts` : ''}</text>

    <rect x="72" y="422" width="446" height="164" rx="28" fill="#020617" fill-opacity="0.5" stroke="#ffffff" stroke-opacity="0.06" />
    <text x="104" y="472" fill="#f8fafc" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="700">Biggest swing</text>
    <text x="104" y="520" fill="#ffffff" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(highlightGame ? formatGameHeadline(highlightGame) : 'No games in this window')}</text>
    <text x="104" y="560" fill="#94a3b8" font-size="22" font-family="Inter, Arial, sans-serif">${escapeXml(highlightGame ? `${Math.abs(highlightGame.homeScore - highlightGame.awayScore)} goal margin` : 'Add completed games to unlock recaps')}</text>

    <rect x="562" y="422" width="446" height="164" rx="28" fill="#020617" fill-opacity="0.5" stroke="#ffffff" stroke-opacity="0.06" />
    <text x="594" y="472" fill="#f8fafc" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="700">Goal rush</text>
    <text x="594" y="520" fill="#ffffff" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(topScoringGame ? formatGameHeadline(topScoringGame) : 'No games in this window')}</text>
    <text x="594" y="560" fill="#94a3b8" font-size="22" font-family="Inter, Arial, sans-serif">${escapeXml(topScoringGame ? `${topScoringGame.homeScore + topScoringGame.awayScore} combined goals` : 'Add completed games to unlock recaps')}</text>

    ${leftColumn.map((game, index) => renderRecapRow(game, 72, 620 + index * 110)).join('')}
    ${rightColumn.map((game, index) => renderRecapRow(game, 550, 620 + index * 110)).join('')}

    <rect x="72" y="1192" width="936" height="100" rx="24" fill="#020617" fill-opacity="0.58" stroke="#ffffff" stroke-opacity="0.08" />
    <text x="112" y="1252" fill="#f8fafc" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(remainingGames > 0 ? `Plus ${remainingGames} more final${remainingGames === 1 ? '' : 's'} in this window` : 'Export-ready recap for league channels')}</text>
  `);
}

function buildStandingsSvg({ league, season, week }: { league: Props['league']; season: SocialSeason; week: WeekOption | null }) {
  const primary = league.primaryColor || '#22d3ee';
  const secondary = league.secondaryColor || '#f59e0b';
  const leaders = season.standings.slice(0, 8);
  const previousRanks = new Map(
    (season.standingsSnapshots.find((snapshot) => snapshot.weekId === (week?.id ?? 'all'))?.standings ?? []).map((team) => [team.teamId, team.rank]),
  );

  return wrapSvg(`
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#111827" />
        <stop offset="100%" stop-color="${escapeXml(secondary)}" stop-opacity="0.94" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#bg)" />
    <circle cx="930" cy="140" r="230" fill="${escapeXml(primary)}" fill-opacity="0.16" />
    <text x="72" y="96" fill="#fde68a" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700" letter-spacing="3">STANDINGS UPDATE</text>
    <text x="72" y="156" fill="#ffffff" font-size="64" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(league.name)}</text>
    <text x="72" y="198" fill="#fef3c7" font-size="28" font-family="Inter, Arial, sans-serif">${escapeXml(season.name)}${week ? ` • ${escapeXml(week.label)}` : ''}</text>

    <rect x="72" y="244" width="936" height="84" rx="20" fill="#020617" fill-opacity="0.5" />
    <text x="108" y="297" fill="#94a3b8" font-size="24" font-family="Inter, Arial, sans-serif">RK</text>
    <text x="188" y="297" fill="#94a3b8" font-size="24" font-family="Inter, Arial, sans-serif">TEAM</text>
    <text x="644" y="297" fill="#94a3b8" font-size="24" font-family="Inter, Arial, sans-serif">MOVE</text>
    <text x="750" y="297" fill="#94a3b8" font-size="24" font-family="Inter, Arial, sans-serif">PTS</text>
    <text x="850" y="297" fill="#94a3b8" font-size="24" font-family="Inter, Arial, sans-serif">REC</text>
    <text x="980" y="297" fill="#94a3b8" font-size="24" font-family="Inter, Arial, sans-serif">+/-</text>

    ${leaders.map((team, index) => renderStandingsRow(team, index, previousRanks.get(team.teamId))).join('')}

    <text x="72" y="1248" fill="#fef3c7" font-size="24" font-family="Inter, Arial, sans-serif">Movement compares this table to the start of the selected week window</text>
  `);
}

function renderTeamBlock({ x, y, width, team, score, winner }: { x: number; y: number; width: number; team: SocialGameTeam | null; score: number; winner: boolean }) {
  const color = team?.primaryColor || '#0f172a';
  const badge = getInitials(team?.shortName || team?.name || 'T');
  return `
    <rect x="${x}" y="${y}" width="${width}" height="460" rx="40" fill="#020617" fill-opacity="0.62" stroke="#ffffff" stroke-opacity="${winner ? '0.22' : '0.08'}" />
    <rect x="${x + 28}" y="${y + 28}" width="132" height="132" rx="28" fill="${escapeXml(color)}" />
    <text x="${x + 94}" y="${y + 108}" text-anchor="middle" fill="#ffffff" font-size="48" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(badge)}</text>
    <text x="${x + 28}" y="${y + 232}" fill="#ffffff" font-size="42" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(team?.name || 'TBD Team')}</text>
    <text x="${x + 28}" y="${y + 282}" fill="#94a3b8" font-size="26" font-family="Inter, Arial, sans-serif">${winner ? 'Winner' : 'Final'}</text>
    <text x="${x + width - 34}" y="${y + 286}" text-anchor="end" fill="#ffffff" font-size="160" font-family="Inter, Arial, sans-serif" font-weight="900">${score}</text>
  `;
}

function renderRecapRow(game: SocialGame, x: number, y: number) {
  return `
    <rect x="${x}" y="${y}" width="458" height="88" rx="24" fill="#020617" fill-opacity="0.42" stroke="#ffffff" stroke-opacity="0.06" />
    <text x="${x + 24}" y="${y + 39}" fill="#f8fafc" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(shortTeamName(game.awayTeam?.name || 'Away'))} ${game.awayScore} • ${game.homeScore} ${escapeXml(shortTeamName(game.homeTeam?.name || 'Home'))}</text>
    <text x="${x + 24}" y="${y + 66}" fill="#94a3b8" font-size="18" font-family="Inter, Arial, sans-serif">${escapeXml(formatShortDate(game.scheduledAt))}${game.location ? ` • ${escapeXml(trimText(game.location, 18))}` : ''}</text>
  `;
}

function renderStandingsRow(team: SocialStanding, index: number, previousRank?: number) {
  const y = 356 + index * 104;
  const movement = typeof previousRank === 'number' ? previousRank - team.rank : null;
  const movementText = movement === null ? 'NEW' : movement === 0 ? '—' : `${movement > 0 ? '+' : ''}${movement}`;
  const movementFill = movement === null ? '#c084fc' : movement > 0 ? '#4ade80' : movement < 0 ? '#f87171' : '#e2e8f0';
  const badgeFill = team.primaryColor || '#0f172a';

  return `
    <rect x="72" y="${y}" width="936" height="82" rx="22" fill="#020617" fill-opacity="${index === 0 ? '0.56' : '0.38'}" stroke="#ffffff" stroke-opacity="0.06" />
    <circle cx="126" cy="${y + 41}" r="24" fill="${escapeXml(badgeFill)}" />
    <text x="126" y="${y + 49}" text-anchor="middle" fill="#ffffff" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(getInitials(team.shortName || team.teamName))}</text>
    <text x="176" y="${y + 51}" fill="#ffffff" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="800">${team.rank}</text>
    <text x="244" y="${y + 51}" fill="#ffffff" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(trimText(team.teamName, 22))}</text>
    ${renderMovementGlyph(664, y + 41, movement, movementFill)}
    <text x="702" y="${y + 51}" fill="${movementFill}" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="800">${movementText}</text>
    <text x="764" y="${y + 51}" fill="#ffffff" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="800">${team.points}</text>
    <text x="858" y="${y + 51}" fill="#e2e8f0" font-size="24" font-family="Inter, Arial, sans-serif">${team.wins}-${team.losses}-${team.ties}</text>
    <text x="980" y="${y + 51}" text-anchor="end" fill="#e2e8f0" font-size="24" font-family="Inter, Arial, sans-serif">${team.goalDiff >= 0 ? '+' : ''}${team.goalDiff}</text>
  `;
}

function renderMovementGlyph(x: number, y: number, movement: number | null, fill: string) {
  if (movement === null || movement === 0) {
    return `<circle cx="${x}" cy="${y}" r="14" fill="${fill}" fill-opacity="0.18" />`;
  }

  if (movement > 0) {
    return `<path d="M ${x} ${y - 14} L ${x - 12} ${y + 10} H ${x + 12} Z" fill="${fill}" />`;
  }

  return `<path d="M ${x} ${y + 14} L ${x - 12} ${y - 10} H ${x + 12} Z" fill="${fill}" />`;
}

function wrapSvg(body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" width="${SVG_WIDTH}" height="${SVG_HEIGHT}">${body}</svg>`;
}

function getInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'T';
}

function buildGameMeta(game: SocialGame) {
  const parts = [] as string[];
  if (game.roundNumber) parts.push(`Round ${game.roundNumber}`);
  if (game.gameNumber) parts.push(`Game ${game.gameNumber}`);
  return parts.join(' • ') || 'Completed game';
}

function formatGameLabel(game: SocialGame) {
  return `${game.awayTeam?.name || 'Away'} ${game.awayScore} - ${game.homeScore} ${game.homeTeam?.name || 'Home'} • ${formatShortDate(game.scheduledAt)}`;
}

function formatGameHeadline(game: SocialGame) {
  return `${shortTeamName(game.awayTeam?.name || 'Away')} ${game.awayScore}-${game.homeScore} ${shortTeamName(game.homeTeam?.name || 'Home')}`;
}

function shortTeamName(name: string) {
  return trimText(name, 18);
}

function formatShortDate(input: string | number) {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(input));
}

function formatLongDate(input: string) {
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(input));
}

function startOfDay(input: string) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function trimText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function svgToPngBlob(svgMarkup: string, width: number, height: number) {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    context.drawImage(image, 0, 0, width, height);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) throw new Error('PNG export failed');
    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load generated SVG into an image element'));
    image.src = src;
  });
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
