'use client';

import { useState, useCallback, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  getLeagueScorekepers,
  removeScorekeeperFromLeague,
  exportScorekepers,
  type LeagueScorekeeper,
} from '@/lib/actions/scorekeeper-management';
import { sendAvailabilityRequest } from '@/lib/actions/staffing-availability';
import { ScorekeepersList } from './scorekeepers-list';
import { AddScorekeeperModal } from './add-scorekeeper-modal';
import { EditScorekeeperModal } from './edit-scorekeeper-modal';
import { ImportScorekepersModal } from './import-scorekeepers-modal';
import { AutoAssignModal } from './auto-assign-modal';
import { BulkAssignGamesModal } from './bulk-assign-games-modal';
import {
  UserPlus,
  Upload,
  Download,
  Wand2,
  Calendar,
  CalendarDays,
  Trash2,
  Loader2,
} from 'lucide-react';
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

interface ScorekeeperManagementClientProps {
  leagueId: string;
  initialScorekepers: LeagueScorekeeper[];
  seasons: Array<{ id: string; name: string }>;
}

export function ScorekeeperManagementClient({
  leagueId,
  initialScorekepers,
  seasons,
}: ScorekeeperManagementClientProps) {
  const t = useTranslations('scorekeepers.management');
  const [isPending, startTransition] = useTransition();
  const [scorekeepers, setScorekepers] = useState<LeagueScorekeeper[]>(initialScorekepers);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editScorekeeper, setEditScorekeeper] = useState<LeagueScorekeeper | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [assignForScorekeeper, setAssignForScorekeeper] = useState<LeagueScorekeeper | null>(null);
  const [removeScorekeeper, setRemoveScorekeeper] = useState<LeagueScorekeeper | null>(null);
  const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false);

  // Refresh scorekeepers
  const refreshScorekepers = useCallback(() => {
    startTransition(async () => {
      const result = await getLeagueScorekepers(leagueId);
      if (result.success) {
        setScorekepers(result.data.scorekeepers);
      }
    });
  }, [leagueId]);

  // Selection handlers
  const handleSelectScorekeeper = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === scorekeepers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scorekeepers.map((sk) => sk.id)));
    }
  }, [scorekeepers, selectedIds.size]);

  // Remove scorekeeper
  const handleRemove = async (scorekeeper: LeagueScorekeeper) => {
    startTransition(async () => {
      const result = await removeScorekeeperFromLeague({
        id: scorekeeper.id,
        leagueId,
      });

      if (result.success) {
        setScorekepers((prev) => prev.filter((sk) => sk.id !== scorekeeper.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(scorekeeper.id);
          return next;
        });
      }

      setRemoveScorekeeper(null);
    });
  };

  // Bulk remove
  const handleBulkRemove = async () => {
    startTransition(async () => {
      for (const id of selectedIds) {
        await removeScorekeeperFromLeague({ id, leagueId });
      }
      refreshScorekepers();
      setSelectedIds(new Set());
      setShowBulkRemoveConfirm(false);
    });
  };

  // Export scorekeepers
  const handleExport = async () => {
    const result = await exportScorekepers(leagueId);
    if (result.success) {
      const csv = [
        ['Name', 'Email', 'Status', 'Hourly Rate', 'Total Assignments', 'Completed', 'Hired Date'],
        ...result.data.map((sk) => [
          sk.name,
          sk.email,
          sk.status,
          sk.hourlyRate?.toString() || '',
          sk.totalAssignments.toString(),
          sk.completedAssignments.toString(),
          sk.hiredDate || '',
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scorekeepers.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Open assign games modal for a specific scorekeeper
  const handleAssignGames = (scorekeeper: LeagueScorekeeper) => {
    setAssignForScorekeeper(scorekeeper);
    setShowBulkAssignModal(true);
  };

  const handleRequestAvailability = (scorekeeper: LeagueScorekeeper) => {
    startTransition(async () => {
      const result = await sendAvailabilityRequest({
        leagueId,
        targetType: 'scorekeeper',
        targetId: scorekeeper.id,
        locale,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to send availability request.');
        return;
      }

      toast.success(`Availability request sent to ${scorekeeper.display_name || scorekeeper.email || 'scorekeeper'}.`);
    });
  };

  // Edit success handler
  const handleEditSuccess = (updated: LeagueScorekeeper) => {
    setScorekepers((prev) =>
      prev.map((sk) => (sk.id === updated.id ? updated : sk))
    );
    setEditScorekeeper(null);
  };

  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => setShowAddModal(true)}
          className={cn(
            'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
            'hover:shadow-lg hover:shadow-rink-500/20'
          )}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t('addScorekeeper')}
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowImportModal(true)}
          className="border-white/10 text-neutral-300 hover:bg-neutral-800"
        >
          <Upload className="w-4 h-4 mr-2" />
          {t('importCsv')}
        </Button>

        <Button
          variant="outline"
          onClick={handleExport}
          className="border-white/10 text-neutral-300 hover:bg-neutral-800"
        >
          <Download className="w-4 h-4 mr-2" />
          {t('export')}
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          asChild
          className="border-rink-500/30 text-rink-500 hover:bg-rink-500/10"
        >
          <Link href={`/${locale}/dashboard/leagues/${leagueId}/scorekeepers/schedule`}>
            <CalendarDays className="w-4 h-4 mr-2" />
            {t('viewSchedule')}
          </Link>
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setAssignForScorekeeper(null);
            setShowBulkAssignModal(true);
          }}
          className="border-rink-500/30 text-rink-500 hover:bg-rink-500/10"
        >
          <Calendar className="w-4 h-4 mr-2" />
          {t('bulkAssign')}
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowAutoAssignModal(true)}
          className="border-rink-500/30 text-rink-500 hover:bg-rink-500/10"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          {t('autoAssign')}
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">
        Weekly availability now powers the scheduler. Send each scorekeeper the availability request once, then use auto-assign to fill upcoming games from the submitted schedule.
      </div>

      {/* Bulk actions for selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border border-white/10">
          <span className="text-sm text-neutral-300">
            {t('selected', { count: selectedIds.size })}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkRemoveConfirm(true)}
            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {t('removeSelected')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            className="border-white/10 text-neutral-400 hover:bg-neutral-700"
          >
            {t('clearSelection')}
          </Button>
        </div>
      )}

      {/* Scorekeepers list */}
      <ScorekeepersList
        scorekeepers={scorekeepers}
        selectedIds={selectedIds}
        onSelectScorekeeper={handleSelectScorekeeper}
        onSelectAll={handleSelectAll}
        onEdit={setEditScorekeeper}
        onRemove={setRemoveScorekeeper}
        onAssignGames={handleAssignGames}
        onRequestAvailability={handleRequestAvailability}
        onRefresh={refreshScorekepers}
        isLoading={isPending}
      />

      {/* Modals */}
      <AddScorekeeperModal
        leagueId={leagueId}
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={refreshScorekepers}
      />

      {editScorekeeper && (
        <EditScorekeeperModal
          scorekeeper={editScorekeeper}
          leagueId={leagueId}
          open={!!editScorekeeper}
          onOpenChange={(open) => !open && setEditScorekeeper(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      <ImportScorekepersModal
        leagueId={leagueId}
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={refreshScorekepers}
      />

      <AutoAssignModal
        leagueId={leagueId}
        seasons={seasons}
        open={showAutoAssignModal}
        onOpenChange={setShowAutoAssignModal}
        onSuccess={refreshScorekepers}
      />

      <BulkAssignGamesModal
        leagueId={leagueId}
        scorekeepers={scorekeepers}
        selectedScorekeeper={assignForScorekeeper || undefined}
        seasons={seasons}
        open={showBulkAssignModal}
        onOpenChange={(open) => {
          setShowBulkAssignModal(open);
          if (!open) setAssignForScorekeeper(null);
        }}
        onSuccess={refreshScorekepers}
      />

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removeScorekeeper} onOpenChange={(open) => !open && setRemoveScorekeeper(null)}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeScorekeeper')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('removeConfirm', { name: removeScorekeeper?.display_name || removeScorekeeper?.profile?.full_name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-neutral-300 hover:bg-neutral-800">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeScorekeeper && handleRemove(removeScorekeeper)}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk remove confirmation dialog */}
      <AlertDialog open={showBulkRemoveConfirm} onOpenChange={setShowBulkRemoveConfirm}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeCount', { count: selectedIds.size })}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('bulkRemoveConfirm', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-neutral-300 hover:bg-neutral-800">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRemove}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('removeAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
