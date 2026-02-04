'use client';

/**
 * Standings Page Client Component
 *
 * Client-side interactivity for standings management.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Download, RefreshCw, Layers } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';
import { StandingsTable, DivisionTabs, PointsConfigModal } from '@/components/standings';
import {
  getStandings,
  getStandingsByDivision,
  updateStandingsConfig,
  refreshStandings,
  exportStandingsCSV,
} from '@/lib/standings/actions';
import type { TeamStanding, StandingsConfig } from '@/lib/standings/types';

// ============================================================================
// TYPES
// ============================================================================

interface StandingsPageClientProps {
  seasonId: string;
  leagueId: string;
  config: StandingsConfig | null;
  divisions: { id: string; name: string }[];
  hasDivisions: boolean;
}

type ViewMode = 'overall' | 'division';

// ============================================================================
// COMPONENT
// ============================================================================

export function StandingsPageClient({
  seasonId,
  leagueId,
  config,
  divisions,
  hasDivisions,
}: StandingsPageClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('overall');
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [divisionStandings, setDivisionStandings] = useState<
    { divisionId: string | null; divisionName: string; teams: TeamStanding[] }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Load standings
  const loadStandings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overallData, divisionData] = await Promise.all([
        getStandings(seasonId),
        hasDivisions ? getStandingsByDivision(seasonId, leagueId) : Promise.resolve([]),
      ]);
      setStandings(overallData);
      setDivisionStandings(divisionData);
    } catch (error) {
      console.error('Error loading standings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [seasonId, leagueId, hasDivisions]);

  useEffect(() => {
    loadStandings();
  }, [loadStandings]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshStandings();
      await loadStandings();
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const csv = await exportStandingsCSV(seasonId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `standings-${seasonId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting standings:', error);
    }
  };

  // Handle config save
  const handleSaveConfig = async (updates: Partial<StandingsConfig>) => {
    const result = await updateStandingsConfig(seasonId, leagueId, updates);
    if (result.success) {
      await loadStandings();
      router.refresh();
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-neutral-800 rounded-lg" />
        <div className="h-96 bg-neutral-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('overall')}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              viewMode === 'overall'
                ? 'bg-rink-500/10 text-rink-500'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            )}
          >
            Overall
          </button>
          {hasDivisions && (
            <button
              onClick={() => setViewMode('division')}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                viewMode === 'division'
                  ? 'bg-rink-500/10 text-rink-500'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              )}
            >
              <Layers className="w-4 h-4" />
              By Division
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Standings Content */}
      {viewMode === 'overall' ? (
        <StandingsTable
          standings={standings}
          playoffSpots={config?.playoffTeamsTotal ?? 8}
          showHomeAway={config?.showHomeAwaySplit ?? false}
        />
      ) : (
        <DivisionTabs
          divisions={divisionStandings}
          playoffSpotsPerDivision={config?.playoffTeamsPerDivision ?? 4}
          showHomeAway={config?.showHomeAwaySplit ?? false}
        />
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <PointsConfigModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </div>
  );
}
