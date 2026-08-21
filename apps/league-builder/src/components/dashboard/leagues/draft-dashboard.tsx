'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Shuffle,
  Users,
  Play,
  CheckCircle2,
  Settings,
  Loader2,
  AlertCircle,
  ClipboardList,
  History,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog';
import { DraftSetupWizard } from '@/components/draft-room/DraftSetupWizard';
import { DraftRoom } from '@/components/draft-room/DraftRoom';
import { DraftResultsExport } from '@/components/draft-room/DraftResultsExport';
import {
  populateDraftPoolFromRegistrations,
  populateDraftPoolFromSeason,
  populateDraftPoolFromHistory,
} from '@/lib/actions/draft-pool';
import { finalizeDraftRosters, startDraft } from '@/lib/actions/draft';
import {
  getDraftDashboardState,
  type DraftDashboardState,
} from '@/lib/draft/status';

interface DraftDashboardProps {
  leagueId: string;
  leagueName: string;
  seasonId: string;
  seasonName: string;
  existingDraft: { id: string; status: string; name: string } | null;
  teams: { id: string; name: string }[];
  /** Past completed/archived seasons available as pool sources */
  pastSeasons: { id: string; name: string; status: string }[];
  userId: string;
  userTeamId: string | null;
  isAdmin: boolean;
  canFinalizeRosters: boolean;
  isCaptain: boolean;
}

type PoolSource = 'registrations' | 'past_season' | 'history';

export function DraftDashboard({
  leagueId,
  leagueName,
  seasonId,
  seasonName,
  existingDraft,
  teams,
  pastSeasons,
  userId,
  userTeamId,
  isAdmin,
  canFinalizeRosters,
  isCaptain,
}: DraftDashboardProps) {
  const t = useTranslations('draft');
  const [draftId, setDraftId] = useState<string | null>(existingDraft?.id || null);
  const [draftStatus, setDraftStatus] = useState<DraftDashboardState>(
    existingDraft ? getDraftDashboardState(existingDraft.status) : 'no_draft'
  );
  const [isPopulating, setIsPopulating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Pool source picker state
  const [poolSourceOpen, setPoolSourceOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<PoolSource>('registrations');
  const [selectedPastSeasonId, setSelectedPastSeasonId] = useState<string>(
    pastSeasons[0]?.id ?? ''
  );

  // Handle draft setup completion
  const handleDraftSetupComplete = (newDraftId: string) => {
    setDraftId(newDraftId);
    setDraftStatus('pending');
    setShowSetupWizard(false);
    toast.success('Draft created! Now populate the player pool below.');
  };

  // Handle populating draft pool from chosen source
  const handlePopulatePool = async () => {
    if (!draftId) return;
    setIsPopulating(true);

    try {
      let result: Awaited<ReturnType<typeof populateDraftPoolFromRegistrations>>;

      if (selectedSource === 'registrations') {
        result = await populateDraftPoolFromRegistrations(draftId, leagueId, seasonId);
      } else if (selectedSource === 'past_season') {
        if (!selectedPastSeasonId) {
          toast.error('Please select a season');
          return;
        }
        result = await populateDraftPoolFromSeason(draftId, leagueId, selectedPastSeasonId);
      } else {
        result = await populateDraftPoolFromHistory(draftId, leagueId);
      }

      if (result.success) {
        const added = result.data?.addedCount ?? 0;
        const skipped = result.data?.skippedCount ?? 0;
        if (added === 0 && skipped > 0) {
          toast.info(`All ${skipped} players are already in the pool`);
        } else if (added === 0) {
          toast.warning('No players found from this source');
        } else {
          toast.success(
            `Added ${added} player${added !== 1 ? 's' : ''} to the draft pool` +
            (skipped > 0 ? ` (${skipped} already in pool)` : '')
          );
        }
        setPoolSourceOpen(false);
      } else {
        toast.error(result.error || 'Failed to populate draft pool');
      }
    } catch {
      toast.error('An error occurred while populating the draft pool');
    } finally {
      setIsPopulating(false);
    }
  };

  // Handle starting the draft
  const handleStartDraft = async () => {
    if (!draftId) return;
    setIsStarting(true);

    try {
      const result = await startDraft(draftId);
      if (result.success) {
        setDraftStatus('active');
        toast.success('Draft started!');
      } else {
        toast.error(result.error || 'Failed to start draft');
      }
    } catch {
      toast.error('An error occurred while starting the draft');
    } finally {
      setIsStarting(false);
    }
  };

  const handleFinalizeRosters = async () => {
    if (!draftId || !canFinalizeRosters || isFinalizing) return;
    setIsFinalizing(true);

    try {
      const result = await finalizeDraftRosters(draftId);
      if (!result.success || !result.data) {
        toast.error(result.error || t('finalizeRostersError'));
        return;
      }

      const { insertedCount, existingCount, totalPicks } = result.data;
      if (insertedCount === 0) {
        toast.success(t('finalizeRostersAlreadyFinalized', { totalPicks }));
      } else {
        toast.success(t('finalizeRostersSuccess', {
          insertedCount,
          existingCount,
          totalPicks,
        }));
      }
    } catch {
      toast.error(t('finalizeRostersError'));
    } finally {
      setIsFinalizing(false);
    }
  };

  // ── State 1: No draft exists ─────────────────────────────────────────────
  if (draftStatus === 'no_draft' || showSetupWizard) {
    if (showSetupWizard) {
      return (
        <DraftSetupWizard
          leagueId={leagueId}
          seasonId={seasonId}
          teams={teams}
          onComplete={handleDraftSetupComplete}
          onCancel={() => setShowSetupWizard(false)}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center rounded-full bg-rink-500/10 p-6 mb-6">
            <Shuffle className="h-12 w-12 text-rink-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Set Up Your Draft</h2>
          <p className="text-neutral-400 max-w-md mx-auto mb-8">
            Configure your draft settings for {seasonName}. Choose between snake
            or linear draft, set the pick timer, and customize options.
          </p>

          <div className="flex items-center justify-center gap-4">
            {isAdmin ? (
              <button
                onClick={() => setShowSetupWizard(true)}
                className={cn(
                  'inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
                )}
              >
                <Settings className="w-5 h-5" />
                Configure Draft
              </button>
            ) : (
              <div className="text-neutral-400">
                Waiting for league admin to set up the draft...
              </div>
            )}
          </div>

          {teams.length > 0 && (
            <div className="mt-12 max-w-md mx-auto">
              <h3 className="text-sm font-medium text-neutral-400 mb-3">
                Teams Participating ({teams.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg"
                  >
                    <Users className="w-4 h-4 text-rink-500" />
                    <span className="text-sm text-white truncate">{team.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── State 2: Draft pending — populate pool and start ─────────────────────
  if (draftStatus === 'pending' && draftId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {existingDraft?.name || 'Draft'} – Ready to Launch
            </h2>
            <p className="text-neutral-400">{leagueName} · {seasonName}</p>
          </div>
          <span className="px-3 py-1.5 text-sm font-semibold rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30">
            Pending
          </span>
        </div>

        {/* Pool population card */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setPoolSourceOpen(!poolSourceOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rink-500/10">
                <Database className="w-5 h-5 text-rink-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white">Populate Player Pool</h3>
                <p className="text-sm text-neutral-400">
                  Choose where to import players from
                </p>
              </div>
            </div>
            {poolSourceOpen ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>

          {/* Expandable source picker */}
          {poolSourceOpen && isAdmin && (
            <div className="border-t border-white/[0.06] px-6 pb-6">
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mt-4 mb-3">
                Import Source
              </p>

              <div className="space-y-2 mb-4">
                {/* Source 1: Current season registrations */}
                <SourceOption
                  icon={ClipboardList}
                  title="Current Season Registrations"
                  description={`Approved registrations for ${seasonName}. Includes self-assessed skill level.`}
                  selected={selectedSource === 'registrations'}
                  onSelect={() => setSelectedSource('registrations')}
                />

                {/* Source 2: Past season roster */}
                {pastSeasons.length > 0 && (
                  <div>
                    <SourceOption
                      icon={History}
                      title="Previous Season Roster"
                      description="Import players who played in a specific past season. Uses their admin ratings."
                      selected={selectedSource === 'past_season'}
                      onSelect={() => setSelectedSource('past_season')}
                    />
                    {selectedSource === 'past_season' && (
                      <div className="mt-2 ml-9">
                        <select
                          value={selectedPastSeasonId}
                          onChange={(e) => setSelectedPastSeasonId(e.target.value)}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-sm',
                            'bg-neutral-800 border border-neutral-700 text-white',
                            'focus:outline-none focus:ring-1 focus:ring-rink-500'
                          )}
                        >
                          {pastSeasons.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Source 3: All-time history */}
                <SourceOption
                  icon={Users}
                  title="All League History"
                  description="Every player who has ever played in this league. Uses most recent admin rating."
                  selected={selectedSource === 'history'}
                  onSelect={() => setSelectedSource('history')}
                />
              </div>

              <button
                onClick={handlePopulatePool}
                disabled={isPopulating || (selectedSource === 'past_season' && !selectedPastSeasonId)}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
                  'bg-rink-500 text-black hover:bg-rink-600 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isPopulating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing Players...</>
                ) : (
                  <><Database className="w-4 h-4" /> Import to Pool</>
                )}
              </button>

              <p className="text-xs text-neutral-500 mt-3 text-center">
                Already-added players are skipped automatically. You can import from multiple sources.
              </p>
            </div>
          )}

          {/* Collapsed "quick import" if already closed */}
          {!poolSourceOpen && isAdmin && (
            <div className="px-6 pb-4">
              <button
                onClick={() => setPoolSourceOpen(true)}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
                  'bg-rink-500/10 text-rink-500 border border-rink-500/30',
                  'hover:bg-rink-500/20 transition-colors'
                )}
              >
                <Database className="w-4 h-4" />
                Choose Import Source
              </button>
            </div>
          )}
        </div>

        {/* Start Draft card */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-green-500/10">
              <Play className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Start the Draft</h3>
              <p className="text-sm text-neutral-400">
                Begin the live draft when all teams are ready and the pool is populated
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowStartConfirm(true)}
              disabled={isStarting}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isStarting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
              ) : (
                <><Play className="w-4 h-4" /> Start Draft</>
              )}
            </button>
          )}
        </div>

        {/* Participating teams */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">
            Participating Teams ({teams.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg"
              >
                <Users className="w-4 h-4 text-rink-500" />
                <span className="text-sm text-white truncate">{team.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start confirmation */}
        <AlertDialog open={showStartConfirm} onOpenChange={setShowStartConfirm}>
          <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Start Draft?</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-400">
                Once started, the draft will be live for all captains. Make sure all teams are ready and the player pool is populated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 text-neutral-300 hover:bg-neutral-800" disabled={isStarting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { setShowStartConfirm(false); handleStartDraft(); }}
                disabled={isStarting}
                className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold hover:shadow-lg hover:shadow-rink-500/20"
              >
                {isStarting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</> : 'Start Draft'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── State 3: Active or paused — full DraftRoom ───────────────────────────
  if ((draftStatus === 'active' || draftStatus === 'paused') && draftId) {
    return (
      <DraftRoom
        draftId={draftId}
        userId={userId}
        userTeamId={userTeamId || undefined}
        isAdmin={isAdmin}
        isCaptain={isCaptain}
      />
    );
  }

  // ── State 4: Complete ────────────────────────────────────────────────────
  if (draftStatus === 'complete' && draftId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Draft Complete</h2>
              <p className="text-neutral-400">{leagueName} · {seasonName}</p>
            </div>
          </div>
          <DraftResultsExport draftId={draftId} />
        </div>

        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">The draft has been completed!</h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            All picks have been made. You can export the results using the buttons above,
            or view the full draft board by entering the draft room.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {canFinalizeRosters && (
              <button
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={isFinalizing}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm',
                  'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                  'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {isFinalizing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('finalizingRosters')}</>
                ) : (
                  <><Users className="w-4 h-4" /> {t('finalizeRosters')}</>
                )}
              </button>
            )}

            <button
              onClick={() => setDraftStatus('active')}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm',
                'bg-rink-500/10 text-rink-500 border border-rink-500/30',
                'hover:bg-rink-500/20 transition-colors'
              )}
            >
              <Shuffle className="w-4 h-4" />
              View Draft Room
            </button>
          </div>
        </div>

        <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
          <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('finalizeRostersTitle')}</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-400">
                {t('finalizeRostersDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="border-white/10 text-neutral-300 hover:bg-neutral-800"
                disabled={isFinalizing}
              >
                {t('cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowFinalizeConfirm(false);
                  void handleFinalizeRosters();
                }}
                disabled={isFinalizing}
                className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold hover:shadow-lg hover:shadow-rink-500/20"
              >
                {isFinalizing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('finalizingRosters')}</>
                ) : t('finalizeRostersConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
        <p className="text-neutral-400">Unable to determine draft state.</p>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SourceOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all',
        'border',
        selected
          ? 'bg-rink-500/10 border-rink-500/40 text-white'
          : 'bg-neutral-800/40 border-neutral-700/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300'
      )}
    >
      <div className={cn('mt-0.5 flex-shrink-0', selected ? 'text-rink-500' : 'text-neutral-500')}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className={cn('text-sm font-medium', selected ? 'text-white' : 'text-neutral-300')}>
          {title}
        </div>
        <div className="text-xs text-neutral-500 mt-0.5">{description}</div>
      </div>
      <div className={cn(
        'ml-auto mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
        selected ? 'border-rink-500 bg-rink-500' : 'border-neutral-600'
      )} />
    </button>
  );
}
