'use client';

import { useUser } from '@/hooks/useUser';
import { QuickActions } from '@/components/dashboard/QuickActions';

interface PlayerQuickActionsProps {
  playerId: string;
  leagueSlug: string;
}

export function PlayerQuickActions({ playerId, leagueSlug }: PlayerQuickActionsProps) {
  const { user } = useUser();

  if (!user || user.id !== playerId) {
    return null;
  }

  return (
    <div className="glass-card mb-6 rounded-[24px] p-3">
      <QuickActions leagueSlug={leagueSlug} />
    </div>
  );
}
