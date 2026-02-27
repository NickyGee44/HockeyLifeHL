'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { addVenueBlackoutDate } from '@/lib/schedule/actions';
import type { VenueBlackoutDate } from '@/lib/schedule/types';
import type { VenueFull } from '@/lib/actions/venues';

interface BlackoutFormProps {
  leagueId: string;
  venues: VenueFull[];
  onSuccess: (blackout: VenueBlackoutDate) => void;
  onCancel: () => void;
}

export function BlackoutForm({ leagueId, venues, onSuccess, onCancel }: BlackoutFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!venueId) {
      setError('Please select a venue');
      return;
    }
    if (!date) {
      setError('Please select a date');
      return;
    }

    setIsPending(true);
    const result = await addVenueBlackoutDate(leagueId, venueId, {
      blackoutDate: date as unknown as Date,
      reason: reason.trim() || null,
      startTime: null,
      endTime: null,
    } as Partial<VenueBlackoutDate>);

    if (!result.success || !result.blackout) {
      setError(result.error ?? 'Failed to add blackout');
      setIsPending(false);
      return;
    }

    onSuccess(result.blackout);
    setIsPending(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-white">Add Blackout Date</h3>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
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
          <label className="block text-xs font-medium text-neutral-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-rink-500/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-400 mb-1">Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Statutory holiday, building maintenance"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || !venueId || !date}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rink-500 hover:bg-rink-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Add Blackout
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
