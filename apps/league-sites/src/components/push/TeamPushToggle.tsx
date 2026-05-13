'use client';

import { useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

interface TeamPushToggleProps {
  teamId: string;
  initialEnabled: boolean;
}

export function TeamPushToggle({ teamId, initialEnabled }: TeamPushToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateSetting(nextEnabled: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/push/team-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, enabled: nextEnabled }),
      });

      if (!response.ok) {
        throw new Error('Unable to update alerts.');
      }

      setEnabled(nextEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update alerts.');
    } finally {
      setIsSaving(false);
    }
  }

  const Icon = enabled ? Bell : BellOff;
  const statusLabel = enabled ? 'Enabled' : 'Disabled';
  const actionLabel = enabled ? 'Tap to turn off' : 'Tap to turn on';

  return (
    <button
      type="button"
      disabled={isSaving}
      onClick={() => updateSetting(!enabled)}
      aria-pressed={enabled}
      aria-label={`Team push alerts ${statusLabel.toLowerCase()}. ${actionLabel}.`}
      className="relative z-40 min-h-[108px] rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-[var(--color-text-primary)] shadow-[0_28px_70px_-46px_rgba(0,0,0,0.88)] transition-all backdrop-blur-xl hover:border-[var(--league-primary)]/35 hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-70"
    >
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-[var(--league-primary)]">
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
        </div>
        <p className="text-sm font-black uppercase tracking-[0.12em] sm:text-base">
          Push Alerts
        </p>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
            enabled
              ? 'border-emerald-400/30 bg-emerald-400/12 text-emerald-300'
              : 'border-rose-400/30 bg-rose-400/12 text-rose-300'
          }`}
        >
          {statusLabel}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {isSaving ? 'Saving' : actionLabel}
        </span>
        {error ? <span className="text-[10px] font-semibold text-red-400">{error}</span> : null}
      </div>
    </button>
  );
}
