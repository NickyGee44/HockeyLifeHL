'use client';

import { useState, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  getLeagueReferees,
  type LeagueReferee,
} from '@/lib/actions/referee-management';
import { deleteStaffMember } from '@/lib/actions/staff';
import { sendAvailabilityRequest } from '@/lib/actions/staffing-availability';
import { RefereesList } from './referees-list';
import { AssignRefereeModal } from './assign-referee-modal';
import { AutoAssignRefereesModal } from './auto-assign-referees-modal';
import { EditRefereeCompensationModal } from './edit-referee-compensation-modal';
import { RefereePayrollReport } from './referee-payroll-report';
import {
  Calendar,
  Trash2,
  Loader2,
  Info,
  Wand2,
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

interface GameForAssignment {
  id: string;
  scheduled_at: string;
  status: string;
  location: string | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
}

interface RefereeManagementClientProps {
  leagueId: string;
  initialReferees: LeagueReferee[];
  games: GameForAssignment[];
  seasons: Array<{ id: string; name: string }>;
}

export function RefereeManagementClient({
  leagueId,
  initialReferees,
  games,
  seasons,
}: RefereeManagementClientProps) {
  const [isPending, startTransition] = useTransition();
  const [referees, setReferees] = useState<LeagueReferee[]>(initialReferees);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [payrollRefreshNonce, setPayrollRefreshNonce] = useState(0);

  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [assignForReferee, setAssignForReferee] = useState<LeagueReferee | null>(null);
  const [editCompensationForReferee, setEditCompensationForReferee] = useState<LeagueReferee | null>(null);
  const [removeReferee, setRemoveReferee] = useState<LeagueReferee | null>(null);
  const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false);

  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  // Refresh referees
  const refreshReferees = useCallback(() => {
    startTransition(async () => {
      const result = await getLeagueReferees(leagueId);
      if (result.success && result.data) {
        setReferees(result.data.referees);
        setPayrollRefreshNonce((current) => current + 1);
      }
    });
  }, [leagueId]);

  // Selection handlers
  const handleSelectReferee = useCallback((id: string, selected: boolean) => {
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
    if (selectedIds.size === referees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(referees.map((r) => r.id)));
    }
  }, [referees, selectedIds.size]);

  // Remove referee (deletes from league_staff)
  const handleRemove = async (referee: LeagueReferee) => {
    startTransition(async () => {
      const result = await deleteStaffMember(referee.id);
      if (result.success) {
        setReferees((prev) => prev.filter((r) => r.id !== referee.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(referee.id);
          return next;
        });
      }
      setRemoveReferee(null);
    });
  };

  // Bulk remove
  const handleBulkRemove = async () => {
    startTransition(async () => {
      for (const id of selectedIds) {
        await deleteStaffMember(id);
      }
      refreshReferees();
      setSelectedIds(new Set());
      setShowBulkRemoveConfirm(false);
    });
  };

  const handleAssignGames = (referee: LeagueReferee) => {
    setAssignForReferee(referee);
    setShowAssignModal(true);
  };

  const handleEditCompensation = (referee: LeagueReferee) => {
    setEditCompensationForReferee(referee);
    setShowCompensationModal(true);
  };

  const handleRequestAvailability = (referee: LeagueReferee) => {
    if (!referee.league_referee_id) {
      toast.error('Add an email address for this referee in the staff directory first.');
      return;
    }

    startTransition(async () => {
      const result = await sendAvailabilityRequest({
        leagueId,
        targetType: 'referee',
        targetId: referee.league_referee_id!,
        locale,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to send availability request.');
        return;
      }

      toast.success(`Availability request sent to ${referee.email || referee.name}.`);
    });
  };

  const handleEdit = (_referee: LeagueReferee) => {
    // Navigate to staff settings to edit — referees are edited via the staff management page
    window.location.href = `/${locale}/dashboard/leagues/${leagueId}/staff`;
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-neutral-300">
          <p className="font-medium text-blue-400 mb-1">Referee Roster</p>
          <p className="text-neutral-400">
            Referees are managed via the Staff directory. Staff members with a &quot;Referee&quot; role title appear here,
            can submit weekly availability, and can then be auto-assigned to games as referees or linesmen.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setAssignForReferee(null);
            setShowAssignModal(true);
          }}
          className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Assign to Games
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowAutoAssignModal(true)}
          className="border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Auto-Assign
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          asChild
          className="border-rink-500/30 text-rink-500 hover:bg-rink-500/10"
        >
          <a href={`/${locale}/dashboard/leagues/${leagueId}/staff`}>
            Manage Staff Directory
          </a>
        </Button>
      </div>

      {/* Bulk actions for selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg border border-white/10">
          <span className="text-sm text-neutral-300">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkRemoveConfirm(true)}
            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            className="border-white/10 text-neutral-400 hover:bg-neutral-700"
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Referees list */}
      <RefereesList
        referees={referees}
        selectedIds={selectedIds}
        onSelectReferee={handleSelectReferee}
        onSelectAll={handleSelectAll}
        onEdit={handleEdit}
        onEditCompensation={handleEditCompensation}
        onRemove={setRemoveReferee}
        onAssignGames={handleAssignGames}
        onRequestAvailability={handleRequestAvailability}
        onRefresh={refreshReferees}
        isLoading={isPending}
      />

      <RefereePayrollReport
        leagueId={leagueId}
        seasons={seasons}
        refreshNonce={payrollRefreshNonce}
      />

      {/* Assign modal */}
      <AssignRefereeModal
        leagueId={leagueId}
        referees={referees}
        selectedReferee={assignForReferee || undefined}
        games={games}
        seasons={seasons}
        open={showAssignModal}
        onOpenChange={(open) => {
          setShowAssignModal(open);
          if (!open) setAssignForReferee(null);
        }}
        onSuccess={refreshReferees}
      />

      <AutoAssignRefereesModal
        leagueId={leagueId}
        seasons={seasons}
        open={showAutoAssignModal}
        onOpenChange={setShowAutoAssignModal}
        onSuccess={refreshReferees}
      />

      <EditRefereeCompensationModal
        leagueId={leagueId}
        referee={editCompensationForReferee}
        open={showCompensationModal}
        onOpenChange={(open) => {
          setShowCompensationModal(open);
          if (!open) {
            setEditCompensationForReferee(null);
          }
        }}
        onSuccess={refreshReferees}
      />

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!removeReferee} onOpenChange={(open) => !open && setRemoveReferee(null)}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Referee</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Are you sure you want to remove {removeReferee?.name} from the referee roster?
              This will remove them from the staff directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-neutral-300 hover:bg-neutral-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeReferee && handleRemove(removeReferee)}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk remove confirmation */}
      <AlertDialog open={showBulkRemoveConfirm} onOpenChange={setShowBulkRemoveConfirm}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedIds.size} Referees</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              This will remove {selectedIds.size} referee{selectedIds.size !== 1 ? 's' : ''} from the staff directory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-neutral-300 hover:bg-neutral-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRemove}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
