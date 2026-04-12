'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Download, ImageIcon, RefreshCw, Shield, Trophy } from 'lucide-react';

type LogoTeam = {
  id: string;
  name: string;
  shortName: string | null;
  primaryColor: string | null;
  logoDataUri: string | null;
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
  homeTeam: LogoTeam | null;
  awayTeam: LogoTeam | null;
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
  logoDataUri: string | null;
};

type PlayerLeader = {
  playerId: string;
  playerName: string;
  jerseyNumber: string | null;
  teamId: string | null;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  teamLogoDataUri: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
};

type GoalieLeader = {
  playerId: string;
  playerName: string;
  jerseyNumber: string | null;
  teamId: string | null;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  teamLogoDataUri: string | null;
  gamesPlayed: number;
  goalsAgainst: number;
  saves: number;
  shutouts: number;
  minutesPlayed: number;
  savePct: number;
  gaa: number;
};

type PlayerStatEntry = {
  gameId: string;
  scheduledAt: string;
  playerId: string;
  playerName: string;
  jerseyNumber: string | null;
  teamId: string | null;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  teamLogoDataUri: string | null;
  goals: number;
  assists: number;
  points: number;
};

type GoalieStatEntry = {
  gameId: string;
  scheduledAt: string;
  playerId: string;
  playerName: string;
  jerseyNumber: string | null;
  teamId: string | null;
  teamName: string;
  teamShortName: string;
  teamPrimaryColor: string | null;
  teamLogoDataUri: string | null;
  goalsAgainst: number;
  saves: number;
  shutouts: number;
  minutesPlayed: number;
  savePct: number;
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
  playerLeaders: PlayerLeader[];
  goalieLeaders: GoalieLeader[];
  playerStatEntries: PlayerStatEntry[];
  goalieStatEntries: GoalieStatEntry[];
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
    logoDataUri: string | null;
  };
  seasons: SocialSeason[];
};

type GraphicContext =
  | 'score-card'
  | 'weekly-recap'
  | 'standings-update'
  | 'points-leaders-weekly'
  | 'points-leaders-season'
  | 'top-goal-scorers-weekly'
  | 'best-goalies-weekly';

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
  'weekly-recap': { label: 'Weekly recap', icon: CalendarRange, accent: '#c084fc' },
  'standings-update': { label: 'Standings update', icon: Trophy, accent: '#fbbf24' },
  'points-leaders-weekly': { label: 'Weekly points leaders', icon: Trophy, accent: '#34d399' },
  'points-leaders-season': { label: 'Season points leaders', icon: Trophy, accent: '#22d3ee' },
  'top-goal-scorers-weekly': { label: 'Weekly goal scorers', icon: Trophy, accent: '#fb7185' },
  'best-goalies-weekly': { label: 'Best goalies', icon: Shield as typeof ImageIcon, accent: '#60a5fa' },
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

  const selectedSeason = useMemo(() => seasons.find((season) => season.id === seasonId) ?? seasons[0] ?? null, [seasonId, seasons]);
  const weekOptions = useMemo(() => buildWeekOptions(selectedSeason?.games ?? []), [selectedSeason?.games]);

  useEffect(() => {
    const fallbackWeekId = weekOptions[0]?.id ?? 'all';
    setWeekId((current) => (weekOptions.some((week) => week.id === current) ? current : fallbackWeekId));
  }, [weekOptions]);

  const selectedWeek = useMemo(() => weekOptions.find((week) => week.id === weekId) ?? weekOptions[0] ?? null, [weekId, weekOptions]);
  const weekGames = selectedWeek?.games ?? selectedSeason?.games ?? [];

  useEffect(() => {
    const fallbackGameId = weekGames[0]?.id ?? '';
    setGameId((current) => (weekGames.some((game) => game.id === current) ? current : fallbackGameId));
  }, [weekGames]);

  const selectedGame = useMemo(() => weekGames.find((game) => game.id === gameId) ?? weekGames[0] ?? null, [gameId, weekGames]);

  useEffect(() => {
    if (!selectedSeason) {
      setRendered(null);
      return;
    }

    setRendered((current) => {
      if (current) return current;
      const svgMarkup = renderGraphic({ league, season: selectedSeason, week: selectedWeek, game: selectedGame, context });
      return { seasonId: selectedSeason.id, weekId: selectedWeek?.id ?? 'all', context, gameId: selectedGame?.id ?? '', svgMarkup };
    });
  }, [context, league, selectedGame, selectedSeason, selectedWeek]);

  const currentSvgMarkup = useMemo(() => {
    if (!selectedSeason) return '';
    return renderGraphic({ league, season: selectedSeason, week: selectedWeek, game: selectedGame, context });
  }, [context, league, selectedGame, selectedSeason, selectedWeek]);

  const activeSvgMarkup = rendered?.svgMarkup ?? '';
  const isDirty = rendered?.seasonId !== selectedSeason?.id || rendered?.weekId !== (selectedWeek?.id ?? 'all') || rendered?.context !== context || rendered?.gameId !== (selectedGame?.id ?? '');

  const downloadBaseName = useMemo(() => {
    const base = slugify(league.name || 'league');
    const season = slugify(selectedSeason?.name || 'season');
    const week = slugify(selectedWeek?.id || 'all');
    return `${base}-${season}-${context}-${week}`;
  }, [context, league.name, selectedSeason?.name, selectedWeek?.id]);

  const handleGenerate = () => {
    if (!selectedSeason) return;
    setRendered({ seasonId: selectedSeason.id, weekId: selectedWeek?.id ?? 'all', context, gameId: selectedGame?.id ?? '', svgMarkup: currentSvgMarkup });
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
          <p className="mt-2 text-sm leading-6 text-neutral-400">Pick a season, a week, and a graphic type. The preview uses completed games, standings, and verified stat leaders.</p>

          <div className="mt-5 space-y-4">
            <Field label="Season">
              <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-rink-400">
                {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
              </select>
            </Field>

            <Field label="Graphic type">
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(TEMPLATE_META) as GraphicContext[]).map((key) => {
                  const meta = TEMPLATE_META[key];
                  const Icon = meta.icon;
                  const active = context === key;
                  return (
                    <button key={key} type="button" onClick={() => setContext(key)} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-rink-400/60 bg-rink-500/10 text-white' : 'border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/20'}`}>
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
                {weekOptions.map((week) => <option key={week.id} value={week.id}>{week.label}</option>)}
              </select>
            </Field>

            {context === 'score-card' ? (
              <Field label="Game">
                <select value={gameId} onChange={(event) => setGameId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-rink-400">
                  {weekGames.map((game) => <option key={game.id} value={game.id}>{formatGameLabel(game)}</option>)}
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
              <Download className="h-4 w-4" />Download SVG
            </button>
            <button type="button" onClick={handleDownloadPng} disabled={!activeSvgMarkup || isExportingPng} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" />{isExportingPng ? 'Rendering PNG...' : 'Download PNG'}
            </button>
          </div>

          {isDirty ? <p className="mt-3 text-xs text-amber-300">Selections changed. Regenerate to refresh the preview before exporting.</p> : null}
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
          <div className="text-right text-xs text-neutral-400"><p>1080 × 1350</p><p>SVG and PNG export</p></div>
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
    case 'points-leaders-weekly':
      return buildLeadersSvg({ league, season, week, mode: 'weekly-points' });
    case 'points-leaders-season':
      return buildLeadersSvg({ league, season, week, mode: 'season-points' });
    case 'top-goal-scorers-weekly':
      return buildLeadersSvg({ league, season, week, mode: 'weekly-goals' });
    case 'best-goalies-weekly':
      return buildGoalieSvg({ league, season, week });
    case 'score-card':
    default:
      return buildScoreCardSvg({ league, season, game, week });
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</span>{children}</label>;
}
function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">{label}</p><p className="mt-3 text-2xl font-black text-white">{value}</p><p className="mt-2 text-sm text-neutral-400">{helper}</p></div>;
}

function buildWeekOptions(games: SocialGame[]): WeekOption[] {
  if (!games.length) return [{ id: 'all', label: 'All completed games', start: '', end: '', games: [] }];
  const sorted = [...games].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const anchor = startOfDay(sorted[0].scheduledAt).getTime();
  const buckets = new Map<number, SocialGame[]>();
  for (const game of sorted) {
    const current = startOfDay(game.scheduledAt).getTime();
    const index = Math.max(0, Math.floor((current - anchor) / WEEK_MS));
    buckets.set(index, [...(buckets.get(index) ?? []), game]);
  }
  return Array.from(buckets.entries()).sort((a, b) => b[0] - a[0]).map(([index, bucket]) => {
    const dates = bucket.map((game) => new Date(game.scheduledAt).getTime()).sort((a, b) => a - b);
    return { id: `week-${index + 1}`, label: `Week ${index + 1} • ${formatShortDate(dates[0])} to ${formatShortDate(dates[dates.length - 1])}`, start: new Date(dates[0]).toISOString(), end: new Date(dates[dates.length - 1]).toISOString(), games: [...bucket].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()) };
  });
}

function buildScoreCardSvg({ league, season, game, week }: { league: Props['league']; season: SocialSeason; game: SocialGame | null; week: WeekOption | null }) {
  if (!game) return '';
  const brand = getBrand(league);
  const winner = game.homeScore === game.awayScore ? null : game.homeScore > game.awayScore ? 'home' : 'away';

  return wrapSvg(`
    ${renderShell({ league, brand, eyebrow: 'FINAL SCORE', title: league.name, subtitle: `${season.name}${week ? ` • ${week.label}` : ''}` })}

    <g transform="translate(54 228)">
      <rect x="0" y="0" width="972" height="600" rx="42" fill="rgba(5,10,22,0.82)" stroke="rgba(255,255,255,0.10)" />
      <rect x="28" y="28" width="916" height="78" rx="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" />
      <text x="56" y="76" fill="${brand.accent}" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="3">${escapeXml(season.name.toUpperCase())}</text>
      <text x="916" y="76" text-anchor="end" fill="#cbd5e1" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(formatShortDate(game.scheduledAt))}</text>

      ${renderScoreTeamCard({ team: game.awayTeam, score: game.awayScore, winner: winner === 'away', x: 32, y: 134, width: 388, height: 432 })}
      ${renderCenterScoreColumn({ awayScore: game.awayScore, homeScore: game.homeScore, brand, x: 436, y: 154, width: 100, height: 392 })}
      ${renderScoreTeamCard({ team: game.homeTeam, score: game.homeScore, winner: winner === 'home', x: 552, y: 134, width: 388, height: 432 })}
    </g>

    <g transform="translate(54 854)">
      <rect x="0" y="0" width="972" height="160" rx="34" fill="rgba(6,12,24,0.80)" stroke="rgba(255,255,255,0.10)" />
      <rect x="28" y="28" width="288" height="104" rx="26" fill="rgba(255,255,255,0.04)" />
      <text x="52" y="62" fill="#93c5fd" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="2">GAME NIGHT</text>
      <text x="52" y="104" fill="#ffffff" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(formatLongDate(game.scheduledAt))}</text>

      <rect x="342" y="28" width="300" height="104" rx="26" fill="rgba(255,255,255,0.04)" />
      <text x="366" y="62" fill="#93c5fd" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="2">VENUE</text>
      <text x="366" y="104" fill="#ffffff" font-size="32" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(trimText(game.location || 'Location TBD', 22))}</text>

      <rect x="668" y="28" width="276" height="104" rx="26" fill="rgba(255,255,255,0.04)" />
      <text x="692" y="62" fill="#93c5fd" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="2">MATCHUP</text>
      <text x="692" y="104" fill="#ffffff" font-size="32" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(trimText(buildGameMeta(game), 18))}</text>
    </g>

    <text x="54" y="1258" fill="#94a3b8" font-size="22" font-family="Inter, Arial, sans-serif">Verified final, designed for 1080 × 1350 league social posting</text>
  `);
}

function buildWeeklyRecapSvg({ league, season, week }: { league: Props['league']; season: SocialSeason; week: WeekOption | null }) {
  const brand = getBrand(league);
  const games = week?.games ?? season.games;
  if (!games.length) return '';
  const totalGoals = games.reduce((sum, game) => sum + game.homeScore + game.awayScore, 0);
  const closestGame = [...games].sort((a, b) => Math.abs(a.homeScore - a.awayScore) - Math.abs(b.homeScore - b.awayScore))[0] ?? null;
  const biggestWin = [...games].sort((a, b) => Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore))[0] ?? null;
  const left = games.slice(0, 4);
  const right = games.slice(4, 8);

  return wrapSvg(`
    ${renderShell({ league, brand, eyebrow: 'WEEKLY RECAP', title: league.name, subtitle: week?.label || season.name })}
    <g transform="translate(54 210)">
      ${renderStatTile({ x: 0, y: 0, width: 306, label: 'Completed games', value: String(games.length), note: 'Verified finals in this window', accent: brand.primary })}
      ${renderStatTile({ x: 333, y: 0, width: 306, label: 'Total goals', value: String(totalGoals), note: 'Across all completed games', accent: brand.accent })}
      ${renderStatTile({ x: 666, y: 0, width: 306, label: 'Table leader', value: trimText(season.standings[0]?.shortName || season.standings[0]?.teamName || 'N/A', 16), note: season.standings[0] ? `${season.standings[0].points} pts on top` : 'No standings data', accent: brand.secondary })}

      ${renderHighlightTile({ x: 0, y: 174, width: 474, title: 'Closest finish', headline: closestGame ? formatGameHeadline(closestGame) : 'No games', subhead: closestGame ? `${Math.abs(closestGame.homeScore - closestGame.awayScore)} goal margin` : 'Add completed games' })}
      ${renderHighlightTile({ x: 498, y: 174, width: 474, title: 'Biggest win', headline: biggestWin ? formatGameHeadline(biggestWin) : 'No games', subhead: biggestWin ? `${Math.abs(biggestWin.homeScore - biggestWin.awayScore)} goal spread` : 'Add completed games' })}

      ${left.map((game, index) => renderRecapGameCard(game, 0, 408 + index * 172, 474)).join('')}
      ${right.map((game, index) => renderRecapGameCard(game, 498, 408 + index * 172, 474)).join('')}
    </g>
  `);
}

function buildStandingsSvg({ league, season, week }: { league: Props['league']; season: SocialSeason; week: WeekOption | null }) {
  const brand = getBrand(league);
  const leaders = season.standings.slice(0, 8);
  const previousRanks = new Map((season.standingsSnapshots.find((snapshot) => snapshot.weekId === (week?.id ?? 'all'))?.standings ?? []).map((team) => [team.teamId, team.rank]));

  return wrapSvg(`
    ${renderShell({ league, brand, eyebrow: 'STANDINGS UPDATE', title: league.name, subtitle: `${season.name}${week ? ` • ${week.label}` : ''}` })}
    <g transform="translate(54 214)">
      <rect x="0" y="0" width="972" height="94" rx="24" fill="rgba(7,13,26,0.8)" stroke="rgba(255,255,255,0.08)" />
      <text x="38" y="58" fill="#93c5fd" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">RK</text>
      <text x="122" y="58" fill="#93c5fd" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">TEAM</text>
      <text x="620" y="58" fill="#93c5fd" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">MOVE</text>
      <text x="726" y="58" fill="#93c5fd" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">PTS</text>
      <text x="812" y="58" fill="#93c5fd" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">REC</text>
      <text x="932" y="58" text-anchor="end" fill="#93c5fd" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">+/-</text>
      ${leaders.map((team, index) => renderStandingsRow(team, index, previousRanks.get(team.teamId))).join('')}
    </g>
    <text x="54" y="1258" fill="#94a3b8" font-size="22" font-family="Inter, Arial, sans-serif">Movement compares this table to the start of the selected week window</text>
  `);
}

function buildLeadersSvg({ league, season, week, mode }: { league: Props['league']; season: SocialSeason; week: WeekOption | null; mode: 'weekly-points' | 'season-points' | 'weekly-goals' }) {
  const brand = getBrand(league);
  const leaders = aggregateWeeklyLeaders(season.playerLeaders, season.playerStatEntries, week, mode).slice(0, 6);
  if (!leaders.length) return '';
  const copy = mode === 'season-points'
    ? { eyebrow: 'SEASON LEADERS', title: 'Points race', subtitle: `${season.name} overall`, metric: 'PTS' }
    : mode === 'weekly-goals'
      ? { eyebrow: 'GOAL SCORERS', title: 'Top finishers', subtitle: week?.label || 'Selected window', metric: 'GOALS' }
      : { eyebrow: 'WEEKLY LEADERS', title: 'Points leaders', subtitle: week?.label || 'Selected window', metric: 'PTS' };

  return wrapSvg(`
    ${renderShell({ league, brand, eyebrow: copy.eyebrow, title: copy.title, subtitle: copy.subtitle })}
    <g transform="translate(54 212)">
      ${renderPodiumCard(leaders[0], mode, copy.metric, 0, 0, 972, 292)}
      ${leaders.slice(1, 6).map((leader, index) => renderLeaderRow(leader, mode, copy.metric, index + 2, 0, 328 + index * 146, 972)).join('')}
    </g>
  `);
}

function buildGoalieSvg({ league, season, week }: { league: Props['league']; season: SocialSeason; week: WeekOption | null }) {
  const brand = getBrand(league);
  const leaders = aggregateWeeklyGoalies(season.goalieStatEntries, week).slice(0, 6);
  if (!leaders.length) return '';

  return wrapSvg(`
    ${renderShell({ league, brand, eyebrow: 'BEST GOALIES', title: 'Weekly goalie leaders', subtitle: week?.label || season.name })}
    <g transform="translate(54 212)">
      ${renderGoalieHero(leaders[0], 0, 0, 972, 300)}
      ${leaders.slice(1, 6).map((goalie, index) => renderGoalieRow(goalie, index + 2, 0, 336 + index * 142, 972)).join('')}
    </g>
  `);
}

function renderShell({ league, brand, eyebrow, title, subtitle }: { league: Props['league']; brand: ReturnType<typeof getBrand>; eyebrow: string; title: string; subtitle: string }) {
  return `
    <defs>
      <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${brand.primary}" stop-opacity="0.32" />
        <stop offset="46%" stop-color="#07101f" stop-opacity="0.97" />
        <stop offset="100%" stop-color="${brand.secondary}" stop-opacity="0.86" />
      </linearGradient>
      <linearGradient id="heroGlow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${brand.accent}" stop-opacity="0.26" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="panelGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.12)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="#030712" />
    <rect width="1080" height="1350" fill="url(#bgGradient)" />
    <circle cx="164" cy="152" r="228" fill="url(#heroGlow)" />
    <circle cx="918" cy="1124" r="290" fill="${brand.accent}" fill-opacity="0.10" />
    <path d="M0 1016 C214 946 384 946 540 1016 C704 1088 868 1088 1080 1000 L1080 1350 L0 1350 Z" fill="rgba(255,255,255,0.03)" />
    <rect x="30" y="30" width="1020" height="1290" rx="42" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
    <rect x="54" y="54" width="972" height="136" rx="34" fill="rgba(5,10,22,0.60)" stroke="rgba(255,255,255,0.08)" />
    <rect x="54" y="1184" width="972" height="78" rx="28" fill="rgba(5,10,22,0.56)" stroke="rgba(255,255,255,0.06)" />
    ${renderLeagueBadge(league, brand, 836, 70, 166, 104)}
    <text x="78" y="100" fill="${brand.accent}" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="4">${escapeXml(eyebrow)}</text>
    <text x="78" y="152" fill="#ffffff" font-size="58" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(trimText(title, 24))}</text>
    <text x="78" y="183" fill="#cbd5e1" font-size="24" font-family="Inter, Arial, sans-serif">${escapeXml(trimText(subtitle, 42))}</text>
    <text x="84" y="1234" fill="rgba(255,255,255,0.82)" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(league.name)} • League social graphics</text>
    <text x="996" y="1234" text-anchor="end" fill="rgba(255,255,255,0.44)" font-size="18" font-family="Inter, Arial, sans-serif">Powered by verified league data</text>
  `;
}

function renderScoreTeamCard({ team, score, winner, x, y, width, height }: { team: LogoTeam | null; score: number; winner: boolean; x: number; y: number; width: number; height: number }) {
  const color = normalizeColor(team?.primaryColor, '#1e293b');
  const name = renderFittedTeamName(team?.name || 'TBD Team', width / 2, 254, 18, 34, '#ffffff');
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="36" fill="rgba(4,10,20,0.88)" stroke="${winner ? `${color}` : 'rgba(255,255,255,0.08)'}" stroke-opacity="${winner ? '0.42' : '1'}" />
      <rect x="22" y="22" width="${width - 44}" height="12" rx="6" fill="${color}" opacity="0.95" />
      <text x="34" y="68" fill="${winner ? brandSafe(color) : '#94a3b8'}" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="3">${winner ? 'WINNER' : 'FINAL'}</text>
      <circle cx="${width / 2}" cy="154" r="86" fill="${color}" fill-opacity="0.14" />
      <circle cx="${width / 2}" cy="154" r="74" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" />
      ${renderTeamLogo(team, width / 2 - 58, 96, 116, 116, 34)}
      ${name}
      <text x="${width / 2}" y="308" text-anchor="middle" fill="#cbd5e1" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(trimText(team?.shortName || team?.name || 'Team', 22))}</text>
      <rect x="34" y="336" width="${width - 68}" height="70" rx="24" fill="rgba(255,255,255,0.05)" />
      <text x="${width / 2}" y="386" text-anchor="middle" fill="#ffffff" font-size="104" font-family="Inter, Arial, sans-serif" font-weight="900">${score}</text>
    </g>
  `;
}

function renderStatTile({ x, y, width, label, value, note, accent }: { x: number; y: number; width: number; label: string; value: string; note: string; accent: string }) {
  return `<g transform="translate(${x} ${y})"><rect width="${width}" height="148" rx="28" fill="rgba(6,12,24,0.76)" stroke="rgba(255,255,255,0.08)" /><rect x="18" y="18" width="10" height="112" rx="5" fill="${accent}" /><text x="48" y="54" fill="#93c5fd" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(label)}</text><text x="48" y="102" fill="#ffffff" font-size="58" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(value)}</text><text x="48" y="128" fill="#94a3b8" font-size="18" font-family="Inter, Arial, sans-serif">${escapeXml(note)}</text></g>`;
}
function renderHighlightTile({ x, y, width, title, headline, subhead }: { x: number; y: number; width: number; title: string; headline: string; subhead: string }) {
  return `<g transform="translate(${x} ${y})"><rect width="${width}" height="186" rx="32" fill="rgba(6,12,24,0.76)" stroke="rgba(255,255,255,0.08)" /><text x="30" y="48" fill="#94a3b8" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700" letter-spacing="2">${escapeXml(title.toUpperCase())}</text><text x="30" y="102" fill="#ffffff" font-size="38" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(trimText(headline, 28))}</text><text x="30" y="140" fill="#cbd5e1" font-size="22" font-family="Inter, Arial, sans-serif">${escapeXml(subhead)}</text></g>`;
}
function renderRecapGameCard(game: SocialGame, x: number, y: number, width: number) {
  const winner = game.homeScore === game.awayScore ? null : game.homeScore > game.awayScore ? 'home' : 'away';
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="146" rx="28" fill="rgba(6,12,24,0.76)" stroke="rgba(255,255,255,0.08)" />
      ${renderMiniTeam(game.awayTeam, 24, 24, winner === 'away')}
      ${renderMiniTeam(game.homeTeam, 24, 82, winner === 'home')}
      <text x="${width - 24}" y="66" text-anchor="end" fill="#ffffff" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="900">${game.awayScore}</text>
      <text x="${width - 24}" y="122" text-anchor="end" fill="#ffffff" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="900">${game.homeScore}</text>
      <text x="${width - 160}" y="66" text-anchor="end" fill="#94a3b8" font-size="18" font-family="Inter, Arial, sans-serif">${escapeXml(formatShortDate(game.scheduledAt))}</text>
      <text x="${width - 160}" y="122" text-anchor="end" fill="#94a3b8" font-size="18" font-family="Inter, Arial, sans-serif">${escapeXml(trimText(game.location || 'Location TBD', 18))}</text>
    </g>
  `;
}
function renderMiniTeam(team: LogoTeam | null, x: number, y: number, highlight: boolean) {
  const color = normalizeColor(team?.primaryColor, '#1e293b');
  return `<g transform="translate(${x} ${y})"><rect width="34" height="34" rx="12" fill="${color}" fill-opacity="0.2" />${renderTeamLogo(team, 4, 4, 26, 26, 10)}<text x="50" y="24" fill="${highlight ? '#ffffff' : '#cbd5e1'}" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="${highlight ? '800' : '700'}">${escapeXml(trimText(team?.shortName || team?.name || 'Team', 18))}</text></g>`;
}

function renderStandingsRow(team: SocialStanding, index: number, previousRank?: number) {
  const y = 122 + index * 118;
  const movement = typeof previousRank === 'number' ? previousRank - team.rank : null;
  const movementText = movement === null ? 'NEW' : movement === 0 ? 'EVEN' : `${movement > 0 ? '+' : ''}${movement}`;
  const movementFill = movement === null ? '#c084fc' : movement > 0 ? '#4ade80' : movement < 0 ? '#f87171' : '#e2e8f0';
  return `
    <g transform="translate(0 ${y})">
      <rect width="972" height="94" rx="26" fill="rgba(6,12,24,${index === 0 ? '0.84' : '0.74'})" stroke="rgba(255,255,255,0.08)" />
      <text x="42" y="60" fill="#ffffff" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="900">${team.rank}</text>
      <rect x="92" y="18" width="58" height="58" rx="18" fill="${normalizeColor(team.primaryColor, '#1e293b')}" fill-opacity="0.18" />
      ${renderTeamLogo({ id: team.teamId, name: team.teamName, shortName: team.shortName, primaryColor: team.primaryColor, logoDataUri: team.logoDataUri }, 101, 27, 40, 40, 14)}
      <text x="172" y="52" fill="#ffffff" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(trimText(team.teamName, 24))}</text>
      <text x="172" y="76" fill="#94a3b8" font-size="18" font-family="Inter, Arial, sans-serif">${escapeXml(team.shortName)}</text>
      ${renderMovementGlyph(650, 46, movement, movementFill)}
      <text x="678" y="56" fill="${movementFill}" font-size="22" font-family="Inter, Arial, sans-serif" font-weight="800">${movementText}</text>
      <text x="740" y="56" fill="#ffffff" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="900">${team.points}</text>
      <text x="822" y="56" fill="#e2e8f0" font-size="22" font-family="Inter, Arial, sans-serif">${team.wins}-${team.losses}-${team.ties}</text>
      <text x="934" y="56" text-anchor="end" fill="#e2e8f0" font-size="24" font-family="Inter, Arial, sans-serif">${team.goalDiff >= 0 ? '+' : ''}${team.goalDiff}</text>
    </g>
  `;
}

function renderPodiumCard(leader: LeaderSummary, mode: 'weekly-points' | 'season-points' | 'weekly-goals', metric: string, x: number, y: number, width: number, height: number) {
  const accent = normalizeColor(leader.teamPrimaryColor, '#38bdf8');
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="36" fill="rgba(6,12,24,0.82)" stroke="rgba(255,255,255,0.10)" />
      <circle cx="136" cy="146" r="84" fill="${accent}" fill-opacity="0.18" />
      ${renderLeaderLogo(leader, 74, 84, 124, 124, 40)}
      <text x="250" y="86" fill="#fbbf24" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="3">#1</text>
      <text x="250" y="142" fill="#ffffff" font-size="54" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(trimText(leader.playerName, 22))}</text>
      <text x="250" y="188" fill="#cbd5e1" font-size="28" font-family="Inter, Arial, sans-serif">${escapeXml(leader.teamName)}</text>
      <text x="250" y="228" fill="#94a3b8" font-size="22" font-family="Inter, Arial, sans-serif">${escapeXml(buildLeaderSubline(leader, mode))}</text>
      <text x="${width - 62}" y="148" text-anchor="end" fill="#ffffff" font-size="112" font-family="Inter, Arial, sans-serif" font-weight="900">${metric === 'GOALS' ? leader.goals : leader.points}</text>
      <text x="${width - 62}" y="196" text-anchor="end" fill="${accent}" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="800">${metric}</text>
    </g>
  `;
}

function renderLeaderRow(leader: LeaderSummary, mode: 'weekly-points' | 'season-points' | 'weekly-goals', metric: string, rank: number, x: number, y: number, width: number) {
  const accent = normalizeColor(leader.teamPrimaryColor, '#38bdf8');
  return `<g transform="translate(${x} ${y})"><rect width="${width}" height="116" rx="28" fill="rgba(6,12,24,0.78)" stroke="rgba(255,255,255,0.08)" /><text x="34" y="72" fill="#ffffff" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="900">${rank}</text>${renderLeaderLogo(leader, 92, 24, 68, 68, 22)}<text x="184" y="56" fill="#ffffff" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(trimText(leader.playerName, 26))}</text><text x="184" y="86" fill="#94a3b8" font-size="20" font-family="Inter, Arial, sans-serif">${escapeXml(buildLeaderSubline(leader, mode))}</text><text x="${width - 34}" y="70" text-anchor="end" fill="${accent}" font-size="48" font-family="Inter, Arial, sans-serif" font-weight="900">${metric === 'GOALS' ? leader.goals : leader.points}</text></g>`;
}

function renderGoalieHero(goalie: GoalieSummary, x: number, y: number, width: number, height: number) {
  const accent = normalizeColor(goalie.teamPrimaryColor, '#60a5fa');
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="36" fill="rgba(6,12,24,0.82)" stroke="rgba(255,255,255,0.10)" />
      <circle cx="136" cy="150" r="84" fill="${accent}" fill-opacity="0.18" />
      ${renderLeaderLogo(goalie, 74, 88, 124, 124, 40)}
      <text x="250" y="88" fill="#60a5fa" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="3">#1 GOALIE</text>
      <text x="250" y="144" fill="#ffffff" font-size="54" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(trimText(goalie.playerName, 22))}</text>
      <text x="250" y="190" fill="#cbd5e1" font-size="28" font-family="Inter, Arial, sans-serif">${escapeXml(goalie.teamName)}</text>
      <text x="250" y="230" fill="#94a3b8" font-size="22" font-family="Inter, Arial, sans-serif">${escapeXml(`${goalie.gamesPlayed} GP • ${goalie.saves} saves • ${goalie.shutouts} SO`)}</text>
      <text x="${width - 58}" y="132" text-anchor="end" fill="#ffffff" font-size="86" font-family="Inter, Arial, sans-serif" font-weight="900">${formatSavePct(goalie.savePct)}</text>
      <text x="${width - 58}" y="172" text-anchor="end" fill="${accent}" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="800">SV%</text>
      <text x="${width - 58}" y="238" text-anchor="end" fill="#ffffff" font-size="52" font-family="Inter, Arial, sans-serif" font-weight="900">${goalie.gaa.toFixed(2)}</text>
      <text x="${width - 58}" y="272" text-anchor="end" fill="#94a3b8" font-size="22" font-family="Inter, Arial, sans-serif">GAA</text>
    </g>
  `;
}
function renderGoalieRow(goalie: GoalieSummary, rank: number, x: number, y: number, width: number) {
  const accent = normalizeColor(goalie.teamPrimaryColor, '#60a5fa');
  return `<g transform="translate(${x} ${y})"><rect width="${width}" height="112" rx="28" fill="rgba(6,12,24,0.78)" stroke="rgba(255,255,255,0.08)" /><text x="34" y="68" fill="#ffffff" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="900">${rank}</text>${renderLeaderLogo(goalie, 92, 22, 68, 68, 22)}<text x="184" y="54" fill="#ffffff" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(trimText(goalie.playerName, 24))}</text><text x="184" y="84" fill="#94a3b8" font-size="20" font-family="Inter, Arial, sans-serif">${escapeXml(`${goalie.teamName} • ${goalie.saves} SV • ${goalie.shutouts} SO`)}</text><text x="${width - 34}" y="54" text-anchor="end" fill="${accent}" font-size="34" font-family="Inter, Arial, sans-serif" font-weight="900">${formatSavePct(goalie.savePct)} SV%</text><text x="${width - 34}" y="84" text-anchor="end" fill="#cbd5e1" font-size="20" font-family="Inter, Arial, sans-serif">${goalie.gaa.toFixed(2)} GAA</text></g>`;
}

function renderLeaderLogo(item: { teamLogoDataUri: string | null; teamName: string; teamShortName: string; teamPrimaryColor: string | null }, x: number, y: number, width: number, height: number, radius: number) {
  const fallback = getInitials(item.teamShortName || item.teamName);
  const fill = normalizeColor(item.teamPrimaryColor, '#1e293b');
  return item.teamLogoDataUri
    ? `<g><rect x="${x - 4}" y="${y - 4}" width="${width + 8}" height="${height + 8}" rx="${radius + 6}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" /><image href="${item.teamLogoDataUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" clip-path="inset(0 round ${radius}px)" /></g>`
    : `<g><rect x="${x - 4}" y="${y - 4}" width="${width + 8}" height="${height + 8}" rx="${radius + 6}" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" /><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" fill-opacity="0.28" /><text x="${x + width / 2}" y="${y + height / 2 + 16}" text-anchor="middle" fill="#ffffff" font-size="${Math.max(26, Math.floor(width * 0.33))}" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(fallback)}</text></g>`;
}
function renderTeamLogo(team: LogoTeam | null, x: number, y: number, width: number, height: number, radius: number) {
  if (team?.logoDataUri) return `<g><rect x="${x - 4}" y="${y - 4}" width="${width + 8}" height="${height + 8}" rx="${radius + 6}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" /><image href="${team.logoDataUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" clip-path="inset(0 round ${radius}px)" /></g>`;
  const fill = normalizeColor(team?.primaryColor, '#1e293b');
  return `<g><rect x="${x - 4}" y="${y - 4}" width="${width + 8}" height="${height + 8}" rx="${radius + 6}" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" /><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" fill-opacity="0.30" /><text x="${x + width / 2}" y="${y + height / 2 + Math.max(10, width * 0.12)}" text-anchor="middle" fill="#ffffff" font-size="${Math.max(14, Math.floor(width * 0.34))}" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(getInitials(team?.shortName || team?.name || 'T'))}</text></g>`;
}

function renderCenterScoreColumn({ awayScore, homeScore, brand, x, y, width, height }: { awayScore: number; homeScore: number; brand: ReturnType<typeof getBrand>; x: number; y: number; width: number; height: number }) {
  return `
    <g transform="translate(${x} ${y})">
      <rect width="${width}" height="${height}" rx="34" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.10)" />
      <text x="${width / 2}" y="46" text-anchor="middle" fill="${brand.accent}" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="3">FINAL</text>
      <text x="${width / 2}" y="152" text-anchor="middle" fill="#ffffff" font-size="72" font-family="Inter, Arial, sans-serif" font-weight="900">${awayScore}</text>
      <rect x="20" y="182" width="${width - 40}" height="10" rx="5" fill="rgba(255,255,255,0.14)" />
      <text x="${width / 2}" y="286" text-anchor="middle" fill="#ffffff" font-size="72" font-family="Inter, Arial, sans-serif" font-weight="900">${homeScore}</text>
      <text x="${width / 2}" y="348" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="700">BLH VERIFIED</text>
    </g>
  `;
}

function renderLeagueBadge(league: Props['league'], brand: ReturnType<typeof getBrand>, x: number, y: number, width: number, height: number) {
  return `<g transform="translate(${x} ${y})"><rect width="${width}" height="${height}" rx="28" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" />${league.logoDataUri ? `<image href="${league.logoDataUri}" x="18" y="16" width="72" height="72" preserveAspectRatio="xMidYMid meet" />` : `<circle cx="54" cy="52" r="28" fill="${brand.primary}" fill-opacity="0.34" /><text x="54" y="62" text-anchor="middle" fill="#ffffff" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="900">${escapeXml(getInitials(league.name))}</text>`}<text x="100" y="42" fill="#ffffff" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(trimText(league.name, 16))}</text><text x="100" y="68" fill="#cbd5e1" font-size="14" font-family="Inter, Arial, sans-serif">Official league graphic</text><rect x="100" y="78" width="48" height="8" rx="4" fill="${brand.accent}" opacity="0.9" /></g>`;
}

function renderFittedTeamName(name: string, x: number, y: number, maxCharsPerLine: number, fontSize: number, fill: string) {
  const lines = splitIntoLines(name, maxCharsPerLine, 2);
  const startY = lines.length === 1 ? y : y - 18;
  return `<text x="${x}" y="${startY}" text-anchor="middle" fill="${fill}" font-size="${fontSize}" font-family="Inter, Arial, sans-serif" font-weight="900">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? '0' : '40'}">${escapeXml(trimText(line, maxCharsPerLine + 2))}</tspan>`).join('')}</text>`;
}

function splitIntoLines(value: string, maxCharsPerLine: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (words.join(' ').length > lines.join(' ').length) lines[lines.length - 1] = trimText(`${lines[lines.length - 1]} ${words.slice(lines.join(' ').split(/\s+/).filter(Boolean).length).join(' ')}`.trim(), maxCharsPerLine + 2);
  return lines.slice(0, maxLines);
}

function brandSafe(color: string) { return color === '#ffffff' ? '#dbeafe' : color; }

function renderMovementGlyph(x: number, y: number, movement: number | null, fill: string) {
  if (movement === null || movement === 0) return `<circle cx="${x}" cy="${y}" r="14" fill="${fill}" fill-opacity="0.18" />`;
  if (movement > 0) return `<path d="M ${x} ${y - 14} L ${x - 12} ${y + 10} H ${x + 12} Z" fill="${fill}" />`;
  return `<path d="M ${x} ${y + 14} L ${x - 12} ${y - 10} H ${x + 12} Z" fill="${fill}" />`;
}

function aggregateWeeklyLeaders(playerLeaders: PlayerLeader[], playerStatEntries: PlayerStatEntry[], week: WeekOption | null, mode: 'weekly-points' | 'season-points' | 'weekly-goals'): LeaderSummary[] {
  if (mode === 'season-points') return [...playerLeaders].map(toLeaderSummary).sort(sortLeaderByPoints);
  const weekGameIds = new Set((week?.games ?? []).map((game) => game.id));
  const map = new Map<string, LeaderSummary>();
  for (const row of playerStatEntries) {
    if (!weekGameIds.has(row.gameId)) continue;
    const current = map.get(row.playerId) ?? {
      playerId: row.playerId,
      playerName: row.playerName,
      jerseyNumber: row.jerseyNumber,
      teamId: row.teamId,
      teamName: row.teamName,
      teamShortName: row.teamShortName,
      teamPrimaryColor: row.teamPrimaryColor,
      teamLogoDataUri: row.teamLogoDataUri,
      gamesPlayed: 0,
      goals: 0,
      assists: 0,
      points: 0,
    };
    current.gamesPlayed += 1;
    current.goals += row.goals;
    current.assists += row.assists;
    current.points += row.points;
    map.set(row.playerId, current);
  }
  return Array.from(map.values()).sort(mode === 'weekly-goals' ? sortLeaderByGoals : sortLeaderByPoints);
}
function aggregateWeeklyGoalies(entries: GoalieStatEntry[], week: WeekOption | null): GoalieSummary[] {
  const weekGameIds = new Set((week?.games ?? []).map((game) => game.id));
  const map = new Map<string, GoalieSummary>();
  for (const row of entries) {
    if (!weekGameIds.has(row.gameId)) continue;
    const current = map.get(row.playerId) ?? {
      playerId: row.playerId,
      playerName: row.playerName,
      jerseyNumber: row.jerseyNumber,
      teamId: row.teamId,
      teamName: row.teamName,
      teamShortName: row.teamShortName,
      teamPrimaryColor: row.teamPrimaryColor,
      teamLogoDataUri: row.teamLogoDataUri,
      gamesPlayed: 0,
      goalsAgainst: 0,
      saves: 0,
      shutouts: 0,
      minutesPlayed: 0,
      savePct: 0,
      gaa: 0,
    };
    current.gamesPlayed += 1;
    current.goalsAgainst += row.goalsAgainst;
    current.saves += row.saves;
    current.shutouts += row.shutouts;
    current.minutesPlayed += row.minutesPlayed;
    map.set(row.playerId, current);
  }
  return Array.from(map.values()).map((goalie) => {
    const shotsAgainst = goalie.saves + goalie.goalsAgainst;
    return { ...goalie, savePct: shotsAgainst > 0 ? goalie.saves / shotsAgainst : 0, gaa: goalie.gamesPlayed > 0 ? goalie.goalsAgainst / goalie.gamesPlayed : 0 };
  }).sort((a, b) => {
    if (b.savePct !== a.savePct) return b.savePct - a.savePct;
    if (a.gaa !== b.gaa) return a.gaa - b.gaa;
    return b.saves - a.saves;
  });
}

type LeaderSummary = PlayerLeader;
type GoalieSummary = GoalieLeader;
function toLeaderSummary(leader: PlayerLeader): LeaderSummary { return { ...leader }; }
function sortLeaderByPoints(a: LeaderSummary, b: LeaderSummary) { if (b.points !== a.points) return b.points - a.points; if (b.goals !== a.goals) return b.goals - a.goals; if (b.assists !== a.assists) return b.assists - a.assists; return a.playerName.localeCompare(b.playerName); }
function sortLeaderByGoals(a: LeaderSummary, b: LeaderSummary) { if (b.goals !== a.goals) return b.goals - a.goals; if (b.points !== a.points) return b.points - a.points; return a.playerName.localeCompare(b.playerName); }
function buildLeaderSubline(leader: LeaderSummary, mode: 'weekly-points' | 'season-points' | 'weekly-goals') { return `${leader.teamName} • ${leader.gamesPlayed} GP • ${leader.goals}G ${leader.assists}A${mode === 'weekly-goals' ? ` • ${leader.points} PTS` : ''}`; }

function wrapSvg(body: string) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" width="${SVG_WIDTH}" height="${SVG_HEIGHT}">${body}</svg>`; }
function getBrand(league: Props['league']) { return { primary: normalizeColor(league.primaryColor, '#22d3ee'), secondary: normalizeColor(league.secondaryColor, '#1d4ed8'), accent: mixColor(normalizeColor(league.primaryColor, '#22d3ee'), '#ffffff', 0.35) }; }
function normalizeColor(value: string | null | undefined, fallback: string) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value || '') ? value! : fallback; }
function mixColor(hex: string, other: string, weight: number) {
  const a = hexToRgb(hex); const b = hexToRgb(other); const w = Math.max(0, Math.min(1, weight));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * w);
  return rgbToHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b));
}
function hexToRgb(hex: string) { const clean = hex.replace('#', ''); const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean; return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) }; }
function rgbToHex(r: number, g: number, b: number) { return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`; }
function getInitials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'T'; }
function buildGameMeta(game: SocialGame) { const parts = [] as string[]; if (game.roundNumber) parts.push(`Round ${game.roundNumber}`); if (game.gameNumber) parts.push(`Game ${game.gameNumber}`); return parts.join(' • ') || 'Completed game'; }
function formatGameLabel(game: SocialGame) { return `${game.awayTeam?.name || 'Away'} ${game.awayScore} - ${game.homeScore} ${game.homeTeam?.name || 'Home'} • ${formatShortDate(game.scheduledAt)}`; }
function formatGameHeadline(game: SocialGame) { return `${shortTeamName(game.awayTeam?.name || 'Away')} ${game.awayScore}-${game.homeScore} ${shortTeamName(game.homeTeam?.name || 'Home')}`; }
function shortTeamName(name: string) { return trimText(name, 18); }
function formatShortDate(input: string | number) { return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(input)); }
function formatLongDate(input: string) { return new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(input)); }
function startOfDay(input: string) { const date = new Date(input); date.setHours(0, 0, 0, 0); return date; }
function slugify(input: string) { return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function trimText(value: string, maxLength: number) { if (value.length <= maxLength) return value; return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`; }
function escapeXml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function formatSavePct(value: number) { return (value * 100).toFixed(1); }
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
async function svgToPngBlob(svgMarkup: string, width: number, height: number) { const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); try { const image = await loadImage(url); const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D context unavailable'); context.drawImage(image, 0, 0, width, height); const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png')); if (!pngBlob) throw new Error('PNG export failed'); return pngBlob; } finally { URL.revokeObjectURL(url); } }
function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not load generated SVG into an image element')); image.src = src; }); }
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
