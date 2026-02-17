'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Activity, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DivisionHealthDashboard } from './DivisionHealthDashboard';
import { DivisionShuffleTool } from './DivisionShuffleTool';
import {
  getDivisionHealthStats,
  type DivisionHealth,
} from '@/lib/actions/division-shuffle';

// ==============================================================================
// TYPES
// ==============================================================================

interface DivisionBalancePanelProps {
  leagueId: string;
  seasonId: string;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export function DivisionBalancePanel({ leagueId, seasonId }: DivisionBalancePanelProps) {
  const t = useTranslations('divisions.balance');

  const [divisions, setDivisions] = useState<DivisionHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'health' | 'shuffle'>('health');

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getDivisionHealthStats(leagueId, seasonId);
    if (result.success) {
      setDivisions(result.data);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, [leagueId, seasonId]);

  useEffect(() => {
    fetchHealth(); // eslint-disable-line -- data-fetching on mount
  }, [fetchHealth]);

  const handleShuffleComplete = () => {
    fetchHealth();
    setActiveView('health');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-rink-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/[0.04] border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={fetchHealth} variant="outline" className="border-white/10">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (divisions.length < 2) {
    return (
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6 text-center">
        <Activity className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-400">{t('needMoreDivisions')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveView('health')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeView === 'health'
              ? 'bg-rink-500/20 text-rink-500 border border-rink-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          )}
        >
          {t('healthOverview')}
        </button>
        <button
          onClick={() => setActiveView('shuffle')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeView === 'shuffle'
              ? 'bg-rink-500/20 text-rink-500 border border-rink-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          )}
        >
          {t('shuffleTeams')}
        </button>
        <Button
          onClick={fetchHealth}
          variant="ghost"
          size="icon"
          className="ml-auto text-neutral-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      {activeView === 'health' ? (
        <DivisionHealthDashboard divisions={divisions} />
      ) : (
        <DivisionShuffleTool
          leagueId={leagueId}
          divisions={divisions}
          onComplete={handleShuffleComplete}
        />
      )}
    </div>
  );
}
