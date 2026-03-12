'use client';

import { useState, useTransition } from 'react';
import { Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateSeasonStatus } from '@/lib/actions/seasons';

interface SeasonStatusTransitionButtonProps {
  seasonId: string;
  currentStatus: string;
}

export function SeasonStatusTransitionButton({
  seasonId,
  currentStatus,
}: SeasonStatusTransitionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!['active', 'playoffs'].includes(currentStatus)) return null;

  const nextStatus = currentStatus === 'active' ? 'playoffs' : 'completed';
  const buttonLabel = currentStatus === 'active' ? 'Switch to Playoffs' : 'Complete Season';
  const buttonClassName =
    currentStatus === 'active'
      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';

  const handleSwitch = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSeasonStatus(seasonId, nextStatus);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleSwitch}
        disabled={isPending}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${buttonClassName}`}
      >
        <Shield className="w-4 h-4" />
        {isPending ? 'Updating…' : buttonLabel}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
