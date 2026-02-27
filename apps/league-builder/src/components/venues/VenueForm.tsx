'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { VenueFull, VenueInput } from '@/lib/actions/venues';
import { createVenue, updateVenue } from '@/lib/actions/venues';

interface VenueFormProps {
  leagueId: string;
  initialData?: VenueFull;
  onSuccess: (venue: VenueFull) => void;
  onCancel: () => void;
}

export function VenueForm({ leagueId, initialData, onSuccess, onCancel }: VenueFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<VenueInput>({
    name: initialData?.name ?? '',
    address: initialData?.address ?? '',
    city: initialData?.city ?? '',
    stateProvince: initialData?.stateProvince ?? '',
    postalCode: initialData?.postalCode ?? '',
    numberOfRinks: initialData?.numberOfRinks ?? null,
    parkingInfo: initialData?.parkingInfo ?? '',
  });

  const set = (field: keyof VenueInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: field === 'numberOfRinks' ? (val ? parseInt(val, 10) : null) : val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    if (initialData) {
      const result = await updateVenue(initialData.id, form);
      if (!result.success) {
        setError(result.error ?? 'Failed to update venue');
        setIsPending(false);
        return;
      }
      onSuccess({ ...initialData, ...form } as VenueFull);
    } else {
      const result = await createVenue(leagueId, form);
      if (!result.success || !result.venue) {
        setError(result.error ?? 'Failed to create venue');
        setIsPending(false);
        return;
      }
      onSuccess(result.venue);
    }
    setIsPending(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-white">
        {initialData ? 'Edit Venue' : 'Add Venue'}
      </h3>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Name — full width */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Venue Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            required
            placeholder="e.g. Barrie Community Centre"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50 focus:border-rink-500/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-400 mb-1">Street Address</label>
          <input
            type="text"
            value={form.address ?? ''}
            onChange={set('address')}
            placeholder="28 Dunlop St E"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50 focus:border-rink-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">City</label>
          <input
            type="text"
            value={form.city ?? ''}
            onChange={set('city')}
            placeholder="Barrie"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50 focus:border-rink-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Province / State</label>
          <input
            type="text"
            value={form.stateProvince ?? ''}
            onChange={set('stateProvince')}
            placeholder="ON"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50 focus:border-rink-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Postal Code</label>
          <input
            type="text"
            value={form.postalCode ?? ''}
            onChange={set('postalCode')}
            placeholder="L4M 1A4"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50 focus:border-rink-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">Number of Ice Sheets</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.numberOfRinks ?? ''}
            onChange={set('numberOfRinks')}
            placeholder="1"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50 focus:border-rink-500/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-400 mb-1">Parking Notes</label>
          <input
            type="text"
            value={form.parkingInfo ?? ''}
            onChange={set('parkingInfo')}
            placeholder="Free parking in adjacent lot"
            className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-rink-500/50 focus:border-rink-500/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rink-500 hover:bg-rink-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {initialData ? 'Save Changes' : 'Add Venue'}
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
