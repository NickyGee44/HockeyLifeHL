'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Calendar, Loader2, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface NewSeasonFormProps {
  leagueId: string;
}

export function NewSeasonForm({ leagueId }: NewSeasonFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    try {
      const registrationType = formData.get('registration_type') as string;
      const seasonData = {
        league_id: leagueId,
        name: formData.get('name') as string,
        status: 'draft' as const,
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string,
        registration_type: registrationType as 'draft' | 'open_registration' | 'captain_invite_only',
        games_per_cycle: parseInt(formData.get('games_per_cycle') as string) || 13,
        max_players_per_team:
          parseInt(formData.get('max_players_per_team') as string) || 18,
        allow_team_selection: formData.get('allow_team_selection') === 'true',
      };

      const { data, error: insertError } = await supabase
        .from('seasons')
        .insert(seasonData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      router.push(`/dashboard/leagues/${leagueId}/seasons/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create season');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Season Name */}
      <div className="bg-neutral-900 border border-gold-500/20 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold-500" />
          Season Information
        </h2>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-2">
            Season Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="e.g., Winter 2026 Season"
            className={cn(
              'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
              'text-white placeholder-neutral-500',
              'focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500'
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-neutral-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              required
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
                'text-white placeholder-neutral-500',
                'focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500'
              )}
            />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-neutral-300 mb-2">
              End Date *
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              required
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
                'text-white placeholder-neutral-500',
                'focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500'
              )}
            />
          </div>
        </div>
      </div>

      {/* Registration Settings */}
      <div className="bg-neutral-900 border border-gold-500/20 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Registration Settings</h2>

        <div>
          <label
            htmlFor="registration_type"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Registration Type *
          </label>
          <select
            id="registration_type"
            name="registration_type"
            required
            defaultValue="open_registration"
            className={cn(
              'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
              'text-white',
              'focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500'
            )}
          >
            <option value="open_registration">Open Registration</option>
            <option value="draft">Draft</option>
            <option value="captain_invite_only">Captain Invite Only</option>
          </select>
          <p className="text-xs text-neutral-500 mt-1">
            Open Registration allows players to sign up directly. Draft assigns players to
            teams. Captain Invite Only requires team captains to invite players.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="max_players_per_team"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Max Players per Team
            </label>
            <input
              type="number"
              id="max_players_per_team"
              name="max_players_per_team"
              defaultValue={18}
              min={5}
              max={50}
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
                'text-white placeholder-neutral-500',
                'focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500'
              )}
            />
          </div>
          <div>
            <label
              htmlFor="games_per_cycle"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Games per Cycle
            </label>
            <input
              type="number"
              id="games_per_cycle"
              name="games_per_cycle"
              defaultValue={13}
              min={1}
              max={50}
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
                'text-white placeholder-neutral-500',
                'focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500'
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allow_team_selection"
            name="allow_team_selection"
            value="true"
            defaultChecked
            className="checkbox-gold"
          />
          <label htmlFor="allow_team_selection" className="text-sm text-neutral-300">
            Allow players to select their preferred team during registration
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className={cn(
            'px-5 py-2.5 rounded-xl font-semibold text-sm',
            'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700',
            'transition-colors'
          )}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
            'bg-gradient-to-r from-gold-500 to-gold-600 text-black',
            'hover:shadow-lg hover:shadow-gold-500/20 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Create Season
            </>
          )}
        </button>
      </div>
    </form>
  );
}
