'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Shuffle,
  Users,
  Play,
  CheckCircle2,
  Settings,
  Loader2,
  AlertCircle,
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
import { populateDraftPoolFromRegistrations } from '@/lib/actions/draft-pool';
import { startDraft } from '@/lib/actions/draft';

interface DraftDashboardProps {
  leagueId: string;
  leagueName: string;
  seasonId: string;
  seasonName: string;
  existingDraft: { id: string; status: string; name: string } | null;
  teams: { id: string; name: string }[];
  userId: string;
  userTeamId: string | null;
  isAdmin: boolean;
  isCaptain: boolean;
}

type DraftLifecycleState = 'no_draft' | 'pending' | 'active' | 'paused' | 'complete';

export function DraftDashboard({
  leagueId,
  leagueName,
  seasonId,
  seasonName,
  existingDraft,
  teams,
  userId,
  userTeamId,
  isAdmin,
  isCaptain,
}: DraftDashboardProps) {
  const [draftId, setDraftId] = useState<string | null>(existingDraft?.id || null);
  const [draftStatus, setDraftStatus] = useState<DraftLifecycleState>(
    existingDraft ? (existingDraft.status as DraftLifecycleState) : 'no_draft'
  );
  const [isPopulating, setIsPopulating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);

  // Handle draft setup completion
  const handleDraftSetupComplete = (newDraftId: string) => {
    setDraftId(newDraftId);
    setDraftStatus('pending');
    setShowSetupWizard(false);
    toast.success('Draft created successfully! Now populate the player pool.');
  };

  // Handle populating draft pool from registrations
  const handlePopulatePool = async () => {
    if (!draftId) return;
    setIsPopulating(true);

    try {
      const result = await populateDraftPoolFromRegistrations(draftId, leagueId, seasonId);
      if (result.success) {
        toast.success(`Added ${result.data?.addedCount || 0} players to the draft pool`);
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

  // State 1: No draft exists — show setup wizard
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
          <h2 className="text-3xl font-bold text-white mb-3">
            Set Up Your Draft
          </h2>
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

          {/* Team list preview */}
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

  // State 2: Draft is pending — admin can populate pool and start
  if (draftStatus === 'pending' && draftId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {existingDraft?.name || 'Draft'} - Ready to Launch
            </h2>
            <p className="text-neutral-400">
              {leagueName} - {seasonName}
            </p>
          </div>
          <span className="px-3 py-1.5 text-sm font-semibold rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/30">
            Pending
          </span>
        </div>

        {/* Steps to start */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Step 1: Populate Pool */}
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-rink-500/10">
                <Users className="w-5 h-5 text-rink-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Populate Player Pool</h3>
                <p className="text-sm text-neutral-400">
                  Import approved registrations into the draft pool
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={handlePopulatePool}
                disabled={isPopulating}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm',
                  'bg-rink-500/10 text-rink-500 border border-rink-500/30',
                  'hover:bg-rink-500/20 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isPopulating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing Players...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Import from Registrations
                  </>
                )}
              </button>
            )}
          </div>

          {/* Step 2: Start Draft */}
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-green-500/10">
                <Play className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Start the Draft</h3>
                <p className="text-sm text-neutral-400">
                  Begin the live draft when all teams are ready
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
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Draft
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Start Draft Confirmation Dialog */}
        <AlertDialog open={showStartConfirm} onOpenChange={setShowStartConfirm}>
          <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Start Draft?</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-400">
                Once started, the draft will be live for all captains. Make sure all teams are ready and the player pool is populated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="border-white/10 text-neutral-300 hover:bg-neutral-800"
                disabled={isStarting}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowStartConfirm(false);
                  handleStartDraft();
                }}
                disabled={isStarting}
                className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold hover:shadow-lg hover:shadow-rink-500/20"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  'Start Draft'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Team list */}
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
      </div>
    );
  }

  // State 3: Draft is active or paused — show the full DraftRoom
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

  // State 4: Draft is complete — show results
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
              <p className="text-neutral-400">
                {leagueName} - {seasonName}
              </p>
            </div>
          </div>

          <DraftResultsExport
            draftId={draftId}
          />
        </div>

        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            The draft has been completed!
          </h3>
          <p className="text-neutral-400 max-w-md mx-auto">
            All picks have been made. You can export the results using the
            buttons above, or view the full draft board by entering the draft
            room.
          </p>

          <button
            onClick={() => setDraftStatus('active')}
            className={cn(
              'mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm',
              'bg-rink-500/10 text-rink-500 border border-rink-500/30',
              'hover:bg-rink-500/20 transition-colors'
            )}
          >
            <Shuffle className="w-4 h-4" />
            View Draft Room
          </button>
        </div>
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
