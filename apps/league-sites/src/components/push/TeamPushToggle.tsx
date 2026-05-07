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

  return (
    <div className="mb-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-[var(--league-primary)]/15 p-2 text-[var(--league-primary)]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Team push alerts
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {enabled
                ? 'Players can receive reminders and recap alerts for this team.'
                : 'Push sends are paused for this team. Existing subscriptions stay saved.'}
            </p>
            {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
          </div>
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => updateSetting(!enabled)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
          {enabled ? 'Turn off' : 'Turn on'}
        </button>
      </div>
    </div>
  );
}
