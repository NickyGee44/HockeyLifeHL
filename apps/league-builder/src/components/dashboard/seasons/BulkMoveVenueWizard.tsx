'use client';

/**
 * Bulk Move Venue Wizard (4-Step)
 *
 * Step 1: Select source venue + date range → shows affected game count
 * Step 2: Review affected games → deselect individual games
 * Step 3: Select destination venue
 * Step 4: Confirm summary → execute move
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Loader2,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@hockey-life/ui/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  getGamesAtVenueInRange,
  bulkMoveSelectedGamesToVenue,
} from '@/lib/actions/games';
import type { VenueGame } from '@/lib/actions/games';

// ============================================================================
// TYPES
// ============================================================================

interface BulkMoveVenueWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  seasonId: string;
  /** Distinct location strings from current games */
  locations: string[];
  onGamesMoved: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Source',
  2: 'Review',
  3: 'Destination',
  4: 'Confirm',
};

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-4">
      {([1, 2, 3, 4] as WizardStep[]).map((step) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors',
              step === currentStep
                ? 'bg-purple-500 text-white'
                : step < currentStep
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-neutral-800 text-neutral-500'
            )}
          >
            {step < currentStep ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              step
            )}
          </div>
          <span
            className={cn(
              'text-xs hidden sm:inline',
              step === currentStep ? 'text-purple-400' : 'text-neutral-500'
            )}
          >
            {STEP_LABELS[step]}
          </span>
          {step < 4 && (
            <div
              className={cn(
                'w-6 h-px mx-1',
                step < currentStep ? 'bg-purple-500/40' : 'bg-neutral-700'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkMoveVenueWizard({
  open,
  onOpenChange,
  leagueId,
  seasonId,
  locations,
  onGamesMoved,
}: BulkMoveVenueWizardProps) {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1: Source
  const [fromLocation, setFromLocation] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Step 2: Review
  const [affectedGames, setAffectedGames] = useState<VenueGame[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Step 3: Destination
  const [toSelection, setToSelection] = useState('');
  const [customVenue, setCustomVenue] = useState('');

  // Step 4: Confirm + Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ moved: number; failed: string[] } | null>(null);

  const toLocation = toSelection === '__custom__' ? customVenue.trim() : toSelection;
  const toOptions = locations.filter((l) => l !== fromLocation);

  // ------------------------------------------------------------------
  // Fetch affected games when moving to step 2
  // ------------------------------------------------------------------
  const fetchAffectedGames = useCallback(async () => {
    if (!fromLocation || !dateFrom || !dateTo) return;
    setIsLoading(true);

    const res = await getGamesAtVenueInRange(leagueId, seasonId, fromLocation, dateFrom, dateTo);

    if (res.success) {
      setAffectedGames(res.data);
      setSelectedGameIds(new Set(res.data.map((g) => g.id)));
    } else {
      toast.error(res.error);
      setAffectedGames([]);
      setSelectedGameIds(new Set());
    }

    setIsLoading(false);
  }, [leagueId, seasonId, fromLocation, dateFrom, dateTo]);

  // Auto-fetch when entering step 2
  useEffect(() => {
    if (step === 2 && affectedGames.length === 0 && !isLoading) {
      fetchAffectedGames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  const canAdvance = (s: WizardStep): boolean => {
    switch (s) {
      case 1:
        return !!(fromLocation && dateFrom && dateTo && dateFrom <= dateTo);
      case 2:
        return selectedGameIds.size > 0;
      case 3:
        return !!(toLocation && toLocation !== fromLocation);
      case 4:
        return false; // last step
    }
  };

  const handleNext = () => {
    if (step === 1) {
      // Reset games when entering step 2 fresh
      setAffectedGames([]);
      setSelectedGameIds(new Set());
      setStep(2);
    } else if (step < 4) {
      setStep((s) => (s + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as WizardStep);
    }
  };

  // ------------------------------------------------------------------
  // Toggle game selection
  // ------------------------------------------------------------------
  const toggleGame = (gameId: string) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedGameIds.size === affectedGames.length) {
      setSelectedGameIds(new Set());
    } else {
      setSelectedGameIds(new Set(affectedGames.map((g) => g.id)));
    }
  };

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!toLocation || selectedGameIds.size === 0) return;

    setIsSubmitting(true);
    const res = await bulkMoveSelectedGamesToVenue(
      leagueId,
      Array.from(selectedGameIds),
      toLocation
    );

    if (res.success) {
      setResult(res.data);
      toast.success(
        `${res.data.moved} game${res.data.moved !== 1 ? 's' : ''} moved to ${toLocation}`
      );
      onGamesMoved();
      router.refresh();
    } else {
      toast.error(res.error);
    }

    setIsSubmitting(false);
  };

  // ------------------------------------------------------------------
  // Reset + Close
  // ------------------------------------------------------------------
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setFromLocation('');
      setDateFrom('');
      setDateTo('');
      setAffectedGames([]);
      setSelectedGameIds(new Set());
      setToSelection('');
      setCustomVenue('');
      setResult(null);
    }, 200);
  };

  // ------------------------------------------------------------------
  // Format helpers
  // ------------------------------------------------------------------
  const formatGameDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatGameTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-white/10 max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <MapPin className="w-5 h-5 text-purple-400" />
            Move Games to New Venue
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {result
              ? 'Games have been moved successfully.'
              : 'Select a source venue, review affected games, and choose a destination.'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* ============================================================ */
          /* SUCCESS STATE                                                 */
          /* ============================================================ */
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">
                  {result.moved} game{result.moved !== 1 ? 's' : ''} moved
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {fromLocation} → {toLocation}
                </p>
                {result.failed.length > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    {result.failed.length} game
                    {result.failed.length !== 1 ? 's' : ''} failed to update
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-white"
            >
              Done
            </Button>
          </div>
        ) : (
          /* ============================================================ */
          /* WIZARD STEPS                                                   */
          /* ============================================================ */
          <div className="flex flex-col min-h-0">
            <StepIndicator currentStep={step} />

            <div className="flex-1 overflow-y-auto min-h-0">
              {/* ──────────────────────────────────────────── STEP 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  {locations.length === 0 ? (
                    <div className="text-center py-6">
                      <MapPin className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                      <p className="text-sm text-neutral-400">
                        No venue locations found in the current schedule.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-neutral-300 text-sm">
                          Source venue
                        </Label>
                        <select
                          value={fromLocation}
                          onChange={(e) => setFromLocation(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-sm focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Select venue...</option>
                          {locations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-neutral-300 text-sm">
                            From date
                          </Label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-sm focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-neutral-300 text-sm">
                            To date
                          </Label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-sm focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                      </div>

                      {dateFrom && dateTo && dateFrom > dateTo && (
                        <p className="text-xs text-red-400">
                          Start date must be before or equal to end date.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ──────────────────────────────────────────── STEP 2 */}
              {step === 2 && (
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                      <p className="text-sm text-neutral-400">
                        Finding games at {fromLocation}...
                      </p>
                    </div>
                  ) : affectedGames.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                      <p className="text-sm text-neutral-400">
                        No scheduled or postponed games found at
                        &quot;{fromLocation}&quot; in this date range.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBack}
                        className="mt-3 border-neutral-700 text-neutral-300"
                      >
                        Change filters
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-300">
                          <span className="font-medium text-purple-400">
                            {selectedGameIds.size}
                          </span>{' '}
                          of {affectedGames.length} game
                          {affectedGames.length !== 1 ? 's' : ''} selected
                        </p>
                        <button
                          type="button"
                          onClick={toggleAll}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          {selectedGameIds.size === affectedGames.length
                            ? 'Deselect all'
                            : 'Select all'}
                        </button>
                      </div>

                      <div className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
                        {affectedGames.map((game) => {
                          const isSelected = selectedGameIds.has(game.id);
                          return (
                            <label
                              key={game.id}
                              className={cn(
                                'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border',
                                isSelected
                                  ? 'bg-purple-500/5 border-purple-500/20'
                                  : 'bg-neutral-800/50 border-transparent hover:border-neutral-700'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleGame(game.id)}
                                className="rounded border-neutral-600 bg-neutral-800 text-purple-500 focus:ring-purple-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">
                                  {game.home_team?.name ?? 'TBD'} vs{' '}
                                  {game.away_team?.name ?? 'TBD'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Calendar className="w-3 h-3 text-neutral-500" />
                                  <span className="text-xs text-neutral-400">
                                    {formatGameDate(game.scheduled_at)}{' '}
                                    {formatGameTime(game.scheduled_at)}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-xs px-1.5 py-0.5 rounded',
                                      game.status === 'postponed'
                                        ? 'bg-yellow-500/10 text-yellow-400'
                                        : 'bg-blue-500/10 text-blue-400'
                                    )}
                                  >
                                    {game.status}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ──────────────────────────────────────────── STEP 3 */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-neutral-300 text-sm">
                      Destination venue
                    </Label>
                    <select
                      value={toSelection}
                      onChange={(e) => {
                        setToSelection(e.target.value);
                        setCustomVenue('');
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-sm focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select new venue...</option>
                      {toOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                      <option value="__custom__">Enter custom venue...</option>
                    </select>
                    {toSelection === '__custom__' && (
                      <input
                        type="text"
                        value={customVenue}
                        placeholder="Enter new venue name..."
                        onChange={(e) => setCustomVenue(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-sm focus:ring-purple-500 focus:border-purple-500"
                        autoFocus
                      />
                    )}
                  </div>

                  <p className="text-xs text-neutral-500">
                    All selected games will keep their original date and time
                    slots. Only the venue name changes.
                  </p>
                </div>
              )}

              {/* ──────────────────────────────────────────── STEP 4 */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-neutral-800/50 border border-white/[0.06] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">
                          From
                        </p>
                        <p className="text-sm text-white font-medium mt-0.5">
                          {fromLocation}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">
                          To
                        </p>
                        <p className="text-sm text-white font-medium mt-0.5">
                          {toLocation}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-white/[0.06] pt-3">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider">
                        Games to move
                      </p>
                      <p className="text-lg font-bold text-purple-400 mt-0.5">
                        {selectedGameIds.size}
                      </p>
                    </div>

                    <div className="border-t border-white/[0.06] pt-3">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider">
                        Date range
                      </p>
                      <p className="text-sm text-neutral-300 mt-0.5">
                        {new Date(dateFrom + 'T12:00:00').toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' }
                        )}{' '}
                        &mdash;{' '}
                        {new Date(dateTo + 'T12:00:00').toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400/80">
                      This will update the location for{' '}
                      <strong>{selectedGameIds.size}</strong> game
                      {selectedGameIds.size !== 1 ? 's' : ''}. Game dates and
                      times will not change.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ──────────────────────────────────────────── NAV BUTTONS */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06]">
              <Button
                variant="outline"
                size="sm"
                onClick={step === 1 ? handleClose : handleBack}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>

              {step < 4 ? (
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={!canAdvance(step)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Move {selectedGameIds.size} Game
                      {selectedGameIds.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
