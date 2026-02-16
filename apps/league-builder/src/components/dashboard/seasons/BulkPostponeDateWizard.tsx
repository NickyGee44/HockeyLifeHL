'use client';

/**
 * Bulk Postpone by Date Wizard
 *
 * Simple wizard: pick a date → see affected games → confirm → postpone all + notify players.
 * Designed for weather cancellations where an entire night of games is wiped.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Snowflake, Loader2, CheckCircle, Mail, AlertTriangle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { bulkPostponeByDate } from '@/lib/actions/games';

// ============================================================================
// TYPES
// ============================================================================

interface BulkPostponeDateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  onGamesPostponed: () => void;
}

type ReasonPreset = 'weather' | 'facility' | 'other';

const REASON_PRESETS: { key: ReasonPreset; label: string; value: string }[] = [
  { key: 'weather', label: 'Weather / Ice Conditions', value: 'Weather cancellation — unsafe ice or travel conditions' },
  { key: 'facility', label: 'Facility Issue', value: 'Facility closure — arena unavailable' },
  { key: 'other', label: 'Other', value: '' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkPostponeDateWizard({
  open,
  onOpenChange,
  leagueId,
  onGamesPostponed,
}: BulkPostponeDateWizardProps) {
  const router = useRouter();

  const [date, setDate] = useState('');
  const [reasonPreset, setReasonPreset] = useState<ReasonPreset | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [sendNotifications, setSendNotifications] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    postponed: number;
    failed: string[];
    notified: number;
  } | null>(null);

  const reason =
    reasonPreset === 'other'
      ? customReason.trim()
      : REASON_PRESETS.find((p) => p.key === reasonPreset)?.value || '';

  const canSubmit = date && reason;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    const res = await bulkPostponeByDate(leagueId, date, reason, sendNotifications);

    if (res.success) {
      setResult(res.data);
      toast.success(`${res.data.postponed} game${res.data.postponed !== 1 ? 's' : ''} postponed`);
      onGamesPostponed();
      router.refresh();
    } else {
      toast.error(res.error);
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setDate('');
      setReasonPreset(null);
      setCustomReason('');
      setSendNotifications(true);
      setResult(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Snowflake className="w-5 h-5 text-blue-400" />
            Weather Cancellation
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Postpone all games on a specific date and notify affected players.
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
                  {result.postponed} game{result.postponed !== 1 ? 's' : ''} postponed
                </p>
                {result.failed.length > 0 && (
                  <p className="text-xs text-yellow-400 mt-1">
                    {result.failed.length} game{result.failed.length !== 1 ? 's' : ''} failed
                  </p>
                )}
              </div>
            </div>

            {result.notified > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-sm text-blue-300">
                  {result.notified} player{result.notified !== 1 ? 's' : ''} notified via email
                </p>
              </div>
            )}

            <p className="text-xs text-neutral-500">
              Use &quot;Manage Cancellations&quot; to reschedule these games to new dates.
            </p>

            <Button onClick={handleClose} className="w-full bg-neutral-700 hover:bg-neutral-600 text-white">
              Done
            </Button>
          </div>
        ) : (
          /* ============================================================ */
          /* FORM STATE                                                    */
          /* ============================================================ */
          <div className="space-y-5 mt-2">
            {/* Date picker */}
            <div className="space-y-2">
              <Label className="text-neutral-300 text-sm">Date to cancel</Label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-white/10 text-white text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Reason presets */}
            <div className="space-y-2">
              <Label className="text-neutral-300 text-sm">Reason</Label>
              <div className="flex flex-wrap gap-2">
                {REASON_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setReasonPreset(preset.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      reasonPreset === preset.key
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-neutral-800 text-neutral-400 border border-white/[0.06] hover:border-blue-500/30'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {reasonPreset === 'other' && (
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter reason for postponement..."
                className="bg-neutral-800 border-white/10 text-white text-sm min-h-[60px]"
              />
            )}

            {/* Notification toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50 border border-white/[0.06] cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotifications}
                onChange={(e) => setSendNotifications(e.target.checked)}
                className="rounded border-neutral-600 bg-neutral-800 text-blue-500 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm text-neutral-300">Notify affected players</p>
                <p className="text-xs text-neutral-500">Send email to all players on affected teams</p>
              </div>
            </label>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">
                This will postpone <strong>all scheduled games</strong> on {date || 'the selected date'}.
                Postponed games can be rescheduled later via &quot;Manage Cancellations&quot;.
              </p>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Postponing games...
                </>
              ) : (
                <>
                  <Snowflake className="w-4 h-4 mr-2" />
                  Postpone All Games on This Date
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
