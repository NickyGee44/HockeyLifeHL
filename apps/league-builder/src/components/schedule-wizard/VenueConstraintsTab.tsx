'use client';

/**
 * Venue Constraints Tab
 *
 * Configure venue-related constraints for schedule generation:
 * - Home venue assignments
 * - Venue availability (days/times)
 * - Maximum games per venue per day
 * - Venue blackout dates
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2, MapPin, Calendar, Clock, AlertTriangle } from 'lucide-react';
import type { Team, Venue, VenueAvailability, VenueBlackoutDate } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface VenueConstraintsTabProps {
  leagueId: string;
  seasonId: string;
  teams: Team[];
  venues: Venue[];
  venueAvailability: VenueAvailability[];
  venueBlackouts: VenueBlackoutDate[];
  maxGamesPerVenuePerDay: number;
  onVenueAvailabilityChange: (availability: VenueAvailability[]) => void;
  onVenueBlackoutsChange: (blackouts: VenueBlackoutDate[]) => void;
  onMaxGamesChange: (maxGames: number) => void;
  onTeamHomeVenueChange: (teamId: string, venueId: string | null) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// COMPONENT
// ============================================================================

export function VenueConstraintsTab({
  leagueId,
  seasonId,
  teams,
  venues,
  venueAvailability,
  venueBlackouts,
  maxGamesPerVenuePerDay,
  onVenueAvailabilityChange,
  onVenueBlackoutsChange,
  onMaxGamesChange,
  onTeamHomeVenueChange,
}: VenueConstraintsTabProps) {
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);
  const [showAddBlackout, setShowAddBlackout] = useState(false);
  const [newBlackout, setNewBlackout] = useState({
    venueId: '',
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
  });

  // Get availability for a specific venue
  const getVenueAvailability = (venueId: string) => {
    return venueAvailability.filter((a) => a.venueId === venueId);
  };

  // Get blackouts for a specific venue




  // Add availability slot
  const addAvailabilitySlot = useCallback(
    (venueId: string, dayOfWeek: number) => {
      const newSlot: VenueAvailability = {
        id: `temp-${Date.now()}`,
        leagueId,
        venueId,
        seasonId,
        dayOfWeek,
        startTime: '18:00',
        endTime: '22:00',
        isAvailable: true,
        maxGames: null,
        notes: null,
      };
      onVenueAvailabilityChange([...venueAvailability, newSlot]);
    },
    [leagueId, seasonId, venueAvailability, onVenueAvailabilityChange]
  );

  // Remove availability slot
  const removeAvailabilitySlot = useCallback(
    (slotId: string) => {
      onVenueAvailabilityChange(venueAvailability.filter((a) => a.id !== slotId));
    },
    [venueAvailability, onVenueAvailabilityChange]
  );

  // Update availability slot
  const updateAvailabilitySlot = useCallback(
    (slotId: string, updates: Partial<VenueAvailability>) => {
      onVenueAvailabilityChange(
        venueAvailability.map((a) => (a.id === slotId ? { ...a, ...updates } : a))
      );
    },
    [venueAvailability, onVenueAvailabilityChange]
  );

  // Add blackout date
  const addBlackoutDate = useCallback(() => {
    if (!newBlackout.venueId || !newBlackout.date) return;

    const blackout: VenueBlackoutDate = {
      id: `temp-${Date.now()}`,
      leagueId,
      venueId: newBlackout.venueId,
      blackoutDate: new Date(newBlackout.date),
      startTime: newBlackout.startTime || null,
      endTime: newBlackout.endTime || null,
      reason: newBlackout.reason || null,
    };

    onVenueBlackoutsChange([...venueBlackouts, blackout]);
    setNewBlackout({ venueId: '', date: '', startTime: '', endTime: '', reason: '' });
    setShowAddBlackout(false);
  }, [leagueId, newBlackout, venueBlackouts, onVenueBlackoutsChange]);

  // Remove blackout date
  const removeBlackoutDate = useCallback(
    (blackoutId: string) => {
      onVenueBlackoutsChange(venueBlackouts.filter((b) => b.id !== blackoutId));
    },
    [venueBlackouts, onVenueBlackoutsChange]
  );

  return (
    <div className="space-y-6">
      {/* Home Venue Assignments */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rink-500" />
          Home Venue Assignments
        </h4>
        <p className="text-sm text-neutral-400 mb-4">
          Assign each team&apos;s home venue for home games.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-3">
              <span className="text-sm text-white min-w-[120px] truncate">{team.name}</span>
              <select
                value={team.homeVenueId ?? ''}
                onChange={(e) => onTeamHomeVenueChange(team.id, e.target.value || null)}
                className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
              >
                <option value="">No home venue</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Max Games Per Venue */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rink-500" />
          Maximum Games Per Venue Per Day
        </h4>
        <p className="text-sm text-neutral-400 mb-3">
          Maximum number of games that can be scheduled at a single venue on the same day. This applies across all time slots.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={10}
            value={maxGamesPerVenuePerDay}
            onChange={(e) => onMaxGamesChange(parseInt(e.target.value) || 4)}
            className="w-20 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-rink-500"
          />
          <span className="text-sm text-neutral-400">games per venue per day</span>
        </div>
      </div>

      {/* Venue Availability */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-rink-500" />
          Venue Availability
        </h4>
        <p className="text-sm text-neutral-400 mb-4">
          Define when each venue is available for scheduling games.
        </p>

        <div className="space-y-3">
          {venues.map((venue) => {
            const availability = getVenueAvailability(venue.id);
            const isExpanded = expandedVenue === venue.id;

            return (
              <div key={venue.id} className="border border-neutral-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedVenue(isExpanded ? null : venue.id)}
                  className="w-full flex items-center justify-between p-3 bg-neutral-800 hover:bg-neutral-700 transition-colors"
                >
                  <span className="font-medium text-white">{venue.name}</span>
                  <span className="text-sm text-neutral-400">
                    {availability.length} time slots configured
                  </span>
                </button>

                {isExpanded && (
                  <div className="p-3 space-y-3">
                    {/* Existing slots */}
                    {availability.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-3 p-2 bg-neutral-900 rounded-lg"
                      >
                        <select
                          value={slot.dayOfWeek}
                          onChange={(e) =>
                            updateAvailabilitySlot(slot.id, { dayOfWeek: parseInt(e.target.value) })
                          }
                          className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
                        >
                          {DAY_NAMES.map((day, idx) => (
                            <option key={idx} value={idx}>
                              {day}
                            </option>
                          ))}
                        </select>

                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            updateAvailabilitySlot(slot.id, { startTime: e.target.value })
                          }
                          className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
                        />
                        <span className="text-neutral-500">to</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            updateAvailabilitySlot(slot.id, { endTime: e.target.value })
                          }
                          className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
                        />

                        <div className="flex items-center gap-2 ml-auto">
                          <label
                            className="flex items-center gap-1 text-sm text-neutral-400"
                            title="Maximum number of games allowed in this time slot"
                          >
                            <span className="hidden sm:inline">Max games:</span>
                            <span className="sm:hidden">Max:</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={slot.maxGames ?? ''}
                              onChange={(e) =>
                                updateAvailabilitySlot(slot.id, {
                                  maxGames: e.target.value ? parseInt(e.target.value) : null,
                                })
                              }
                              placeholder="-"
                              className="w-12 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-sm text-center"
                            />
                          </label>

                          <button
                            onClick={() => removeAvailabilitySlot(slot.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add slot buttons */}
                    <div className="flex flex-wrap gap-2">
                      {DAY_NAMES.map((day, idx) => (
                        <button
                          key={idx}
                          onClick={() => addAvailabilitySlot(venue.id, idx)}
                          className="px-3 py-1 text-xs font-medium text-rink-500 border border-rink-500/30 rounded hover:bg-rink-500/10 transition-colors"
                        >
                          + {DAY_SHORT[idx]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Venue Blackout Dates */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Venue Blackout Dates
          </h4>
          <button
            onClick={() => setShowAddBlackout(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Blackout
          </button>
        </div>
        <p className="text-sm text-neutral-400 mb-4">
          Mark specific dates when venues are unavailable (holidays, maintenance, etc.).
        </p>

        {/* Add blackout form */}
        {showAddBlackout && (
          <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Venue</label>
                <select
                  value={newBlackout.venueId}
                  onChange={(e) => setNewBlackout({ ...newBlackout, venueId: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                >
                  <option value="">Select venue...</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Date</label>
                <input
                  type="date"
                  value={newBlackout.date}
                  onChange={(e) => setNewBlackout({ ...newBlackout, date: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Start Time (optional)</label>
                <input
                  type="time"
                  value={newBlackout.startTime}
                  onChange={(e) => setNewBlackout({ ...newBlackout, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">End Time (optional)</label>
                <input
                  type="time"
                  value={newBlackout.endTime}
                  onChange={(e) => setNewBlackout({ ...newBlackout, endTime: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={newBlackout.reason}
                onChange={(e) => setNewBlackout({ ...newBlackout, reason: e.target.value })}
                placeholder="e.g., Holiday, Maintenance"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddBlackout(false);
                  setNewBlackout({ venueId: '', date: '', startTime: '', endTime: '', reason: '' });
                }}
                className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addBlackoutDate}
                disabled={!newBlackout.venueId || !newBlackout.date}
                className="px-3 py-1.5 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors disabled:opacity-50"
              >
                Add Blackout
              </button>
            </div>
          </div>
        )}

        {/* Existing blackouts */}
        {venueBlackouts.length === 0 ? (
          <div className="text-center py-6 text-neutral-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No blackout dates configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {venueBlackouts.map((blackout) => {
              const venue = venues.find((v) => v.id === blackout.venueId);
              return (
                <div
                  key={blackout.id}
                  className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">{venue?.name ?? 'Unknown Venue'}</div>
                    <div className="text-sm text-neutral-400">
                      {new Date(blackout.blackoutDate).toLocaleDateString()}
                      {blackout.startTime && blackout.endTime && (
                        <span className="ml-2">
                          {blackout.startTime} - {blackout.endTime}
                        </span>
                      )}
                      {blackout.reason && <span className="ml-2">({blackout.reason})</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => removeBlackoutDate(blackout.id)}
                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
