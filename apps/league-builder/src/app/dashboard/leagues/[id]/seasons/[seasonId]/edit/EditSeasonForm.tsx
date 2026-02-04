'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Calendar, Loader2, Save, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Season {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_type: string | null;
  games_per_cycle: number | null;
  max_players_per_team: number | null;
  allow_team_selection: boolean | null;
}

interface EditSeasonFormProps {
  leagueId: string;
  season: Season;
}

export function EditSeasonForm({ leagueId, season }: EditSeasonFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    try {
      const registrationType = formData.get('registration_type') as string;
      const status = formData.get('status') as string;
      const seasonData = {
        name: formData.get('name') as string,
        status: status as 'draft' | 'active' | 'playoffs' | 'completed',
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string,
        registration_type: registrationType as 'draft' | 'open_registration' | 'captain_invite_only',
        games_per_cycle: parseInt(formData.get('games_per_cycle') as string) || 13,
        max_players_per_team:
          parseInt(formData.get('max_players_per_team') as string) || 18,
        allow_team_selection: formData.get('allow_team_selection') === 'true',
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('seasons')
        .update(seasonData)
        .eq('id', season.id);

      if (updateError) {
        throw updateError;
      }

      router.push(`/dashboard/leagues/${leagueId}/seasons/${season.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update season');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: deleteError } = await supabase
        .from('seasons')
        .delete()
        .eq('id', season.id);

      if (deleteError) {
        throw deleteError;
      }

      router.push(`/dashboard/leagues/${leagueId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete season');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Season Name & Status */}
      <div className="bg-neutral-900 border border-gold-500/20 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold-500" />
          Season Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-2">
              Season Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={season.name}
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
                'text-white placeholder-neutral-500',
                'focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500'
              )}
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-neutral-300 mb-2">
              Status *
            </label>
            <select
              id="status"
              name="status"
              required
              defaultValue={season.status || 'draft'}
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700',
                'text-white',
                'focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500'
              )}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="playoffs">Playoffs</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="start_date"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              required
              defaultValue={season.start_date?.split('T')[0] || ''}
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
              defaultValue={season.end_date?.split('T')[0] || ''}
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
            defaultValue={season.registration_type || 'open_registration'}
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
              defaultValue={season.max_players_per_team || 18}
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
              defaultValue={season.games_per_cycle || 13}
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
            defaultChecked={season.allow_team_selection ?? true}
            className="checkbox-gold"
          />
          <label htmlFor="allow_team_selection" className="text-sm text-neutral-300">
            Allow players to select their preferred team during registration
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        <p className="text-sm text-neutral-400">
          Deleting a season will remove all associated games, standings, and registrations. This
          action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
              'bg-red-500/10 text-red-400 border border-red-500/30',
              'hover:bg-red-500/20 transition-colors'
            )}
          >
            <Trash2 className="w-4 h-4" />
            Delete Season
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                'bg-red-500 text-white',
                'hover:bg-red-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirm Delete
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
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
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
