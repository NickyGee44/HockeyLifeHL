'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { CheckCircle2, Loader2, Save, UploadCloud, UserPlus } from 'lucide-react';
import { TeamLineupView } from '@/components/team/TeamLineupView';
import {
  publishGameTeamLineup,
  saveGameTeamLineupDraft,
} from '@/lib/actions/game-lineups';
import {
  isGoaliePosition,
  type GameTeamLineupLayout,
  type GameTeamLineupStatus,
  type LineupRosterPlayer,
} from '@/lib/lineups/types';

const FORWARD_SLOTS = 6;
const DEFENCE_SLOTS = 4;
const GOALIE_SLOTS = 1;

const FORWARD_COORDS = [
  { x: 14, y: 30 },
  { x: 28, y: 30 },
  { x: 42, y: 30 },
  { x: 58, y: 30 },
  { x: 72, y: 30 },
  { x: 86, y: 30 },
];
const DEFENCE_COORDS = [
  { x: 36, y: 64 },
  { x: 64, y: 64 },
  { x: 36, y: 78 },
  { x: 64, y: 78 },
];
const GOALIE_COORDS = { x: 50, y: 90 };

type SlotType = 'forward' | 'defence' | 'goalie';

function isDefencePosition(position: string | null | undefined) {
  if (!position) return false;
  const p = position.toLowerCase();
  return p === 'd' || p === 'defence' || p === 'defense' || p === 'ld' || p === 'rd';
}

function classifyPlayer(player: LineupRosterPlayer): SlotType {
  if (isGoaliePosition(player.position)) return 'goalie';
  if (isDefencePosition(player.position)) return 'defence';
  return 'forward';
}

function slotLabel(type: SlotType) {
  if (type === 'goalie') return 'Goalie';
  if (type === 'defence') return 'Defence';
  return 'Forward';
}

type Props = {
  gameId: string;
  teamId: string;
  leagueSlug: string;
  initialLayout: GameTeamLineupLayout;
  initialStatus: GameTeamLineupStatus;
  primaryColor: string;
  secondaryColor: string;
};

export function CaptainLineupModalEditor({
  gameId,
  teamId,
  leagueSlug,
  initialLayout,
  initialStatus,
  primaryColor,
  secondaryColor,
}: Props) {
  const [layout, setLayout] = useState<GameTeamLineupLayout>(initialLayout);
  const [status, setStatus] = useState<GameTeamLineupStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingDraft, startSaveDraft] = useTransition();
  const [publishing, startPublish] = useTransition();

  useEffect(() => {
    setLayout(initialLayout);
    setStatus(initialStatus);
    setDirty(false);
    setError(null);
  }, [initialLayout, initialStatus]);

  const eligible = useMemo(
    () =>
      layout.roster.filter(
        (player) => player.availability === 'confirmed' || player.isSub === true,
      ),
    [layout.roster],
  );

  const eligibleById = useMemo(() => {
    const map = new Map<string, LineupRosterPlayer>();
    for (const player of eligible) {
      map.set(player.playerId, player);
    }
    return map;
  }, [eligible]);

  const placedPlayers = useMemo(
    () =>
      layout.placedPlayers
        .map((entry) => eligibleById.get(entry.playerId))
        .filter((player): player is LineupRosterPlayer => Boolean(player)),
    [layout.placedPlayers, eligibleById],
  );

  const placedForwards = placedPlayers.filter((p) => classifyPlayer(p) === 'forward');
  const placedDefence = placedPlayers.filter((p) => classifyPlayer(p) === 'defence');
  const placedGoalies = placedPlayers.filter((p) => classifyPlayer(p) === 'goalie');

  const placedIds = useMemo(
    () => new Set(placedPlayers.map((p) => p.playerId)),
    [placedPlayers],
  );

  const unassigned = useMemo(
    () => eligible.filter((player) => !placedIds.has(player.playerId)),
    [eligible, placedIds],
  );

  const placePlayer = (player: LineupRosterPlayer) => {
    const slotType = classifyPlayer(player);
    let coords: { x: number; y: number };

    if (slotType === 'goalie') {
      if (placedGoalies.length >= GOALIE_SLOTS) {
        setError('Goalie slot is already filled. Tap the goalie jersey to remove them first.');
        return;
      }
      coords = GOALIE_COORDS;
    } else if (slotType === 'defence') {
      if (placedDefence.length >= DEFENCE_SLOTS) {
        setError('All defence slots are filled. Remove a defender to make room.');
        return;
      }
      coords = DEFENCE_COORDS[placedDefence.length];
    } else {
      if (placedForwards.length >= FORWARD_SLOTS) {
        setError('All forward slots are filled. Remove a forward to make room.');
        return;
      }
      coords = FORWARD_COORDS[placedForwards.length];
    }

    setError(null);
    setSavedAt(null);
    setDirty(true);
    setLayout((prev) => ({
      ...prev,
      placedPlayers: [
        ...prev.placedPlayers.filter((entry) => entry.playerId !== player.playerId),
        { playerId: player.playerId, x: coords.x, y: coords.y },
      ],
    }));
  };

  const removePlayer = (playerId: string) => {
    setError(null);
    setSavedAt(null);
    setDirty(true);
    setLayout((prev) => ({
      ...prev,
      placedPlayers: prev.placedPlayers.filter((entry) => entry.playerId !== playerId),
    }));
  };

  const handleSaveDraft = () => {
    if (savingDraft || publishing) return;
    setError(null);
    startSaveDraft(async () => {
      const result = await saveGameTeamLineupDraft({
        gameId,
        teamId,
        leagueSlug,
        layout,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLayout(result.data.layout);
      setStatus(result.data.status);
      setDirty(false);
      setSavedAt('Draft saved');
    });
  };

  const handlePublish = () => {
    if (savingDraft || publishing) return;
    setError(null);
    startPublish(async () => {
      const result = await publishGameTeamLineup({
        gameId,
        teamId,
        leagueSlug,
        layout,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLayout(result.data.layout);
      setStatus(result.data.status);
      setDirty(false);
      setSavedAt('Lineup published');
    });
  };

  const skaterDisplay = placedPlayers
    .filter((p) => classifyPlayer(p) !== 'goalie')
    .map((p) => ({
      playerId: p.playerId,
      name: p.fullName ?? 'Player',
      jerseyNumber: p.jerseyNumber,
      position: p.position,
    }));

  const goalieDisplay = placedGoalies.map((p) => ({
    playerId: p.playerId,
    name: p.fullName ?? 'Player',
    jerseyNumber: p.jerseyNumber,
    position: p.position,
  }));

  const availabilityMap: Record<string, 'confirmed' | 'tentative' | 'out'> = {};
  for (const player of placedPlayers) {
    if (
      player.availability === 'confirmed' ||
      player.availability === 'tentative' ||
      player.availability === 'out'
    ) {
      availabilityMap[player.playerId] = player.availability;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
              status === 'published'
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
            }`}
          >
            {status === 'published' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {status === 'published' ? 'Published' : 'Draft'}
          </span>
          {dirty ? <span className="text-amber-300">Unsaved changes</span> : null}
          {savedAt && !dirty ? <span className="text-emerald-300">{savedAt}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || publishing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]/70 px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--league-primary)]/40 hover:bg-[var(--color-background-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save draft
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={savingDraft || publishing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--league-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Publish
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-background)]/60 p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            Lineup Card
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Tap a jersey to remove
          </p>
        </div>
        <TeamLineupView
          skaters={skaterDisplay}
          goalies={goalieDisplay}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          availabilityMap={availabilityMap}
          onPlayerClick={removePlayer}
          removeAffordance
        />
      </div>

      <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[var(--league-primary)]" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              Unassigned Roster
            </h3>
          </div>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-background)]/60 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
            {unassigned.length} available
          </span>
        </div>

        {unassigned.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)]/40 px-4 py-6 text-center text-sm text-[var(--color-text-secondary)]">
            Everyone marked In is already in the lineup. Mark more players In or invite a sub to add more.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {unassigned.map((player) => {
              const slotType = classifyPlayer(player);
              const isFull =
                (slotType === 'forward' && placedForwards.length >= FORWARD_SLOTS) ||
                (slotType === 'defence' && placedDefence.length >= DEFENCE_SLOTS) ||
                (slotType === 'goalie' && placedGoalies.length >= GOALIE_SLOTS);

              return (
                <li key={player.playerId}>
                  <button
                    type="button"
                    onClick={() => placePlayer(player)}
                    disabled={isFull}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                      isFull
                        ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-background)]/40 text-[var(--color-text-muted)]'
                        : 'border-[var(--color-border)] bg-[var(--color-background)]/70 text-[var(--color-text-primary)] hover:border-[var(--league-primary)]/40 hover:bg-[var(--color-background-elevated)]'
                    }`}
                  >
                    <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[var(--league-primary)]/12 text-sm font-black text-[var(--league-primary)]">
                      {player.jerseyNumber ?? '—'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {player.fullName ?? 'Player'}
                        </span>
                        {player.isSub ? (
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                            Sub
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        {slotLabel(slotType)}
                        {isFull ? ' • Slots full' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
