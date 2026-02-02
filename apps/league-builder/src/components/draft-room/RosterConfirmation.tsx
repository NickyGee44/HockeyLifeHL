'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import type { RosterConfirmationProps, DraftPick } from './types';

// Position colors matching brand kit
const POSITION_COLORS: Record<string, string> = {
  G: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  D: 'bg-green-500/20 text-green-400 border-green-500/30',
  C: 'bg-gold-500/20 text-gold-400 border-gold-500/30',
  LW: 'bg-gold-500/20 text-gold-400 border-gold-500/30',
  RW: 'bg-gold-500/20 text-gold-400 border-gold-500/30',
};

const POSITION_ICONS: Record<string, typeof Shield> = {
  G: Shield,
  D: Shield,
  C: Target,
  LW: Zap,
  RW: Zap,
};

export function RosterConfirmation({
  draftId,
  teamId,
  picks,
  onConfirm,
  isConfirmed,
}: RosterConfirmationProps) {
  const [supabase] = useState(() => createClient());
  const [isExpanded, setIsExpanded] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter picks for this team
  const teamPicks = picks.filter((p) => p.team_id === teamId);

  // Group by position
  const byPosition: Record<string, DraftPick[]> = {};
  teamPicks.forEach((pick) => {
    const pos = pick.player_name?.includes('(')
      ? pick.player_name.split('(')[1]?.replace(')', '')
      : 'Unknown';
    if (!byPosition[pos]) byPosition[pos] = [];
    byPosition[pos].push(pick);
  });

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Note: confirm_draft_roster RPC is defined in migrations but not in generated types yet
      const { data, error: rpcError } = await (supabase.rpc as any)('confirm_draft_roster', {
        p_draft_id: draftId,
        p_team_id: teamId,
        p_notes: notes || null,
      });

      if (rpcError) throw rpcError;

      const result = (data ?? {}) as { success?: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to confirm roster');

      onConfirm();
    } catch (err) {
      console.error('Error confirming roster:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm roster');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isConfirmed) {
    return (
      <div className="rounded-xl border-2 border-green-500/30 bg-green-500/10 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-green-400">Roster Confirmed</h3>
            <p className="text-sm text-green-400/70">
              Your roster has been confirmed and is ready for the season.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gold-500/20 bg-neutral-900">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500/20">
            <Users className="h-5 w-5 text-gold-500" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Confirm Your Roster</h3>
            <p className="text-sm text-neutral-400">
              {teamPicks.length} players drafted
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-neutral-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-neutral-400" />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-neutral-800 p-4">
          {/* Error Display */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Roster Preview */}
          <div className="mb-6 space-y-4">
            {Object.entries(byPosition).map(([position, positionPicks]) => {
              const Icon = POSITION_ICONS[position] || Users;
              return (
                <div key={position}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={cn(
                        'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                        POSITION_COLORS[position] || 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {position}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {positionPicks.length} player{positionPicks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {positionPicks.map((pick) => (
                      <div
                        key={pick.id}
                        className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-white">
                          {pick.player_name}
                        </span>
                        <span className="text-xs text-neutral-500">
                          Rd {pick.round}, #{pick.pick_number}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-400">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any concerns or issues with your roster..."
              className="w-full rounded-xl border border-gold-500/30 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gold-500"
              rows={2}
            />
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all',
              'bg-gold-500 text-black hover:bg-gold-600 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Confirm Roster
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-neutral-500">
            By confirming, you acknowledge that your roster is complete and ready for the season.
          </p>
        </div>
      )}
    </div>
  );
}
