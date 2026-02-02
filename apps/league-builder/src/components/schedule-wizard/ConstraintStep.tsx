'use client';

/**
 * Constraint Step
 *
 * Second step for adding schedule constraints (blackout dates, preferences).
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Plus, Trash2, Calendar, MapPin, Users, AlertTriangle } from 'lucide-react';
import type { Team, Venue, ScheduleConstraint, ConstraintType } from '@/lib/schedule/types';
import { getScheduleConstraints, addScheduleConstraint, deleteScheduleConstraint } from '@/lib/schedule/actions';

// ============================================================================
// TYPES
// ============================================================================

interface ConstraintStepProps {
  seasonId: string;
  leagueId: string;
  teams: Team[];
  venues: Venue[];
  constraints: string[];
  setConstraints: React.Dispatch<React.SetStateAction<string[]>>;
}

interface NewConstraint {
  constraintType: ConstraintType;
  teamId: string;
  venueId: string;
  startDate: string;
  endDate: string;
  dayOfWeek: string;
  isHardConstraint: boolean;
  notes: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONSTRAINT_TYPES: { value: ConstraintType; label: string; icon: React.ReactNode }[] = [
  { value: 'team_blackout', label: 'Team Blackout', icon: <Users className="w-4 h-4" /> },
  { value: 'venue_blackout', label: 'Venue Blackout', icon: <MapPin className="w-4 h-4" /> },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================================================
// COMPONENT
// ============================================================================

export function ConstraintStep({
  seasonId,
  leagueId,
  teams,
  venues,
  constraints,
  setConstraints,
}: ConstraintStepProps) {
  const [existingConstraints, setExistingConstraints] = useState<ScheduleConstraint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConstraint, setNewConstraint] = useState<NewConstraint>({
    constraintType: 'team_blackout',
    teamId: '',
    venueId: '',
    startDate: '',
    endDate: '',
    dayOfWeek: '',
    isHardConstraint: false,
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load existing constraints
  useEffect(() => {
    const loadConstraints = async () => {
      const data = await getScheduleConstraints(seasonId);
      setExistingConstraints(data);
      setConstraints(data.map((c) => c.id));
      setIsLoading(false);
    };
    loadConstraints();
  }, [seasonId, setConstraints]);

  // Add constraint
  const handleAddConstraint = useCallback(async () => {
    if (!newConstraint.constraintType) return;

    setIsSaving(true);
    try {
      const result = await addScheduleConstraint(seasonId, leagueId, {
        constraintType: newConstraint.constraintType,
        teamId: newConstraint.teamId || null,
        venueId: newConstraint.venueId || null,
        startDate: newConstraint.startDate ? new Date(newConstraint.startDate) : null,
        endDate: newConstraint.endDate ? new Date(newConstraint.endDate) : null,
        dayOfWeek: newConstraint.dayOfWeek ? parseInt(newConstraint.dayOfWeek) : null,
        isHardConstraint: newConstraint.isHardConstraint,
        notes: newConstraint.notes || null,
        priority: newConstraint.isHardConstraint ? 10 : 5,
      });

      if (result.success && result.constraint) {
        setExistingConstraints((prev) => [...prev, result.constraint!]);
        setConstraints((prev) => [...prev, result.constraint!.id]);
        setShowAddForm(false);
        setNewConstraint({
          constraintType: 'team_blackout',
          teamId: '',
          venueId: '',
          startDate: '',
          endDate: '',
          dayOfWeek: '',
          isHardConstraint: false,
          notes: '',
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [seasonId, leagueId, newConstraint, setConstraints]);

  // Delete constraint
  const handleDeleteConstraint = useCallback(
    async (constraintId: string) => {
      const result = await deleteScheduleConstraint(constraintId);
      if (result.success) {
        setExistingConstraints((prev) => prev.filter((c) => c.id !== constraintId));
        setConstraints((prev) => prev.filter((id) => id !== constraintId));
      }
    },
    [setConstraints]
  );

  // Get display name for constraint
  const getConstraintDisplay = (constraint: ScheduleConstraint) => {
    const team = teams.find((t) => t.id === constraint.teamId);
    const venue = venues.find((v) => v.id === constraint.venueId);

    switch (constraint.constraintType) {
      case 'team_blackout':
        return `${team?.name ?? 'Unknown Team'} unavailable`;
      case 'venue_blackout':
        return `${venue?.name ?? 'Unknown Venue'} unavailable`;
      default:
        return constraint.constraintType;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Schedule Constraints</h3>
          <p className="text-sm text-neutral-400">
            Add blackout dates or preferences to avoid scheduling conflicts.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-black bg-gold-500 rounded-lg hover:bg-gold-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Constraint
        </button>
      </div>

      {/* Add Constraint Form */}
      {showAddForm && (
        <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <h4 className="text-sm font-medium text-white mb-4">New Constraint</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Constraint Type */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Type</label>
              <select
                value={newConstraint.constraintType}
                onChange={(e) =>
                  setNewConstraint((prev) => ({
                    ...prev,
                    constraintType: e.target.value as ConstraintType,
                    teamId: '',
                    venueId: '',
                  }))
                }
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {CONSTRAINT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Team or Venue Selector */}
            {newConstraint.constraintType === 'team_blackout' && (
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Team</label>
                <select
                  value={newConstraint.teamId}
                  onChange={(e) => setNewConstraint((prev) => ({ ...prev, teamId: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Select team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {newConstraint.constraintType === 'venue_blackout' && (
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Venue</label>
                <select
                  value={newConstraint.venueId}
                  onChange={(e) => setNewConstraint((prev) => ({ ...prev, venueId: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Select venue...</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Start Date</label>
              <input
                type="date"
                value={newConstraint.startDate}
                onChange={(e) => setNewConstraint((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-1">End Date</label>
              <input
                type="date"
                value={newConstraint.endDate}
                onChange={(e) => setNewConstraint((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Day of Week */}
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Day of Week (optional)</label>
              <select
                value={newConstraint.dayOfWeek}
                onChange={(e) => setNewConstraint((prev) => ({ ...prev, dayOfWeek: e.target.value }))}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">Any day</option>
                {DAY_NAMES.map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-sm text-neutral-400 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={newConstraint.notes}
                onChange={(e) => setNewConstraint((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g., Tournament weekend"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            {/* Hard Constraint */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newConstraint.isHardConstraint}
                  onChange={(e) =>
                    setNewConstraint((prev) => ({ ...prev, isHardConstraint: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-gold-500 focus:ring-gold-500"
                />
                <span className="text-sm text-neutral-300">
                  Hard constraint (must not be violated)
                </span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddConstraint}
              disabled={isSaving}
              className="px-3 py-2 text-sm font-medium text-black bg-gold-500 rounded-lg hover:bg-gold-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Add Constraint'}
            </button>
          </div>
        </div>
      )}

      {/* Existing Constraints */}
      {existingConstraints.length === 0 ? (
        <div className="text-center py-12 bg-neutral-800/50 rounded-lg border border-dashed border-neutral-700">
          <Calendar className="w-12 h-12 mx-auto text-neutral-600 mb-3" />
          <p className="text-neutral-400">No constraints added yet</p>
          <p className="text-sm text-neutral-500 mt-1">
            Constraints help avoid scheduling conflicts
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {existingConstraints.map((constraint) => (
            <div
              key={constraint.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border',
                constraint.isHardConstraint
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-neutral-800/50 border-neutral-700'
              )}
            >
              <div className="flex items-center gap-3">
                {constraint.isHardConstraint && (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <div className="font-medium text-white">{getConstraintDisplay(constraint)}</div>
                  <div className="text-sm text-neutral-400">
                    {constraint.startDate && constraint.endDate && (
                      <span>
                        {new Date(constraint.startDate).toLocaleDateString()} -{' '}
                        {new Date(constraint.endDate).toLocaleDateString()}
                      </span>
                    )}
                    {constraint.dayOfWeek !== null && (
                      <span className="ml-2">({DAY_NAMES[constraint.dayOfWeek]}s only)</span>
                    )}
                    {constraint.notes && <span className="ml-2">• {constraint.notes}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteConstraint(constraint.id)}
                className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
