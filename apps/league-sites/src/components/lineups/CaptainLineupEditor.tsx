'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ArrowLeft,
  Clock3,
  Eraser,
  Grip,
  Loader2,
  MapPin,
  MessageCircleMore,
  MessageSquare,
  RotateCcw,
  Save,
  Share2,
  Shield,
  Sparkles,
  TriangleAlert,
  Upload,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import {
  getCaptainGameLineupEditorData,
  publishGameTeamLineup,
  saveGameTeamLineupDraft,
} from '@/lib/actions/game-lineups';
import { LineupRinkBoard } from '@/components/lineups/LineupRinkBoard';
import { downloadLineupImage, shareLineupImage } from '@/lib/lineups/share-image';
import {
  buildDefaultLineupLayout,
  normalizeLineupLayout,
  type GameLineupEditorData,
  type GameTeamLineupLayout,
  type LineupRosterPlayer,
} from '@/lib/lineups/types';

type Props = {
  leagueSlug: string;
  gameId: string;
  teamId: string;
  canManage: boolean;
};

type DragState = {
  playerId: string;
  origin: 'bench' | 'rink';
  originalPlacement: { x: number; y: number } | null;
};

const FORMATION_OPTIONS = [
  { value: 'open-ice', label: 'Open Ice' },
  { value: 'starter-unit', label: 'Starter Unit' },
  { value: 'full-bench', label: 'Full Bench Card' },
];

function formatGameTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function buildFileName(teamName: string, scheduledAt: string) {
  const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const stamp = new Date(scheduledAt).toISOString().slice(0, 10);
  return `${slug}-lineup-${stamp}.png`;
}

export function CaptainLineupEditor({ leagueSlug, gameId, teamId, canManage }: Props) {
  const rinkRef = useRef<HTMLDivElement | null>(null);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const [editorData, setEditorData] = useState<GameLineupEditorData | null>(null);
  const [layout, setLayout] = useState<GameTeamLineupLayout | null>(null);
  const [formation, setFormation] = useState<string>('open-ice');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function loadEditor() {
      if (!canManage) {
        setError('Captain access is required to manage lineups.');
        setIsLoading(false);
        return;
      }

      const result = await getCaptainGameLineupEditorData(gameId, teamId);
      if (!isMounted) return;

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setEditorData(result.data);
      setLayout(result.data.lineup.layout);
      setFormation(result.data.lineup.formation ?? 'open-ice');
      setIsLoading(false);
    }

    loadEditor();
    return () => {
      isMounted = false;
    };
  }, [canManage, gameId, teamId]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      setDragPoint({ x: event.clientX, y: event.clientY });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const rinkNode = rinkRef.current;
      const benchNode = benchRef.current;

      if (rinkNode && target && rinkNode.contains(target)) {
        const rect = rinkNode.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        setLayout((current) => {
          if (!current) return current;
          return normalizeLineupLayout(
            {
              ...current,
              placedPlayers: [
                ...current.placedPlayers.filter((player) => player.playerId !== dragState.playerId),
                { playerId: dragState.playerId, x, y },
              ],
            },
            current.roster,
          );
        });
      } else if (benchNode && target && benchNode.contains(target)) {
        setLayout((current) => {
          if (!current) return current;
          return {
            ...current,
            placedPlayers: current.placedPlayers.filter((player) => player.playerId !== dragState.playerId),
          };
        });
      }

      setDragState(null);
      setDragPoint(null);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState]);

  const rosterById = useMemo(() => new Map(layout?.roster.map((player) => [player.playerId, player]) ?? []), [layout]);

  const placedCount = layout?.placedPlayers.length ?? 0;
  const confirmedCount = layout?.roster.filter((player) => player.availability === 'confirmed').length ?? 0;
  const subCount = layout?.roster.filter((player) => player.isSub).length ?? 0;

  const teamName = editorData?.game.team.name ?? 'Your Team';
  const opponentName = editorData?.game.opponent.name ?? 'Opponent';
  const accentColor = editorData?.game.team.primaryColor ?? '#0ea5e9';
  const gameLink = typeof window !== 'undefined' ? `${window.location.origin}/${leagueSlug}/games/${gameId}` : `/${leagueSlug}/games/${gameId}`;

  const beginDrag = (playerId: string, origin: 'bench' | 'rink') => (event: React.PointerEvent) => {
    event.preventDefault();
    const originalPlacement = layout?.placedPlayers.find((player) => player.playerId === playerId);
    setDragState({
      playerId,
      origin,
      originalPlacement: originalPlacement ? { x: originalPlacement.x, y: originalPlacement.y } : null,
    });
    setDragPoint({ x: event.clientX, y: event.clientY });
  };

  const handleResetFromCheckins = () => {
    if (!layout) return;
    setLayout(buildDefaultLineupLayout(layout.roster));
    setStatusMessage('Lineup reset from current In players and available spares.');
  };

  const handleClearIce = () => {
    if (!layout) return;
    setLayout({ ...layout, placedPlayers: [] });
    setStatusMessage('All players moved back to the bench.');
  };

  const handleSave = (publish: boolean) => {
    if (!layout || !editorData) return;

    setError(null);
    setStatusMessage(null);
    startTransition(async () => {
      const action = publish ? publishGameTeamLineup : saveGameTeamLineupDraft;
      const result = await action({
        gameId,
        teamId,
        leagueSlug,
        formation,
        layout,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setLayout(result.data.layout);
      setEditorData((current) => current ? {
        ...current,
        lineup: {
          ...current.lineup,
          ...result.data,
          formation,
        },
      } : current);
      setStatusMessage(publish ? 'Lineup published to the game page.' : 'Lineup saved.');
    });
  };

  const handleShare = async () => {
    if (!layout || !editorData || placedCount === 0) return;

    setError(null);
    setStatusMessage(null);

    const fileName = buildFileName(teamName, editorData.game.scheduledAt);
    const scheduledLabel = formatGameTime(editorData.game.scheduledAt);

    try {
      const shared = await shareLineupImage({
        teamName,
        opponentName,
        scheduledLabel,
        venue: editorData.game.venue,
        accentColor,
        fileName,
        layout,
        shareTitle: `${teamName} lineup`,
        shareText: `${teamName} lineup vs ${opponentName}`,
        shareUrl: gameLink,
      });
      setStatusMessage(shared ? 'Opened your share sheet.' : 'Image downloaded. Share it in Messages or WhatsApp.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to share lineup.');
    }
  };

  const handleDownload = async () => {
    if (!layout || !editorData || placedCount === 0) return;

    try {
      await downloadLineupImage({
        teamName,
        opponentName,
        scheduledLabel: formatGameTime(editorData.game.scheduledAt),
        venue: editorData.game.venue,
        accentColor,
        fileName: buildFileName(teamName, editorData.game.scheduledAt),
        layout,
      });
      setStatusMessage('Lineup image downloaded.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to download lineup image.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading the game-day lineup board...</p>
        </div>
      </div>
    );
  }

  if (error && !editorData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-center">
          <TriangleAlert className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-2xl font-black text-white">Lineup access unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-amber-100/85">{error}</p>
          <Link
            href={`/${leagueSlug}/captain`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to captain dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!editorData || !layout) {
    return null;
  }

  const floatingPlayer = dragState ? rosterById.get(dragState.playerId) ?? null : null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="glass-card-strong rounded-[36px] border-cyan-400/15 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <Link
              href={`/${leagueSlug}/captain`}
              className="inline-flex items-center gap-2 text-sm text-cyan-100/80 hover:text-cyan-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to captain dashboard
            </Link>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Shield className="h-3.5 w-3.5" />
              Game Day Lineup Studio
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-[2.7rem]">{teamName}</h1>
            <p className="mt-2 text-base text-neutral-300">Set the skaters on the ice, publish the look, and share it in one move before puck drop.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
                <Clock3 className="h-4 w-4 text-cyan-200" />
                {formatGameTime(editorData.game.scheduledAt)}
              </span>
              {editorData.game.venue && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
                  <MapPin className="h-4 w-4 text-cyan-200" />
                  {editorData.game.venue}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
                <Sparkles className="h-4 w-4 text-cyan-200" />
                vs {opponentName}
              </span>
            </div>
          </div>

          <div className="glass-card-strong w-full max-w-md rounded-[28px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Publishing status</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Assigned', value: placedCount },
                { label: 'In', value: confirmedCount },
                { label: 'Spares', value: subCount },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-4 text-center">
                  <p className="text-2xl font-black text-white">{item.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-neutral-500">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1">{confirmedCount} in</span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">{subCount} spares</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Only In players and spares appear below</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Editor</p>
                <h2 className="mt-2 text-xl font-black text-white">Assign jerseys from the unassigned roster</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFromCheckins}
                  className="glass-control inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset from RSVP
                </button>
                <button
                  type="button"
                  onClick={handleClearIce}
                  className="glass-control inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Eraser className="h-4 w-4" />
                  Clear ice
                </button>
              </div>
            </div>

            <LineupRinkBoard
              layout={layout}
              teamName={teamName}
              accentColor={accentColor}
              rinkRef={rinkRef}
              benchRef={benchRef}
              renderPlacedPlayer={(player) => (
                <button
                  type="button"
                  onPointerDown={beginDrag(player.playerId, 'rink')}
                  className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 touch-none"
                  aria-label={`Move ${player.fullName || 'player'} on the rink`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-black text-white shadow-[0_14px_34px_rgba(2,6,23,0.35)]"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.26), transparent 38%), ${accentColor}`,
                      borderColor: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    #{player.jerseyNumber ?? '00'}
                  </div>
                  <div className="rounded-full border border-white/15 bg-slate-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                    {player.fullName || 'Player'}
                  </div>
                </button>
              )}
              renderBenchPlayer={(player) => (
                <button
                  type="button"
                  onPointerDown={beginDrag(player.playerId, 'bench')}
                  className={cn(
                    'w-full touch-none rounded-2xl border px-3 py-2 text-left transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/10',
                    player.isSub
                      ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                      : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                  )}
                  aria-label={`Drag ${player.fullName || 'player'} onto the rink`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{player.fullName || 'Player'}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] opacity-80">
                        #{player.jerseyNumber ?? '--'}
                        {player.position ? ` · ${player.position}` : ''}
                      </p>
                    </div>
                    <Grip className="h-4 w-4 opacity-70" />
                  </div>
                </button>
              )}
            />
          </div>

          <div className="space-y-5">
            <div className="glass-card-strong rounded-[28px] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Controls</p>
              <div className="mt-4 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-white">Presentation</span>
                  <select
                    value={formation}
                    onChange={(event) => setFormation(event.target.value)}
                    className="glass-control w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white outline-none focus:border-cyan-300/35"
                  >
                    {FORMATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={isPending}
                    className="glass-control inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editorData.lineup.status === 'published' ? 'Save changes' : 'Save draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Publish lineup
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-card-strong rounded-[28px] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Share</p>
              <h3 className="mt-3 text-xl font-black text-white">Send it to the room</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-300">Create a clean lineup image, then send it straight to Messages or WhatsApp from your share sheet.</p>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={placedCount === 0}
                  className="glass-control inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  Share lineup image
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={placedCount === 0}
                  className="glass-control inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  Download PNG
                </button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    href={`sms:?&body=${encodeURIComponent(`${teamName} lineup vs ${opponentName}: ${gameLink}`)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-black/30"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Text link
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${teamName} lineup vs ${opponentName}: ${gameLink}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white hover:bg-black/30"
                  >
                    <MessageCircleMore className="h-4 w-4" />
                    WhatsApp link
                  </a>
                </div>
              </div>
            </div>

            <div className="glass-card-strong rounded-[28px] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Publishing notes</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-300">
                <li>Players will see the published lineup directly on the game page.</li>
                <li>Reset from RSVP only seeds players marked In plus accepted spares.</li>
                <li>Out, unsure, and no-response players are hidden from the unassigned roster.</li>
              </ul>
            </div>

            {(statusMessage || error) && (
              <div className={cn(
                'rounded-[24px] border p-4 text-sm font-medium',
                error
                  ? 'border-rose-400/20 bg-rose-400/10 text-rose-100'
                  : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
              )}>
                {error || statusMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {floatingPlayer && dragPoint && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-[60]"
          style={{ transform: `translate(${dragPoint.x - 30}px, ${dragPoint.y - 30}px)` }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-black text-white shadow-[0_18px_48px_rgba(2,6,23,0.45)]"
            style={{
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.26), transparent 38%), ${accentColor}`,
              borderColor: 'rgba(255,255,255,0.55)',
            }}
          >
            #{floatingPlayer.jerseyNumber ?? '00'}
          </div>
        </div>
      )}
    </div>
  );
}
