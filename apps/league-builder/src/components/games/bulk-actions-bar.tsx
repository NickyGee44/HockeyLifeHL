'use client';

import { useState } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { bulkCancelGames, bulkRescheduleGames } from '@/lib/actions/games';
import { X, XCircle, CalendarClock, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onSuccess,
  className,
}: BulkActionsBarProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-4 px-6 py-3 rounded-2xl',
          'bg-neutral-800/95 backdrop-blur-md border border-gold-500/30',
          'shadow-xl shadow-black/20',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-gold-500 text-black flex items-center justify-center font-bold text-sm">
            {selectedCount}
          </span>
          <span className="text-neutral-300 text-sm">
            game{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="w-px h-8 bg-gold-500/20" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRescheduleModal(true)}
            className="gap-2 border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
          >
            <CalendarClock className="w-4 h-4" />
            Reschedule
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <XCircle className="w-4 h-4" />
            Cancel
          </Button>
        </div>

        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bulk Cancel Modal */}
      <BulkCancelModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        selectedIds={selectedIds}
        onSuccess={() => {
          onClearSelection();
          onSuccess?.();
        }}
      />

      {/* Bulk Reschedule Modal */}
      <BulkRescheduleModal
        open={showRescheduleModal}
        onOpenChange={setShowRescheduleModal}
        selectedIds={selectedIds}
        onSuccess={() => {
          onClearSelection();
          onSuccess?.();
        }}
      />
    </>
  );
}

// Bulk Cancel Modal
function BulkCancelModal({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<{ cancelled: number; failed: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setLoading(true);

    try {
      const response = await bulkCancelGames(selectedIds, reason.trim());

      if (!response.success) {
        toast.error(response.error);
        return;
      }

      setResult(response.data);

      if (response.data.failed.length === 0) {
        toast.success(`Successfully cancelled ${response.data.cancelled} game(s)`);
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to cancel games');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setResult(null);
    onOpenChange(false);
    if (result && result.cancelled > 0) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-800 border-gold-500/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <XCircle className="w-5 h-5 text-red-500" />
            Cancel {selectedIds.length} Game{selectedIds.length !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            This will cancel all selected games. A reason is required for all cancellations.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-neutral-300">
                Cancellation Reason
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter the reason for cancellation..."
                className="bg-neutral-900 border-gold-500/20 text-white focus:ring-gold-500 focus:border-gold-500 min-h-[80px]"
              />
            </div>

            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                <p className="text-xs text-red-400">
                  This action cannot be undone. All {selectedIds.length} game(s) will be permanently cancelled.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !reason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cancel Games
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            {result.cancelled > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-400">
                  Successfully cancelled {result.cancelled} game(s)
                </span>
              </div>
            )}
            {result.failed.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-400 font-medium">
                    Failed to cancel {result.failed.length} game(s)
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Some games could not be cancelled (may already be completed or in progress)
                </p>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose} className="bg-gold-500 text-black hover:bg-gold-600">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Bulk Reschedule Modal
function BulkRescheduleModal({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [dayShift, setDayShift] = useState('7');
  const [result, setResult] = useState<{ rescheduled: number; failed: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const shift = parseInt(dayShift);
    if (isNaN(shift) || shift === 0) {
      toast.error('Please enter a valid number of days');
      return;
    }

    setLoading(true);

    try {
      const response = await bulkRescheduleGames(selectedIds, shift);

      if (!response.success) {
        toast.error(response.error);
        return;
      }

      setResult(response.data);

      if (response.data.failed.length === 0) {
        toast.success(`Successfully rescheduled ${response.data.rescheduled} game(s)`);
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to reschedule games');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDayShift('7');
    setResult(null);
    onOpenChange(false);
    if (result && result.rescheduled > 0) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-800 border-gold-500/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CalendarClock className="w-5 h-5 text-gold-500" />
            Reschedule {selectedIds.length} Game{selectedIds.length !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Shift all selected games by a number of days.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="dayShift" className="text-neutral-300">
                Shift by Days
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="dayShift"
                  type="number"
                  value={dayShift}
                  onChange={(e) => setDayShift(e.target.value)}
                  className="bg-neutral-900 border-gold-500/20 text-white text-center w-24 focus:ring-gold-500 focus:border-gold-500"
                />
                <span className="text-neutral-400 text-sm">
                  {parseInt(dayShift) > 0 ? 'days later' : parseInt(dayShift) < 0 ? 'days earlier' : 'days'}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Use positive numbers to move games later, negative to move earlier
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[1, 7, 14, -1, -7].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDayShift(days.toString())}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    dayShift === days.toString()
                      ? 'bg-gold-500/20 text-gold-500 border border-gold-500/40'
                      : 'bg-neutral-900 text-neutral-400 border border-gold-500/10 hover:border-gold-500/30'
                  )}
                >
                  {days > 0 ? `+${days}` : days} day{Math.abs(days) !== 1 ? 's' : ''}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-gold-500/5 border border-gold-500/20">
              <p className="text-xs text-gold-400">
                All games will be marked as rescheduled and their original dates will be preserved.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !dayShift || parseInt(dayShift) === 0}
                className="bg-gradient-to-r from-gold-500 to-gold-600 text-black hover:shadow-lg hover:shadow-gold-500/20"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reschedule Games
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 mt-4">
            {result.rescheduled > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-400">
                  Successfully rescheduled {result.rescheduled} game(s)
                </span>
              </div>
            )}
            {result.failed.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-400 font-medium">
                    Failed to reschedule {result.failed.length} game(s)
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Some games could not be rescheduled (may be completed, cancelled, or in progress)
                </p>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose} className="bg-gold-500 text-black hover:bg-gold-600">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
