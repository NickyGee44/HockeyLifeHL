'use client';

/**
 * Venue Constraints Tab
 *
 * Configure venue-related constraints for schedule generation:
 * - Home venue assignments
 * - Venue availability (days/times)
 * - Maximum games per venue per day
 * - Venue blackout dates
 * - Additional (one-off) ice time slots
 * - CSV ice time import
 */

import { useState, useCallback, useRef } from 'react';
import { Plus, Trash2, MapPin, Calendar, Clock, AlertTriangle, Upload, CheckCircle2, XCircle } from 'lucide-react';
import type { Team, Venue, VenueAvailability, VenueBlackoutDate, AdditionalIceSlot } from '@/lib/schedule/types';

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
  additionalIceSlots: AdditionalIceSlot[];
  onVenueAvailabilityChange: (availability: VenueAvailability[]) => void;
  onVenueBlackoutsChange: (blackouts: VenueBlackoutDate[]) => void;
  onMaxGamesChange: (maxGames: number) => void;
  onTeamHomeVenueChange: (teamId: string, venueId: string | null) => void;
  onAdditionalIceSlotsChange: (slots: AdditionalIceSlot[]) => void;
}

interface CsvRow {
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  venueId: string | null;
  error: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// CSV PARSING HELPERS
// ============================================================================

const TIME_RE = /^\d{1,2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseTimeValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (TIME_RE.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return null;
}

function parseDateValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (DATE_RE.test(trimmed)) {
    const d = new Date(trimmed + 'T00:00:00');
    if (!isNaN(d.getTime())) return trimmed;
  }
  return null;
}

function parseCsvContent(content: string, venues: Venue[]): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  // Skip header row
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    if (cols.length < 4) {
      return {
        venueName: cols[0] ?? '',
        date: cols[1] ?? '',
        startTime: cols[2] ?? '',
        endTime: cols[3] ?? '',
        venueId: null,
        error: `Expected 4 columns, got ${cols.length}`,
      };
    }

    const [venueName, dateRaw, startRaw, endRaw] = cols;
    const errors: string[] = [];

    // Match venue by name (case-insensitive)
    const matchedVenue = venues.find(
      (v) => v.name.toLowerCase() === venueName.toLowerCase()
    );
    if (!matchedVenue) errors.push('Unknown venue');

    const date = parseDateValue(dateRaw);
    if (!date) errors.push('Invalid date');

    const startTime = parseTimeValue(startRaw);
    if (!startTime) errors.push('Invalid start time');

    const endTime = parseTimeValue(endRaw);
    if (!endTime) errors.push('Invalid end time');

    return {
      venueName,
      date: date ?? dateRaw,
      startTime: startTime ?? startRaw,
      endTime: endTime ?? endRaw,
      venueId: matchedVenue?.id ?? null,
      error: errors.length > 0 ? errors.join(', ') : null,
    };
  });
}

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
  additionalIceSlots,
  onVenueAvailabilityChange,
  onVenueBlackoutsChange,
  onMaxGamesChange,
  onTeamHomeVenueChange,
  onAdditionalIceSlotsChange,
}: VenueConstraintsTabProps) {
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);
  const [showAddBlackout, setShowAddBlackout] = useState(false);
  const [showAddIceSlot, setShowAddIceSlot] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvRow[] | null>(null);
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newBlackout, setNewBlackout] = useState({
    venueId: '',
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
  });

  const [newIceSlot, setNewIceSlot] = useState({
    venueId: '',
    date: '',
    startTime: '',
    endTime: '',
  });

  // Get availability for a specific venue
  const getVenueAvailability = (venueId: string) => {
    return venueAvailability.filter((a) => a.venueId === venueId);
  };

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

  // Add one-off ice time slot
  const addIceSlot = useCallback(() => {
    if (!newIceSlot.venueId || !newIceSlot.date || !newIceSlot.startTime || !newIceSlot.endTime) return;

    const slot: AdditionalIceSlot = {
      id: `ice-${Date.now()}`,
      venueId: newIceSlot.venueId,
      date: newIceSlot.date,
      startTime: newIceSlot.startTime,
      endTime: newIceSlot.endTime,
    };

    onAdditionalIceSlotsChange([...additionalIceSlots, slot]);
    setNewIceSlot({ venueId: '', date: '', startTime: '', endTime: '' });
    setShowAddIceSlot(false);
  }, [newIceSlot, additionalIceSlots, onAdditionalIceSlotsChange]);

  // Remove one-off ice time slot
  const removeIceSlot = useCallback(
    (slotId: string) => {
      onAdditionalIceSlotsChange(additionalIceSlots.filter((s) => s.id !== slotId));
    },
    [additionalIceSlots, onAdditionalIceSlotsChange]
  );

  // Handle CSV file upload
  const handleCsvUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setCsvImportMessage(null);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result;
        if (typeof content !== 'string') return;

        const rows = parseCsvContent(content, venues);
        if (rows.length === 0) {
          setCsvPreview(null);
          setCsvImportMessage('No data rows found in CSV file.');
          return;
        }
        setCsvPreview(rows);
      };
      reader.readAsText(file);

      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [venues]
  );

  // Import valid rows from CSV preview
  const importCsvRows = useCallback(() => {
    if (!csvPreview) return;

    const validRows = csvPreview.filter((r) => r.error === null && r.venueId !== null);
    const newSlots: AdditionalIceSlot[] = validRows.map((r, i) => ({
      id: `csv-${Date.now()}-${i}`,
      venueId: r.venueId!,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
    }));

    // Deduplicate against existing slots
    const existingKeys = new Set(
      additionalIceSlots.map((s) => `${s.venueId}-${s.date}-${s.startTime}`)
    );
    const uniqueSlots = newSlots.filter(
      (s) => !existingKeys.has(`${s.venueId}-${s.date}-${s.startTime}`)
    );

    onAdditionalIceSlotsChange([...additionalIceSlots, ...uniqueSlots]);
    setCsvImportMessage(
      `Imported ${uniqueSlots.length} ice time slot${uniqueSlots.length !== 1 ? 's' : ''}` +
        (newSlots.length !== uniqueSlots.length
          ? ` (${newSlots.length - uniqueSlots.length} duplicates skipped)`
          : '')
    );
    setCsvPreview(null);
  }, [csvPreview, additionalIceSlots, onAdditionalIceSlotsChange]);

  const csvValidCount = csvPreview?.filter((r) => r.error === null).length ?? 0;
  const csvInvalidCount = csvPreview ? csvPreview.length - csvValidCount : 0;

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

      {/* Additional Ice Times */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-rink-500" />
            Additional Ice Times
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white border border-neutral-600 rounded-lg hover:bg-neutral-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              onClick={() => setShowAddIceSlot(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add One-Off Slot
            </button>
          </div>
        </div>
        <p className="text-sm text-neutral-400 mb-4">
          Add one-off ice time slots outside the regular weekly schedule, or import from a CSV file.
          These slots are available for the schedule generator to use when assigning games.
        </p>

        {/* Add one-off ice slot form */}
        {showAddIceSlot && (
          <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Venue</label>
                <select
                  value={newIceSlot.venueId}
                  onChange={(e) => setNewIceSlot({ ...newIceSlot, venueId: e.target.value })}
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
                  value={newIceSlot.date}
                  onChange={(e) => setNewIceSlot({ ...newIceSlot, date: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Start Time</label>
                <input
                  type="time"
                  value={newIceSlot.startTime}
                  onChange={(e) => setNewIceSlot({ ...newIceSlot, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">End Time</label>
                <input
                  type="time"
                  value={newIceSlot.endTime}
                  onChange={(e) => setNewIceSlot({ ...newIceSlot, endTime: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rink-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddIceSlot(false);
                  setNewIceSlot({ venueId: '', date: '', startTime: '', endTime: '' });
                }}
                className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addIceSlot}
                disabled={!newIceSlot.venueId || !newIceSlot.date || !newIceSlot.startTime || !newIceSlot.endTime}
                className="px-3 py-1.5 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors disabled:opacity-50"
              >
                Add Slot
              </button>
            </div>
          </div>
        )}

        {/* CSV Preview */}
        {csvPreview && (
          <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-white">CSV Preview</h5>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {csvValidCount} valid
                </span>
                {csvInvalidCount > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    {csvInvalidCount} invalid
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 text-left">
                    <th className="py-1 pr-3">Venue</th>
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Start</th>
                    <th className="py-1 pr-3">End</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, i) => (
                    <tr
                      key={i}
                      className={row.error ? 'text-red-400' : 'text-white'}
                    >
                      <td className="py-1 pr-3">{row.venueName}</td>
                      <td className="py-1 pr-3">{row.date}</td>
                      <td className="py-1 pr-3">{row.startTime}</td>
                      <td className="py-1 pr-3">{row.endTime}</td>
                      <td className="py-1 text-xs">
                        {row.error ? (
                          <span className="text-red-400">{row.error}</span>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCsvPreview(null)}
                className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={importCsvRows}
                disabled={csvValidCount === 0}
                className="px-3 py-1.5 text-sm font-medium text-black bg-rink-500 rounded-lg hover:bg-rink-600 transition-colors disabled:opacity-50"
              >
                Import {csvValidCount} valid slot{csvValidCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* CSV import success message */}
        {csvImportMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {csvImportMessage}
            <button
              onClick={() => setCsvImportMessage(null)}
              className="ml-auto text-green-400/60 hover:text-green-400"
            >
              &times;
            </button>
          </div>
        )}

        {/* Existing additional ice time slots */}
        {additionalIceSlots.length === 0 ? (
          <div className="text-center py-6 text-neutral-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No additional ice times configured</p>
            <p className="text-xs mt-1">
              CSV format: <code className="text-neutral-400">venue_name, date, start_time, end_time</code>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {additionalIceSlots.map((slot) => {
              const venue = venues.find((v) => v.id === slot.venueId);
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">{venue?.name ?? 'Unknown Venue'}</div>
                    <div className="text-sm text-neutral-400">
                      {new Date(slot.date + 'T00:00:00').toLocaleDateString()}
                      <span className="ml-2">{slot.startTime} - {slot.endTime}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeIceSlot(slot.id)}
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
                  <option value="all">All Venues</option>
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
              const venue = blackout.venueId === 'all' ? null : venues.find((v) => v.id === blackout.venueId);
              const venueName = blackout.venueId === 'all' ? 'All Venues' : (venue?.name ?? 'Unknown Venue');
              return (
                <div
                  key={blackout.id}
                  className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">{venueName}</div>
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
