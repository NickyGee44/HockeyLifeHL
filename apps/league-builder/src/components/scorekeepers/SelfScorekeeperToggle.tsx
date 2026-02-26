'use client';

import { useState, useTransition } from 'react';
import { Loader2, Users, CheckCircle } from 'lucide-react';
import { updateScorekeeperMode } from '@/lib/actions/league-settings';
import { toast } from 'sonner';

interface SelfScorekeeperToggleProps {
  leagueId: string;
  initialEnabled: boolean;
}

export function SelfScorekeeperToggle({ leagueId, initialEnabled }: SelfScorekeeperToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = !enabled;
    startTransition(async () => {
      const result = await updateScorekeeperMode(leagueId, next);
      if (result.success) {
        setEnabled(next);
        toast.success(next ? 'Self-scorekeeping enabled' : 'Self-scorekeeping disabled');
      } else {
        toast.error(result.error || 'Failed to update setting');
      }
    });
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: enabled ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.06)' }}
          >
            <Users className={`w-5 h-5 ${enabled ? 'text-rink-500' : 'text-neutral-500'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Captain Self-Scorekeeping</h3>
            <p className="text-sm text-neutral-400 max-w-lg">
              When enabled, team captains can start a live scoring session for their own games directly from the player app — no external scorekeeper required. Tokens are auto-generated per game.
            </p>
            {enabled && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rink-400">
                <CheckCircle className="w-3.5 h-3.5" />
                Captains can now score their own games
              </div>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          role="switch"
          aria-checked={enabled}
          className={`relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
            enabled ? 'bg-rink-500' : 'bg-neutral-700'
          }`}
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin text-white mx-auto" />
          ) : (
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          )}
        </button>
      </div>
    </div>
  );
}
