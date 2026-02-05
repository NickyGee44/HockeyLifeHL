'use client';

/**
 * Team Assignment Modal Component
 *
 * Modal for assigning teams to divisions (single or bulk).
 */

import { useState, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { Loader2, Users, Check, X, Search } from 'lucide-react';
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
  bulkAssignTeamsToDivision,
  getUnassignedTeams,
  getDivisionTeams,
  type DivisionWithTeamCount,
} from '@/lib/actions/divisions';

// ==============================================================================
// TYPES
// ==============================================================================

interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string;
}

interface TeamAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division: DivisionWithTeamCount | null;
  leagueId: string;
  onSuccess?: () => void;
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export function TeamAssignmentModal({
  open,
  onOpenChange,
  division,
  leagueId,
  onSuccess,
}: TeamAssignmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [assignedTeams, setAssignedTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());

  // Load teams when modal opens
  useEffect(() => {
    if (open && division) {
      setIsLoading(true);
      setError(null);
      setSearchQuery('');
      setSelectedTeamIds(new Set());

      Promise.all([
        getUnassignedTeams(leagueId),
        getDivisionTeams(division.id),
      ]).then(([unassignedResult, divisionResult]) => {
        if (unassignedResult.success) {
          setAvailableTeams(unassignedResult.data as Team[]);
        }
        if (divisionResult.success) {
          setAssignedTeams(divisionResult.data as Team[]);
        }
        setIsLoading(false);
      });
    }
  }, [open, division, leagueId]);

  const filteredAvailableTeams = availableTeams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTeamSelection = (teamId: string) => {
    const newSelected = new Set(selectedTeamIds);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedTeamIds(newSelected);
  };

  const selectAll = () => {
    setSelectedTeamIds(new Set(filteredAvailableTeams.map((t) => t.id)));
  };

  const clearSelection = () => {
    setSelectedTeamIds(new Set());
  };

  const handleAssign = async () => {
    if (!division || selectedTeamIds.size === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await bulkAssignTeamsToDivision(
        Array.from(selectedTeamIds),
        division.id,
        leagueId
      );

      if (!result.success) {
        setError(result.error);
        setIsSaving(false);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError('An unexpected error occurred');
      setIsSaving(false);
    }
  };

  if (!division) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-neutral-900 border-white/10 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Assign Teams to {division.name}</DialogTitle>
          <DialogDescription>
            Select teams to add to this division. Teams already in other divisions must be
            moved from their current division first.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="pl-10 bg-neutral-800 border-neutral-700 text-white"
            />
          </div>

          {/* Selection Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">
              {selectedTeamIds.size} team{selectedTeamIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-rink-500 hover:text-rink-400 font-medium"
                disabled={filteredAvailableTeams.length === 0}
              >
                Select All
              </button>
              {selectedTeamIds.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-neutral-400 hover:text-white font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Teams List */}
          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-1 pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-rink-500" />
              </div>
            ) : filteredAvailableTeams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400">
                  {searchQuery
                    ? 'No teams match your search'
                    : 'No unassigned teams available'}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-neutral-500 mt-1">
                    All teams are already assigned to divisions.
                  </p>
                )}
              </div>
            ) : (
              filteredAvailableTeams.map((team) => (
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
                  {/* Selection Indicator */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-md flex items-center justify-center border transition-colors',
                      selectedTeamIds.has(team.id)
                        ? 'bg-rink-500 border-rink-500 text-black'
                        : 'border-neutral-600'
                    )}
                  >
                    {selectedTeamIds.has(team.id) && <Check className="w-3 h-3" />}
                  </div>

                  {/* Team Info */}
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
              ))
            )}
          </div>

          {/* Currently Assigned Teams */}
          {assignedTeams.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-neutral-300 mb-2">
                Currently in {division.name} ({assignedTeams.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {assignedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 text-sm"
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: team.primary_color || '#22D3EE' }}
                    >
                      {team.short_name?.substring(0, 2).toUpperCase() ||
                        team.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-neutral-300">{team.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-white/10 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-neutral-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isSaving || selectedTeamIds.size === 0}
            className={cn(
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Assign {selectedTeamIds.size} Team{selectedTeamIds.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
