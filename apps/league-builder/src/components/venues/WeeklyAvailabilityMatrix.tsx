'use client';

import { useState } from 'react';
import { CalendarPlus2, Copy, Loader2, Plus, Trash2, X } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface WeeklyAvailabilityMatrixSlot {
  id: string;
  venueId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxGames?: number | null;
}

interface WeeklyAvailabilityMatrixProps {
  venues: Array<{ id: string; name: string }>;
  slots: WeeklyAvailabilityMatrixSlot[];
  onAddSlot: (slot: {
    venueId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    maxGames: number | null;
  }) => Promise<void> | void;
  onDeleteSlot?: (slotId: string) => Promise<void> | void;
  onCopySlotToOtherVenues?: (slot: WeeklyAvailabilityMatrixSlot) => Promise<void> | void;
}

type DraftState = {
  startTime: string;
  endTime: string;
  maxGames: string;
};

function createDefaultDraft(): DraftState {
  return {
    startTime: '19:00',
    endTime: '21:00',
    maxGames: '',
  };
}

function getCellKey(venueId: string, dayOfWeek: number) {
  return `${venueId}:${dayOfWeek}`;
}

export function WeeklyAvailabilityMatrix({
  venues,
  slots,
  onAddSlot,
  onDeleteSlot,
  onCopySlotToOtherVenues,
}: WeeklyAvailabilityMatrixProps) {
  const [openCellKey, setOpenCellKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [pendingCellKey, setPendingCellKey] = useState<string | null>(null);
  const [pendingCopySlotId, setPendingCopySlotId] = useState<string | null>(null);
  const [pendingDeleteSlotId, setPendingDeleteSlotId] = useState<string | null>(null);

  const getCellSlots = (venueId: string, dayOfWeek: number) =>
    slots
      .filter((slot) => slot.venueId === venueId && slot.dayOfWeek === dayOfWeek)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));

  const openDraft = (venueId: string, dayOfWeek: number) => {
    const key = getCellKey(venueId, dayOfWeek);
    setDrafts((previous) => ({
      ...previous,
      [key]: previous[key] || createDefaultDraft(),
    }));
    setOpenCellKey(key);
  };

  const closeDraft = () => {
    setOpenCellKey(null);
  };

  const updateDraft = (cellKey: string, field: keyof DraftState, value: string) => {
    setDrafts((previous) => ({
      ...previous,
      [cellKey]: {
        ...(previous[cellKey] || createDefaultDraft()),
        [field]: value,
      },
    }));
  };

  const handleAddSlot = async (venueId: string, dayOfWeek: number) => {
    const cellKey = getCellKey(venueId, dayOfWeek);
    const draft = drafts[cellKey] || createDefaultDraft();
    if (!draft.startTime || !draft.endTime) {
      return;
    }

    setPendingCellKey(cellKey);
    try {
      await onAddSlot({
        venueId,
        dayOfWeek,
        startTime: draft.startTime,
        endTime: draft.endTime,
        maxGames: draft.maxGames ? parseInt(draft.maxGames, 10) : null,
      });
      setDrafts((previous) => ({
        ...previous,
        [cellKey]: createDefaultDraft(),
      }));
      setOpenCellKey(null);
    } finally {
      setPendingCellKey(null);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!onDeleteSlot) return;
    setPendingDeleteSlotId(slotId);
    try {
      await onDeleteSlot(slotId);
    } finally {
      setPendingDeleteSlotId(null);
    }
  };

  const handleCopySlot = async (slot: WeeklyAvailabilityMatrixSlot) => {
    if (!onCopySlotToOtherVenues) return;
    setPendingCopySlotId(slot.id);
    try {
      await onCopySlotToOtherVenues(slot);
    } finally {
      setPendingCopySlotId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
      <table className="min-w-[900px] w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">Venue</th>
            {DAY_NAMES.map((day) => (
              <th key={day} className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {venues.map((venue) => (
            <tr key={venue.id} className="align-top">
              <td className="px-4 py-3 font-medium text-white">{venue.name}</td>
              {DAY_NAMES.map((_, dayOfWeek) => {
                const cellKey = getCellKey(venue.id, dayOfWeek);
                const cellSlots = getCellSlots(venue.id, dayOfWeek);
                const draft = drafts[cellKey] || createDefaultDraft();
                const isOpen = openCellKey === cellKey;
                const isPending = pendingCellKey === cellKey;

                return (
                  <td key={cellKey} className="px-3 py-3">
                    <div className="min-h-[110px] rounded-lg border border-white/5 bg-neutral-900/50 p-2">
                      <div className="space-y-1.5">
                        {cellSlots.map((slot) => (
                          <div key={slot.id} className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-mono text-xs text-white">
                                  {slot.startTime} - {slot.endTime}
                                </p>
                                {slot.maxGames ? (
                                  <p className="text-[11px] text-neutral-500">max {slot.maxGames}</p>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-1">
                                {onCopySlotToOtherVenues ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopySlot(slot)}
                                    disabled={pendingCopySlotId === slot.id}
                                    className="rounded p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                                    title="Copy this day and time to the other venues"
                                  >
                                    {pendingCopySlotId === slot.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                ) : null}
                                {onDeleteSlot ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    disabled={pendingDeleteSlotId === slot.id}
                                    className="rounded p-1 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                                    title="Delete slot"
                                  >
                                    {pendingDeleteSlotId === slot.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {isOpen ? (
                        <div className="mt-2 space-y-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="time"
                              value={draft.startTime}
                              onChange={(event) => updateDraft(cellKey, 'startTime', event.target.value)}
                              className="rounded border border-white/10 bg-neutral-950 px-2 py-1 text-xs text-white"
                            />
                            <input
                              type="time"
                              value={draft.endTime}
                              onChange={(event) => updateDraft(cellKey, 'endTime', event.target.value)}
                              className="rounded border border-white/10 bg-neutral-950 px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={draft.maxGames}
                            onChange={(event) => updateDraft(cellKey, 'maxGames', event.target.value)}
                            placeholder="Max games"
                            className="w-full rounded border border-white/10 bg-neutral-950 px-2 py-1 text-xs text-white placeholder:text-neutral-600"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAddSlot(venue.id, dayOfWeek)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded bg-rink-500 px-2 py-1 text-[11px] font-semibold text-black transition-colors hover:bg-rink-400 disabled:opacity-50"
                            >
                              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarPlus2 className="h-3 w-3" />}
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={closeDraft}
                              className="rounded border border-white/10 px-2 py-1 text-[11px] text-neutral-400 transition-colors hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openDraft(venue.id, dayOfWeek)}
                          className="mt-2 inline-flex items-center gap-1 rounded border border-dashed border-white/10 px-2 py-1 text-[11px] text-neutral-500 transition-colors hover:border-rink-500/40 hover:text-rink-400"
                        >
                          <Plus className="h-3 w-3" />
                          Add slot
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
