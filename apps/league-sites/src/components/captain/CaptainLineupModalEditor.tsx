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
  type LineupPlacedPlayer,
  type LineupRosterPlayer,
} from '@/lib/lineups/types';

const BASE_FORWARD_SLOTS = 6;
const BASE_DEFENCE_SLOTS = 4;
const EXTENDED_FORWARD_SLOTS = 9;
const EXTENDED_DEFENCE_SLOTS = 6;
const GOALIE_SLOTS = 1;
const EXTENDED_ATTENDANCE_THRESHOLD = 11;

// Forwards render 3-across (y < 50), defence 2-across (50 <= y < 86),
// goalie at y >= 86. deriveSlotFromCoord relies on those bands so anything
// we place must stay within them.
const FORWARD_COORDS_BASE = [
  { x: 28, y: 22 }, { x: 50, y: 22 }, { x: 72, y: 22 },
  { x: 28, y: 38 }, { x: 50, y: 38 }, { x: 72, y: 38 },
];
const FORWARD_COORDS_EXTENDED = [
  ...FORWARD_COORDS_BASE,
  { x: 28, y: 48 }, { x: 50, y: 48 }, { x: 72, y: 48 },
];
const DEFENCE_COORDS_BASE = [
  { x: 35, y: 58 }, { x: 65, y: 58 },
  { x: 35, y: 72 }, { x: 65, y: 72 },
];
const DEFENCE_COORDS_EXTENDED = [
  ...DEFENCE_COORDS_BASE,
  { x: 35, y: 82 }, { x: 65, y: 82 },
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

// Captain's chosen slot is encoded by coord bands, not player.position —
// this lets a forward be placed into a defence slot on purpose.
function deriveSlotFromCoord(coord: { x: number; y: number } | undefined): SlotType | null {
  if (!coord) return null;
  if (coord.y >= 86) return 'goalie';
  if (coord.y >= 50) return 'defence';
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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [savingDraft, startSaveDraft] = useTransition();
  const [publishing, startPublish] = useTransition();

  useEffect(() => {
    setLayout(initialLayout);
    setStatus(initialStatus);
    setDirty(false);
    setError(null);
    setSelectedPlayerId(null);
  }, [initialLayout, initialStatus]);

  const eligible = useMemo(
    () =>
      layout.roster.filter(
        (player) => player.availability === 'confirmed' || player.isSub === true,
      ),
    [layout.roster],
  );

  const extendedGrid = eligible.length > EXTENDED_ATTENDANCE_THRESHOLD;
  const forwardSlotCount = extendedGrid ? EXTENDED_FORWARD_SLOTS : BASE_FORWARD_SLOTS;
  const defenceSlotCount = extendedGrid ? EXTENDED_DEFENCE_SLOTS : BASE_DEFENCE_SLOTS;
  const forwardCoords = extendedGrid ? FORWARD_COORDS_EXTENDED : FORWARD_COORDS_BASE;
  const defenceCoords = extendedGrid ? DEFENCE_COORDS_EXTENDED : DEFENCE_COORDS_BASE;

  const eligibleById = useMemo(() => {
    const map = new Map<string, LineupRosterPlayer>();
    for (const player of eligible) {
      map.set(player.playerId, player);
    }
    return map;
  }, [eligible]);

  const placedEntries = useMemo(
    () =>
      layout.placedPlayers
        .map((entry) => {
          const player = eligibleById.get(entry.playerId);
          if (!player) return null;
          const slot = deriveSlotFromCoord(entry) ?? classifyPlayer(player);
          return { player, entry, slot };
        })
        .filter(
          (value): value is { player: LineupRosterPlayer; entry: LineupPlacedPlayer; slot: SlotType } =>
            value !== null,
        ),
    [layout.placedPlayers, eligibleById],
  );

  const placedBySlot = useMemo(() => {
    const buckets: Record<SlotType, typeof placedEntries> = {
      forward: [],
      defence: [],
      goalie: [],
    };
    for (const item of placedEntries) {
      buckets[item.slot].push(item);
    }
    return buckets;
  }, [placedEntries]);

  const placedIds = useMemo(
    () => new Set(placedEntries.map((item) => item.player.playerId)),
    [placedEntries],
  );

  const unassigned = useMemo(
    () => eligible.filter((player) => !placedIds.has(player.playerId)),
    [eligible, placedIds],
  );

  const selectedPlayer = selectedPlayerId ? eligibleById.get(selectedPlayerId) ?? null : null;

  const toggleSelect = (playerId: string) => {
    setError(null);
    setSelectedPlayerId((current) => (current === playerId ? null : playerId));
  };

  const placeSelectedInSection = (slotType: SlotType) => {
    if (!selectedPlayerId) {
      setError('Select a player from Unassigned Roster first, then tap an empty slot.');
      return;
    }

    const player = eligibleById.get(selectedPlayerId);
    if (!player) {
      setSelectedPlayerId(null);
      return;
    }

    const maxSlots = slotType === 'forward' ? forwardSlotCount : slotType === 'defence' ? defenceSlotCount : GOALIE_SLOTS;
    // Count existing players in this section, ignoring the selected player if they're already placed.
    const occupants = placedBySlot[slotType].filter((item) => item.player.playerId !== selectedPlayerId);

    if (occupants.length >= maxSlots) {
      setError(`${slotLabel(slotType)} slots are full. Remove someone first.`);
      return;
    }

    const coord =
      slotType === 'goalie'
        ? GOALIE_COORDS
        : slotType === 'defence'
          ? defenceCoords[occupants.length]
          : forwardCoords[occupants.length];

    setError(null);
    setSavedAt(null);
    setDirty(true);
    setLayout((prev) => ({
      ...prev,
      placedPlayers: [
        ...prev.placedPlayers.filter((entry) => entry.playerId !== selectedPlayerId),
        { playerId: selectedPlayerId, x: coord.x, y: coord.y },
      ],
    }));
    setSelectedPlayerId(null);
  };

  const handleJerseyClick = (playerId: string) => {
    // If a different player is currently selected, swap them into this slot.
    if (selectedPlayerId && selectedPlayerId !== playerId) {
      const existingEntry = layout.placedPlayers.find((entry) => entry.playerId === playerId);
      if (!existingEntry) {
        return;
      }

      setError(null);
      setSavedAt(null);
      setDirty(true);
      setLayout((prev) => ({
        ...prev,
        placedPlayers: [
          ...prev.placedPlayers.filter(
            (entry) => entry.playerId !== playerId && entry.playerId !== selectedPlayerId,
          ),
          { playerId: selectedPlayerId, x: existingEntry.x, y: existingEntry.y },
        ],
      }));
      setSelectedPlayerId(null);
      return;
    }

    // Otherwise just remove the tapped player from the lineup.
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

  // Force display position to match the captain's chosen slot, so a forward
  // intentionally placed into a defence slot lands in the defence bucket.
  const skaterDisplay = placedEntries
    .filter((item) => item.slot !== 'goalie')
    .map((item) => ({
      playerId: item.player.playerId,
      name: item.player.fullName ?? 'Player',
      jerseyNumber: item.player.jerseyNumber,
      position: item.slot === 'defence' ? 'D' : 'C',
    }));

  const goalieDisplay = placedBySlot.goalie.map((item) => ({
    playerId: item.player.playerId,
    name: item.player.fullName ?? 'Player',
    jerseyNumber: item.player.jerseyNumber,
    position: 'G',
  }));

  const availabilityMap: Record<string, 'confirmed' | 'tentative' | 'out'> = {};
  for (const item of placedEntries) {
    const availability = item.player.availability;
    if (availability === 'confirmed' || availability === 'tentative' || availability === 'out') {
      availabilityMap[item.player.playerId] = availability;
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
            {selectedPlayer
              ? `Tap an empty slot to place ${selectedPlayer.fullName ?? 'player'}`
              : 'Select a player, then tap a slot'}
          </p>
        </div>
        <TeamLineupView
          skaters={skaterDisplay}
          goalies={goalieDisplay}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          availabilityMap={availabilityMap}
          onPlayerClick={handleJerseyClick}
          onEmptySlotClick={selectedPlayerId ? placeSelectedInSection : undefined}
          highlightEmptySlots={Boolean(selectedPlayerId)}
          removeAffordance
          forwardSlots={forwardSlotCount}
          defenceSlots={defenceSlotCount}
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
              const suggestedSlot = classifyPlayer(player);
              const isSelected = selectedPlayerId === player.playerId;

              return (
                <li key={player.playerId}>
                  <button
                    type="button"
                    onClick={() => toggleSelect(player.playerId)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-[var(--league-primary)] bg-[var(--league-primary)]/15 text-[var(--color-text-primary)] ring-2 ring-[var(--league-primary)]/40'
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
                        {slotLabel(suggestedSlot)}
                        {isSelected ? ' • Selected — tap a slot' : ''}
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
