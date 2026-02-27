'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { saveVenueAvailability } from '@/lib/schedule/actions';
import type { VenueAvailability } from '@/lib/schedule/types';
import type { VenueFull } from '@/lib/actions/venues';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilityFormProps {
  leagueId: string;
  venues: VenueFull[];
  onSuccess: (slot: VenueAvailability) => void;
  onCancel: () => void;
}

export function AvailabilityForm({ leagueId, venues, onSuccess, onCancel }: AvailabilityFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [maxGames, setMaxGames] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!venueId) {
      setError('Please select a venue');
      return;
    }

    setIsPending(true);
    const result = await saveVenueAvailability(leagueId, venueId, {
      leagueId,
      venueId,
      dayOfWeek,
      startTime,
      endTime,
      isAvailable: true,
      maxGames,
      seasonId: null,
      notes: null,
    } as Omit<VenueAvailability, 'id'>);

    if (!result.success || !result.availability) {
      setError(result.error ?? 'Failed to save slot');
      setIsPending(false);
      return;
    }

    onSuccess(result.availability);
    setIsPending(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-white">Add Availability Slot</h3>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-400 mb-1">Venue</label>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500/50"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Day of Week</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500/50"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Max Games</label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxGames ?? ''}
            onChange={(e) => setMaxGames(e.target.value ? parseInt(e.target.value, 10) : null)}
            placeholder="Unlimited"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || !venueId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rink-500 hover:bg-rink-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Add Slot
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
