'use client';

import { useState, useRef } from 'react';
import {
  MapPin, Plus, Pencil, Trash2, Download, Upload,
  Building2, Calendar, X, ChevronDown, Loader2, AlertCircle,
} from 'lucide-react';
import { cn } from '@hockey-life/ui';
import type { VenueFull, VenueCsvRow, AvailabilityCsvRow, BlackoutCsvRow } from '@/lib/actions/venues';
import { deleteVenue, importVenuesFromCsv, importAvailabilityFromCsv, importBlackoutsFromCsv } from '@/lib/actions/venues';
import { deleteVenueAvailability, deleteVenueBlackoutDate } from '@/lib/schedule/actions';
import type { VenueAvailability, VenueBlackoutDate } from '@/lib/schedule/types';
import { VenueForm } from './VenueForm';
import { AvailabilityForm } from './AvailabilityForm';
import { BlackoutForm } from './BlackoutForm';

// ============================================================================
// CSV download helper
// ============================================================================

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const VENUES_TEMPLATE = `name,address,city,province,postal_code,number_of_rinks
Barrie Community Centre,28 Dunlop St E,Barrie,ON,L4M 1A4,2
Example Arena,123 Main St,Toronto,ON,M5V 1A1,1
`;

const SCHEDULE_TEMPLATE = `venue_name,day_of_week,start_time,end_time,max_games
Barrie Community Centre,Monday,19:00,21:00,2
Barrie Community Centre,Wednesday,20:00,22:00,1
Barrie Community Centre,Friday,20:30,22:30,1
`;

const BLACKOUT_TEMPLATE = `venue_name,date,reason
Barrie Community Centre,2026-04-18,Easter Weekend
Barrie Community Centre,2026-05-24,Victoria Day
Barrie Community Centre,2026-07-01,Canada Day
`;

// ============================================================================
// Day helpers
// ============================================================================

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDayOfWeek(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  const byIndex = parseInt(s, 10);
  if (!isNaN(byIndex) && byIndex >= 0 && byIndex <= 6) return byIndex;
  const abbrs = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const full = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const fi = full.indexOf(s);
  if (fi !== -1) return fi;
  return abbrs.findIndex((a) => s.startsWith(a)) ?? null;
}

const TIME_RE = /^\d{1,2}:\d{2}$/;

// ============================================================================
// Import toast state type
// ============================================================================

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ============================================================================
// Main component
// ============================================================================

interface VenuesSettingsClientProps {
  leagueId: string;
  initialVenues: VenueFull[];
  initialAvailability: VenueAvailability[];
  initialBlackouts: VenueBlackoutDate[];
}

type Tab = 'venues' | 'schedule' | 'blackouts';

export function VenuesSettingsClient({
  leagueId,
  initialVenues,
  initialAvailability,
  initialBlackouts,
}: VenuesSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('venues');
  const [venues, setVenues] = useState(initialVenues);
  const [availability, setAvailability] = useState(initialAvailability);
  const [blackouts, setBlackouts] = useState(initialBlackouts);

  // ── Venues tab state ──
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueFull | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);
  const venueFileRef = useRef<HTMLInputElement>(null);
  const [venueImporting, setVenueImporting] = useState(false);
  const [venueImportResult, setVenueImportResult] = useState<ImportResult | null>(null);

  // ── Schedule tab state ──
  const [showAvailForm, setShowAvailForm] = useState(false);
  const [scheduleVenueFilter, setScheduleVenueFilter] = useState<string>('all');
  const schedFileRef = useRef<HTMLInputElement>(null);
  const [schedImporting, setSchedImporting] = useState(false);
  const [schedImportResult, setSchedImportResult] = useState<ImportResult | null>(null);

  // ── Blackout tab state ──
  const [showBlackoutForm, setShowBlackoutForm] = useState(false);
  const [blackoutVenueFilter, setBlackoutVenueFilter] = useState<string>('all');
  const blackoutFileRef = useRef<HTMLInputElement>(null);
  const [blackoutImporting, setBlackoutImporting] = useState(false);
  const [blackoutImportResult, setBlackoutImportResult] = useState<ImportResult | null>(null);

  // ============================================================
  // VENUES handlers
  // ============================================================

  const handleVenueAdded = (venue: VenueFull) => {
    setVenues((prev) => {
      const existing = prev.find((v) => v.id === venue.id);
      if (existing) return prev.map((v) => v.id === venue.id ? venue : v);
      return [...prev, venue].sort((a, b) => a.name.localeCompare(b.name));
    });
    setShowVenueForm(false);
    setEditingVenue(null);
  };

  const handleDeleteVenue = async (venueId: string) => {
    setDeletingVenueId(venueId);
    await deleteVenue(venueId);
    setVenues((prev) => prev.filter((v) => v.id !== venueId));
    setDeletingVenueId(null);
  };

  const handleVenuesCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVenueImporting(true);
    setVenueImportResult(null);

    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const idx = (name: string) => headers.indexOf(name);

    const rows: VenueCsvRow[] = [];
    for (const line of lines) {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const name = cols[idx('name')] ?? '';
      if (!name) continue;
      rows.push({
        name,
        address: cols[idx('address')] || undefined,
        city: cols[idx('city')] || undefined,
        stateProvince: cols[idx('province')] || cols[idx('state_province')] || undefined,
        postalCode: cols[idx('postal_code')] || undefined,
        numberOfRinks: cols[idx('number_of_rinks')] ? parseInt(cols[idx('number_of_rinks')], 10) : undefined,
      });
    }

    const result = await importVenuesFromCsv(leagueId, rows);
    setVenueImportResult(result);
    if (result.imported > 0) {
      // Refresh venue list from optimistic update approximation
      const newNames = new Set(venues.map((v) => v.name.toLowerCase()));
      const addedRows = rows.filter((r) => !newNames.has(r.name.toLowerCase()));
      // Re-fetch not available in client — will pick up on next navigation; show toast
    }
    setVenueImporting(false);
    if (venueFileRef.current) venueFileRef.current.value = '';
  };

  // ============================================================
  // SCHEDULE handlers
  // ============================================================

  const handleAvailAdded = (slot: VenueAvailability) => {
    setAvailability((prev) => [...prev, slot]);
    setShowAvailForm(false);
  };

  const handleDeleteAvail = async (id: string) => {
    await deleteVenueAvailability(id);
    setAvailability((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSchedCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSchedImporting(true);
    setSchedImportResult(null);

    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const idx = (name: string) => headers.indexOf(name);

    const rows: AvailabilityCsvRow[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const venueName = cols[idx('venue_name')] ?? '';
      const dayRaw = cols[idx('day_of_week')] ?? '';
      const startTime = cols[idx('start_time')] ?? '';
      const endTime = cols[idx('end_time')] ?? '';

      if (!venueName || !dayRaw || !startTime || !endTime) {
        errors.push(`Row ${i + 2}: missing required fields`);
        continue;
      }

      const dayOfWeek = parseDayOfWeek(dayRaw);
      if (dayOfWeek === null || dayOfWeek < 0) {
        errors.push(`Row ${i + 2}: invalid day "${dayRaw}"`);
        continue;
      }

      if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
        errors.push(`Row ${i + 2}: invalid time format (use HH:mm)`);
        continue;
      }

      const maxGamesRaw = cols[idx('max_games')];
      rows.push({
        venueName,
        dayOfWeek,
        startTime,
        endTime,
        maxGames: maxGamesRaw ? parseInt(maxGamesRaw, 10) : undefined,
      });
    }

    const result = await importAvailabilityFromCsv(leagueId, rows);
    setSchedImportResult({ ...result, errors: [...errors, ...result.errors] });
    setSchedImporting(false);
    if (schedFileRef.current) schedFileRef.current.value = '';
  };

  // ============================================================
  // BLACKOUT handlers
  // ============================================================

  const handleBlackoutAdded = (b: VenueBlackoutDate) => {
    setBlackouts((prev) => [...prev, b].sort((a, z) =>
      new Date(a.blackoutDate).getTime() - new Date(z.blackoutDate).getTime()
    ));
    setShowBlackoutForm(false);
  };

  const handleDeleteBlackout = async (id: string) => {
    await deleteVenueBlackoutDate(id);
    setBlackouts((prev) => prev.filter((b) => b.id !== id));
  };

  const handleBlackoutCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBlackoutImporting(true);
    setBlackoutImportResult(null);

    const text = await file.text();
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const idx = (name: string) => headers.indexOf(name);

    const rows: BlackoutCsvRow[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const venueName = cols[idx('venue_name')] ?? '';
      const date = cols[idx('date')] ?? '';

      if (!venueName || !date) {
        errors.push(`Row ${i + 2}: missing venue_name or date`);
        continue;
      }

      rows.push({
        venueName,
        date,
        reason: cols[idx('reason')] || undefined,
      });
    }

    const result = await importBlackoutsFromCsv(leagueId, rows);
    setBlackoutImportResult({ ...result, errors: [...errors, ...result.errors] });
    setBlackoutImporting(false);
    if (blackoutFileRef.current) blackoutFileRef.current.value = '';
  };

  // ============================================================
  // Grouped availability for display
  // ============================================================

  const venueMap = new Map(venues.map((v) => [v.id, v]));

  const filteredAvailability = scheduleVenueFilter === 'all'
    ? availability
    : availability.filter((s) => s.venueId === scheduleVenueFilter);

  const slotsByDay = DAYS.map((day, i) => ({
    day,
    dayIndex: i,
    slots: filteredAvailability.filter((s) => s.dayOfWeek === i),
  })).filter((d) => d.slots.length > 0);

  const filteredBlackouts = blackoutVenueFilter === 'all'
    ? blackouts
    : blackouts.filter((b) => b.venueId === blackoutVenueFilter);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-xl p-1 w-fit">
        {([
          { id: 'venues', label: 'Venues', icon: Building2 },
          { id: 'schedule', label: 'Weekly Schedule', icon: Calendar },
          { id: 'blackouts', label: 'Blackout Dates', icon: X },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-rink-500/20 text-rink-400 border border-rink-500/30'
                : 'text-neutral-400 hover:text-white'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ──────────────── VENUES TAB ──────────────── */}
      {activeTab === 'venues' && (
        <div className="space-y-4">
          {/* Header actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setShowVenueForm(true); setEditingVenue(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rink-500 hover:bg-rink-400 text-black text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Venue
            </button>

            <button
              onClick={() => downloadCsv('venues-template.csv', VENUES_TEMPLATE)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV Template
            </button>

            <label className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-sm transition-colors cursor-pointer',
              venueImporting && 'opacity-50 pointer-events-none'
            )}>
              {venueImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import CSV
              <input
                ref={venueFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleVenuesCsv}
              />
            </label>
          </div>

          {/* Import result */}
          {venueImportResult && (
            <ImportResultBanner result={venueImportResult} onDismiss={() => setVenueImportResult(null)} />
          )}

          {/* Inline form */}
          {(showVenueForm || editingVenue) && (
            <VenueForm
              leagueId={leagueId}
              initialData={editingVenue ?? undefined}
              onSuccess={handleVenueAdded}
              onCancel={() => { setShowVenueForm(false); setEditingVenue(null); }}
            />
          )}

          {/* Venues table */}
          {venues.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No venues yet"
              description="Add your rinks and arenas to get started. You can add them one by one or import from a CSV file."
            />
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Venue</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden sm:table-cell">City</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden md:table-cell">Rinks</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {venues.map((venue) => (
                    <tr key={venue.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rink-500/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-rink-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{venue.name}</p>
                            {venue.address && (
                              <p className="text-xs text-neutral-500">{venue.address}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 hidden sm:table-cell">
                        {[venue.city, venue.stateProvince].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {venue.numberOfRinks ? (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-xs font-medium">
                            {venue.numberOfRinks} sheet{venue.numberOfRinks !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingVenue(venue); setShowVenueForm(false); }}
                            className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVenue(venue.id)}
                            disabled={deletingVenueId === venue.id}
                            className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingVenueId === venue.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-neutral-600">
            Venues set here are available when assigning home rinks to teams and generating schedules.
          </p>
        </div>
      )}

      {/* ──────────────── WEEKLY SCHEDULE TAB ──────────────── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {venues.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Add a venue first"
              description="You need at least one venue before you can set ice time availability."
            />
          ) : (
            <>
              {/* Header actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowAvailForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rink-500 hover:bg-rink-400 text-black text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Slot
                </button>

                <button
                  onClick={() => downloadCsv('weekly-schedule-template.csv', SCHEDULE_TEMPLATE)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  CSV Template
                </button>

                <label className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-sm transition-colors cursor-pointer',
                  schedImporting && 'opacity-50 pointer-events-none'
                )}>
                  {schedImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import CSV
                  <input
                    ref={schedFileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleSchedCsv}
                  />
                </label>

                {/* Venue filter */}
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-xs text-neutral-500">Filter:</label>
                  <div className="relative">
                    <select
                      value={scheduleVenueFilter}
                      onChange={(e) => setScheduleVenueFilter(e.target.value)}
                      className="pl-3 pr-8 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm appearance-none focus:outline-none"
                    >
                      <option value="all">All venues</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Import result */}
              {schedImportResult && (
                <ImportResultBanner result={schedImportResult} onDismiss={() => setSchedImportResult(null)} />
              )}

              {/* Inline form */}
              {showAvailForm && (
                <AvailabilityForm
                  leagueId={leagueId}
                  venues={venues}
                  onSuccess={handleAvailAdded}
                  onCancel={() => setShowAvailForm(false)}
                />
              )}

              {/* Slots grouped by day */}
              {filteredAvailability.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No ice time slots"
                  description="Add recurring time windows when your venues are available for games."
                />
              ) : (
                <div className="space-y-3">
                  {slotsByDay.map(({ day, slots }) => (
                    <div key={day} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">{day}</span>
                      </div>
                      <div className="divide-y divide-white/[0.05]">
                        {slots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => (
                          <div key={slot.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-4">
                              {scheduleVenueFilter === 'all' && (
                                <span className="text-sm font-medium text-neutral-300 min-w-[140px]">
                                  {venueMap.get(slot.venueId)?.name ?? 'Unknown venue'}
                                </span>
                              )}
                              <span className="text-sm text-white font-mono">
                                {slot.startTime} – {slot.endTime}
                              </span>
                              {slot.maxGames && (
                                <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-xs">
                                  max {slot.maxGames} game{slot.maxGames !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteAvail(slot.id)}
                              className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-neutral-600">
                Weekly slots tell the schedule generator when ice is available. Import from CSV to set up dozens of slots at once.
              </p>
            </>
          )}
        </div>
      )}

      {/* ──────────────── BLACKOUT DATES TAB ──────────────── */}
      {activeTab === 'blackouts' && (
        <div className="space-y-4">
          {venues.length === 0 ? (
            <EmptyState
              icon={X}
              title="Add a venue first"
              description="You need at least one venue before you can set blackout dates."
            />
          ) : (
            <>
              {/* Header actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowBlackoutForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rink-500 hover:bg-rink-400 text-black text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Blackout
                </button>

                <button
                  onClick={() => downloadCsv('blackout-dates-template.csv', BLACKOUT_TEMPLATE)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  CSV Template
                </button>

                <label className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white text-sm transition-colors cursor-pointer',
                  blackoutImporting && 'opacity-50 pointer-events-none'
                )}>
                  {blackoutImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import CSV
                  <input
                    ref={blackoutFileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleBlackoutCsv}
                  />
                </label>

                {/* Venue filter */}
                <div className="ml-auto flex items-center gap-2">
                  <label className="text-xs text-neutral-500">Venue:</label>
                  <div className="relative">
                    <select
                      value={blackoutVenueFilter}
                      onChange={(e) => setBlackoutVenueFilter(e.target.value)}
                      className="pl-3 pr-8 py-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm appearance-none focus:outline-none"
                    >
                      <option value="all">All venues</option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Import result */}
              {blackoutImportResult && (
                <ImportResultBanner result={blackoutImportResult} onDismiss={() => setBlackoutImportResult(null)} />
              )}

              {/* Inline form */}
              {showBlackoutForm && (
                <BlackoutForm
                  leagueId={leagueId}
                  venues={venues}
                  onSuccess={handleBlackoutAdded}
                  onCancel={() => setShowBlackoutForm(false)}
                />
              )}

              {/* Blackout table */}
              {filteredBlackouts.length === 0 ? (
                <EmptyState
                  icon={X}
                  title="No blackout dates"
                  description="Add dates when venues are unavailable (holidays, tournaments, building closures)."
                />
              ) : (
                <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide hidden sm:table-cell">Venue</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Reason</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wide">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {filteredBlackouts.map((b) => {
                        const dateStr = b.blackoutDate instanceof Date
                          ? b.blackoutDate.toLocaleDateString('en-CA')
                          : String(b.blackoutDate);
                        const isPast = new Date(b.blackoutDate) < new Date();
                        return (
                          <tr key={b.id} className={cn('hover:bg-white/[0.02] transition-colors', isPast && 'opacity-40')}>
                            <td className="px-4 py-3 text-neutral-300 hidden sm:table-cell">
                              {venueMap.get(b.venueId)?.name ?? 'Unknown'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-white">{dateStr}</span>
                            </td>
                            <td className="px-4 py-3 text-neutral-400">
                              {b.reason || <span className="text-neutral-600">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteBlackout(b.id)}
                                className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-neutral-600">
                Blackout dates are respected by the schedule generator — no games will be placed on these dates.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-white/[0.02] border border-white/10 border-dashed rounded-xl">
      <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-neutral-600" />
      </div>
      <p className="text-sm font-medium text-neutral-400">{title}</p>
      <p className="text-xs text-neutral-600 mt-1 max-w-xs">{description}</p>
    </div>
  );
}

function ImportResultBanner({
  result,
  onDismiss,
}: {
  result: ImportResult;
  onDismiss: () => void;
}) {
  const hasErrors = result.errors.length > 0;

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-xl border text-sm',
      hasErrors
        ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
        : 'bg-green-500/10 border-green-500/20 text-green-300'
    )}>
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          {result.imported} imported{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}
        </p>
        {result.errors.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs opacity-80">
            {result.errors.slice(0, 5).map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
            {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
          </ul>
        )}
      </div>
      <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
