'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Users,
  Hash,
} from 'lucide-react';
import {
  getTeamPreviousSeasons,
  getPreviousSeasonRoster,
  getTeamCurrentSeason,
  importPlayersFromPreviousSeason,
  type PreviousSeasonPlayer,
  type RosterImportConflict,
} from '@/lib/actions/captain';
import { toast } from 'sonner';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
}

interface ImportRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onImportComplete: () => void;
}

export default function ImportRosterModal({
  isOpen,
  onClose,
  teamId,
  onImportComplete,
}: ImportRosterModalProps) {
  const t = useTranslations('captain.roster');

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [previousSeasons, setPreviousSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [rosterPlayers, setRosterPlayers] = useState<PreviousSeasonPlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [loadingRoster, setLoadingRoster] = useState(false);

  const loadData = async () => {
    setLoading(true);

    // Load previous seasons
    const seasonsResult = await getTeamPreviousSeasons(teamId);
    if (seasonsResult.success && seasonsResult.data) {
      setPreviousSeasons(seasonsResult.data);
      if (seasonsResult.data.length > 0) {
        setSelectedSeasonId(seasonsResult.data[0].id);
      }
    }

    // Load current season
    const currentSeasonResult = await getTeamCurrentSeason(teamId);
    if (currentSeasonResult.success && currentSeasonResult.data) {
      setCurrentSeason(currentSeasonResult.data);
    }

    setLoading(false);
  };

  // Load previous seasons when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, teamId]);

  const loadRoster = async (seasonId: string) => {
    setLoadingRoster(true);
    setRosterPlayers([]);
    setSelectedPlayerIds(new Set());

    const result = await getPreviousSeasonRoster(teamId, seasonId);
    if (result.success && result.data) {
      setRosterPlayers(result.data);
      // Select all by default
      setSelectedPlayerIds(new Set(result.data.map((p) => p.player_id)));
    }

    setLoadingRoster(false);
  };

  // Load roster when season is selected
  useEffect(() => {
    if (selectedSeasonId) {
      loadRoster(selectedSeasonId);
    }
  }, [selectedSeasonId, teamId]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedPlayerIds(new Set(rosterPlayers.map((p) => p.player_id)));
  };

  const deselectAll = () => {
    setSelectedPlayerIds(new Set());
  };

  const handleImport = async () => {
    if (!currentSeason || selectedPlayerIds.size === 0) return;

    setImporting(true);

    const result = await importPlayersFromPreviousSeason({
      teamId,
      fromSeasonId: selectedSeasonId,
      toSeasonId: currentSeason.id,
      selectedPlayerIds: Array.from(selectedPlayerIds),
    });

    setImporting(false);

    if (result.success) {
      toast.success(t('importSuccess', { count: result.copiedCount || 0 }));

      if (result.conflicts && result.conflicts.length > 0) {
        const jerseyConflicts = result.conflicts.filter(
          (c) => c.reason === 'jersey_taken'
        );
        if (jerseyConflicts.length > 0) {
          toast.warning(
            t('importJerseyConflict', { count: jerseyConflicts.length })
          );
        }
      }

      onImportComplete();
      onClose();
    } else {
      toast.error(result.error || t('importError'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rink-500/10">
              <Download className="w-5 h-5 text-rink-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('importFromPreviousSeason')}
              </h2>
              <p className="text-sm text-neutral-400">
                {t('importPlayers')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-rink-500 animate-spin" />
            </div>
          ) : previousSeasons.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
                <Users className="w-8 h-8 text-neutral-600" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {t('noSeasonHistory')}
              </h3>
              <p className="text-neutral-400">
                {t('noPreviousSeasonsDescription')}
              </p>
            </div>
          ) : (
            <>
              {/* Season Selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {t('selectSourceSeason')}
                </label>
                <select
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-rink-500 transition-colors"
                >
                  {previousSeasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Players List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-neutral-300">
                    {t('playersToImport')} ({selectedPlayerIds.size} / {rosterPlayers.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-rink-500 hover:text-rink-400"
                    >
                      {t('selectAll')}
                    </button>
                    <span className="text-neutral-600">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-xs text-neutral-400 hover:text-neutral-300"
                    >
                      {t('deselectAll')}
                    </button>
                  </div>
                </div>

                {loadingRoster ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-rink-500 animate-spin" />
                  </div>
                ) : rosterPlayers.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-800/50 rounded-xl">
                    <p className="text-neutral-400">{t('noPlayersToImport')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {rosterPlayers.map((player) => {
                      const isSelected = selectedPlayerIds.has(player.player_id);

                      return (
                        <button
                          key={player.player_id}
                          onClick={() => togglePlayer(player.player_id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                            isSelected
                              ? 'bg-rink-500/10 border border-rink-500/30'
                              : 'bg-neutral-800/50 border border-transparent hover:bg-neutral-800'
                          )}
                        >
                          {/* Checkbox */}
                          <div
                            className={cn(
                              'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
                              isSelected
                                ? 'bg-rink-500 text-white'
                                : 'bg-neutral-700 text-neutral-500'
                            )}
                          >
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>

                          {/* Jersey Number */}
                          {player.jersey_number !== null ? (
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-700 text-white font-bold text-sm flex-shrink-0">
                              {player.jersey_number}
                            </span>
                          ) : (
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 text-neutral-500 text-sm flex-shrink-0">
                              <Hash className="w-4 h-4" />
                            </span>
                          )}

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {player.player_name}
                            </p>
                            {player.position && (
                              <p className="text-xs text-neutral-500">
                                {player.position}
                              </p>
                            )}
                          </div>

                          {/* Status */}
                          {isSelected && (
                            <span className="text-xs text-green-500 flex items-center gap-1 flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              {t('willImport')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Current Season Info */}
              {currentSeason && (
                <div className="bg-neutral-800/50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rink-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-300">
                      {t('importToSeason')}{' '}
                      <span className="font-semibold text-white">
                        {currentSeason.name}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {!currentSeason && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-200">
                      {t('noActiveSeason')}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-medium text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={
              importing ||
              selectedPlayerIds.size === 0 ||
              !currentSeason ||
              previousSeasons.length === 0
            }
            className={cn(
              'px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all',
              importing ||
                selectedPlayerIds.size === 0 ||
                !currentSeason ||
                previousSeasons.length === 0
                ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20'
            )}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('importing')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t('importSelected')} ({selectedPlayerIds.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
