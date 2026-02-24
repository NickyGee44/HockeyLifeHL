'use client';

import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateLeagueRatings } from '@/lib/actions/ratings';

interface RecalculateButtonProps {
  leagueId: string;
  seasonId: string;
  disabled?: boolean;
}

export function RecalculateButton({ leagueId, seasonId, disabled }: RecalculateButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={disabled || pending}
      onClick={() => {
        startTransition(async () => {
          await calculateLeagueRatings(leagueId, seasonId);
        });
      }}
      className="bg-rink-500 text-black hover:bg-rink-400"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${pending ? 'animate-spin' : ''}`} />
      {pending ? 'Recalculating…' : 'Recalculate Ratings'}
    </Button>
  );
}
