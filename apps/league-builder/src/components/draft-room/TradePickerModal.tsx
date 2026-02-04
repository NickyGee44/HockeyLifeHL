'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, ArrowRight, RefreshCcw, AlertCircle, Check } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import type { TradePickerModalProps, DraftTeam } from './types';

export function TradePickerModal({
  isOpen,
  onClose,
  draftId,
  teams,
  currentRound,
  totalRounds,
  onTradeComplete,
}: TradePickerModalProps) {
  const [supabase] = useState(() => createClient());
  const [fromTeamId, setFromTeamId] = useState<string>('');
  const [toTeamId, setToTeamId] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<number>(currentRound + 1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const availableRounds = Array.from(
    { length: totalRounds - currentRound },
    (_, i) => currentRound + 1 + i
  );

  const handleSubmit = async () => {
    if (!fromTeamId || !toTeamId || fromTeamId === toTeamId) {
      setError('Please select two different teams');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Note: trade_draft_pick RPC is defined in migrations but not in generated types yet
      const { data, error: rpcError } = await (supabase.rpc as any)('trade_draft_pick', {
        p_draft_id: draftId,
        p_from_team_id: fromTeamId,
        p_to_team_id: toTeamId,
        p_round: selectedRound,
        p_notes: notes || null,
      });

      if (rpcError) throw rpcError;

      const result = (data ?? {}) as { success?: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error || 'Trade failed');

      setSuccess(true);
      setTimeout(() => {
        onTradeComplete();
        onClose();
        // Reset state
        setFromTeamId('');
        setToTeamId('');
        setNotes('');
        setSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Error trading pick:', err);
      setError(err instanceof Error ? err.message : 'Failed to trade pick');
    } finally {
      setIsSubmitting(false);
    }
  };

  const swapTeams = () => {
    const temp = fromTeamId;
    setFromTeamId(toTeamId);
    setToTeamId(temp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rink-500/20">
              <RefreshCcw className="h-5 w-5 text-rink-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Trade Pick</h2>
              <p className="text-sm text-neutral-400">Swap a future draft pick between teams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-white">Trade Complete!</p>
          </div>
        ) : (
          <>
            {/* Error Display */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Trade Form */}
            <div className="space-y-6">
              {/* Round Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Round to Trade
                </label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-rink-500/30 bg-black/50 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rink-500"
                >
                  {availableRounds.map((round) => (
                    <option key={round} value={round}>
                      Round {round}
                    </option>
                  ))}
                </select>
                {availableRounds.length === 0 && (
                  <p className="mt-2 text-sm text-yellow-500">
                    No future rounds available to trade
                  </p>
                )}
              </div>

              {/* Team Selection */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    From Team
                  </label>
                  <select
                    value={fromTeamId}
                    onChange={(e) => setFromTeamId(e.target.value)}
                    className="w-full rounded-xl border border-rink-500/30 bg-black/50 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rink-500"
                  >
                    <option value="">Select team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={swapTeams}
                  disabled={!fromTeamId || !toTeamId}
                  className="mt-6 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-rink-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw className="h-5 w-5" />
                </button>

                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    To Team
                  </label>
                  <select
                    value={toTeamId}
                    onChange={(e) => setToTeamId(e.target.value)}
                    className="w-full rounded-xl border border-rink-500/30 bg-black/50 px-4 py-3 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rink-500"
                  >
                    <option value="">Select team...</option>
                    {teams
                      .filter((t) => t.id !== fromTeamId)
                      .map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Trade Preview */}
              {fromTeamId && toTeamId && (
                <div className="rounded-xl border border-white/10 bg-rink-500/5 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-rink-500">
                    Trade Preview
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <span className="font-medium text-white">
                      {teams.find((t) => t.id === fromTeamId)?.name}
                    </span>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <span className="text-sm">Round {selectedRound}</span>
                      <ArrowRight className="h-4 w-4 text-rink-500" />
                    </div>
                    <span className="font-medium text-white">
                      {teams.find((t) => t.id === toTeamId)?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this trade..."
                  className="w-full rounded-xl border border-rink-500/30 bg-black/50 px-4 py-3 text-white placeholder-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rink-500"
                  rows={2}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-neutral-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !fromTeamId || !toTeamId || availableRounds.length === 0}
                className={cn(
                  'flex items-center gap-2 rounded-lg bg-rink-500 px-6 py-2 font-semibold text-black',
                  'transition-all hover:bg-rink-600 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Confirm Trade
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
