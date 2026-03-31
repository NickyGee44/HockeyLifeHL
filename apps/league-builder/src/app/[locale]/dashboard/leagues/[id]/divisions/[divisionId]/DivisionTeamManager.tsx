'use client';

/**
 * Division Team Manager Component
 *
 * Client component for managing teams within a specific division.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Users,
  Plus,
  X,
  Search,
  Loader2,
  Shield,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  assignTeamToDivision,
  bulkAssignTeamsToDivision,
  getDivisionTeams,
  getUnassignedTeams,
  type DivisionWithTeamCount,
} from '@/lib/actions/divisions';
import { buildTeamDetailHref } from '@/lib/dashboard/workspace-routes';

// ==============================================================================
// TYPES
// ==============================================================================

interface Team {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string | null;
  captain?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

interface DivisionTeamManagerProps {
  division: DivisionWithTeamCount;
  leagueId: string;
  locale: string;
  initialTeams: Team[];
  initialUnassignedTeams: Team[];
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export function DivisionTeamManager({
  division,
  leagueId,
  locale: _locale,
  initialTeams,
  initialUnassignedTeams,
}: DivisionTeamManagerProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [unassignedTeams, setUnassignedTeams] = useState<Team[]>(initialUnassignedTeams);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [operationInProgress, setOperationInProgress] = useState(false);

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const [teamsResult, unassignedResult] = await Promise.all([
      getDivisionTeams(division.id),
      getUnassignedTeams(leagueId),
    ]);
    if (teamsResult.success) {
      setTeams(teamsResult.data as Team[]);
    }
    if (unassignedResult.success) {
      setUnassignedTeams(unassignedResult.data as Team[]);
    }
    setIsLoading(false);
    router.refresh();
  }, [division.id, leagueId, router]);

  // Filter teams by search
  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.short_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const filteredUnassignedTeams = unassignedTeams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.short_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Toggle team selection
  const toggleTeamSelection = (teamId: string) => {
    const newSelected = new Set(selectedTeamIds);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedTeamIds(newSelected);
  };

  // Add teams to division
  const handleAddTeams = async () => {
    if (selectedTeamIds.size === 0) return;

    setOperationInProgress(true);
    const result = await bulkAssignTeamsToDivision(
      Array.from(selectedTeamIds),
      division.id,
      leagueId
    );

    if (result.success) {
      setShowAddModal(false);
      setSelectedTeamIds(new Set());
      await refreshData();
    }
    setOperationInProgress(false);
  };

  // Remove team from division
  const handleRemoveTeam = async () => {
    if (!selectedTeam) return;

    setOperationInProgress(true);
    const result = await assignTeamToDivision(selectedTeam.id, null);

    if (result.success) {
      setShowRemoveModal(false);
      setSelectedTeam(null);
      await refreshData();
    }
    setOperationInProgress(false);
  };

  // Open remove confirmation
  const confirmRemoveTeam = (team: Team) => {
    setSelectedTeam(team);
    setShowRemoveModal(true);
  };

  return (
    <>
      {/* Teams Section */}
      <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Section Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-rink-500" />
              <h2 className="text-lg font-semibold text-white">Teams in {division.name}</h2>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-800 text-neutral-300">
                {teams.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search teams..."
                  className="pl-10 w-48 bg-neutral-800 border-neutral-700 text-white"
                />
              </div>

              {/* Add Button */}
              <button
                onClick={() => {
                  setSelectedTeamIds(new Set());
                  setShowAddModal(true);
                }}
                disabled={unassignedTeams.length === 0}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm',
                  'bg-rink-500/10 text-rink-500 border border-rink-500/30',
                  'hover:bg-rink-500/20 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Plus className="w-4 h-4" />
                Add Teams
              </button>
            </div>
          </div>
        </div>

        {/* Teams List */}
        <div className="divide-y divide-white/5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-rink-500" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400">
                {searchQuery
                  ? 'No teams match your search'
                  : 'No teams in this division yet'}
              </p>
              {!searchQuery && unassignedTeams.length > 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 text-rink-500 hover:text-rink-400 font-medium text-sm"
                >
                  Add teams to get started
                </button>
              )}
            </div>
          ) : (
            filteredTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.primary_color || '#22D3EE' }}
                  >
                    {team.short_name?.substring(0, 2).toUpperCase() ||
                      team.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{team.name}</h3>
                    <p className="text-sm text-neutral-500">
                      {team.captain ? `Captain: ${team.captain.full_name}` : 'No captain assigned'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={buildTeamDetailHref({
                      locale: '',
                      teamId: team.id,
                      leagueId,
                    })}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Roster
                  </Link>
                  <button
                    onClick={() => confirmRemoveTeam(team)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Teams Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[550px] bg-neutral-900 border-white/10 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">Add Teams to {division.name}</DialogTitle>
            <DialogDescription>
              Select teams to add to this division.
              {division.max_teams && (
                <span className="block mt-1 text-yellow-500">
                  This division can have a maximum of {division.max_teams} teams.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {/* Selection Info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">
                {selectedTeamIds.size} selected
              </span>
              {selectedTeamIds.size > 0 && (
                <button
                  onClick={() => setSelectedTeamIds(new Set())}
                  className="text-neutral-400 hover:text-white font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Teams List */}
            {filteredUnassignedTeams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400">No unassigned teams available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUnassignedTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => toggleTeamSelection(team.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                      selectedTeamIds.has(team.id)
                        ? 'bg-rink-500/20 border border-rink-500/50'
                        : 'bg-neutral-800/50 border border-transparent hover:bg-neutral-800'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center border transition-colors',
                        selectedTeamIds.has(team.id)
                          ? 'bg-rink-500 border-rink-500 text-black'
                          : 'border-neutral-600'
                      )}
                    >
                      {selectedTeamIds.has(team.id) && (
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: team.primary_color || '#22D3EE' }}
                    >
                      {team.short_name?.substring(0, 2).toUpperCase() ||
                        team.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{team.name}</p>
                      <p className="text-xs text-neutral-500">{team.short_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddModal(false)}
              disabled={operationInProgress}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTeams}
              disabled={operationInProgress || selectedTeamIds.size === 0}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              {operationInProgress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add {selectedTeamIds.size} Team{selectedTeamIds.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Team Confirmation Modal */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent className="sm:max-w-[400px] bg-neutral-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Team from Division</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong className="text-white">{selectedTeam?.name}</strong> from{' '}
              {division.name}? The team will become unassigned.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowRemoveModal(false)}
              disabled={operationInProgress}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveTeam}
              disabled={operationInProgress}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {operationInProgress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Team'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
