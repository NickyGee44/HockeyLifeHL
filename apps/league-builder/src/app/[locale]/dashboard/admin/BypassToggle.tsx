'use client';

import { useTransition } from 'react';
import { Zap } from 'lucide-react';
import { toggleBypassGate } from '@/lib/actions/platform-admin';

interface BypassToggleProps {
  orgId: string;
  orgName: string;
  enabled: boolean;
  variant?: 'card' | 'table'; // card = pill with label, table = compact On/Off
}

export function BypassToggle({ orgId, orgName, enabled, variant = 'table' }: BypassToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // Confirm before disabling bypass (turning off is the risky direction)
    if (enabled) {
      const ok = window.confirm(
        `Remove bypass for "${orgName}"?\n\nThis will re-enable the subscription gate. They will lose access to all league management features until they subscribe.`
      );
      if (!ok) return;
    }

    startTransition(async () => {
      await toggleBypassGate(orgId, !enabled);
    });
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 transition-colors cursor-pointer disabled:opacity-50"
      >
        <Zap className="w-3 h-3" /> {isPending ? '…' : 'Bypass On'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 ${
        enabled
          ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
          : 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700'
      }`}
    >
      <Zap className="w-3 h-3" />
      {isPending ? '…' : enabled ? 'On' : 'Off'}
    </button>
  );
}
