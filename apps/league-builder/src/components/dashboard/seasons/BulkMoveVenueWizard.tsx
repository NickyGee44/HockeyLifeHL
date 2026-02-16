'use client';

/**
 * Bulk Move Venue Wizard
 *
 * Admin selects "Move all games from Rink A → Rink B" → batch update.
 * Since games use a text `location` field (no venue_id FK), this does
 * a string-based search-and-replace across scheduled/postponed games.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { bulkMoveVenue } from '@/lib/actions/games';

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

  const [fromLocation, setFromLocation] = useState('');
  const [toSelection, setToSelection] = useState('');
  const [customVenue, setCustomVenue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ moved: number; failed: string[] } | null>(null);

  const toLocation = toSelection === '__custom__' ? customVenue.trim() : toSelection;

  // Reset toSelection when fromLocation changes
  useEffect(() => {
    setToSelection('');
    setCustomVenue('');
  }, [fromLocation]);

  const canSubmit = fromLocation && toLocation && fromLocation !== toLocation;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    const res = await bulkMoveVenue(leagueId, seasonId, fromLocation, toLocation);

    if (res.success) {
      setResult(res.data);
      toast.success(`${res.data.moved} game${res.data.moved !== 1 ? 's' : ''} moved to ${toLocation}`);
      onGamesMoved();
      router.refresh();
    } else {
      toast.error(res.error);
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFromLocation('');
      setToSelection('');
      setCustomVenue('');
      setResult(null);
    }, 200);
  };

  // Filter out the selected "from" location from "to" options
  const toOptions = locations.filter((l) => l !== fromLocation);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <MapPin className="w-5 h-5 text-purple-400" />
            Move Games to New Venue
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Move all upcoming games from one venue to another.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* SUCCESS STATE */
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
                    {result.failed.length} game{result.failed.length !== 1 ? 's' : ''} failed to update
                  </p>
                )}
              </div>
            </div>

            <Button onClick={handleClose} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white">
              Done
            </Button>
          </div>
        ) : (
          /* FORM STATE */
          <div className="space-y-5 mt-2">
            {locations.length === 0 ? (
              <div className="text-center py-6">
                <MapPin className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                <p className="text-sm text-neutral-400">
                  No venue locations found in the current schedule.
                </p>
              </div>
            ) : (
              <>
                {/* From venue */}
                <div className="space-y-2">
                  <Label className="text-neutral-300 text-sm">Move games from</Label>
                  <select
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-sm focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select current venue...</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Arrow */}
                {fromLocation && (
                  <div className="flex justify-center">
                    <ArrowRight className="w-5 h-5 text-purple-400" />
                  </div>
                )}

                {/* To venue */}
                <div className="space-y-2">
                  <Label className="text-neutral-300 text-sm">Move to</Label>
                  <div className="space-y-2">
                    <select
                      value={toSelection}
                      onChange={(e) => { setToSelection(e.target.value); setCustomVenue(''); }}
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
                </div>

                {/* Warning */}
                {canSubmit && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400/80">
                      This will update the location for all <strong>scheduled and postponed</strong> games
                      currently at &quot;{fromLocation}&quot;. Completed and cancelled games are not affected.
                    </p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Moving games...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Move All Games
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
