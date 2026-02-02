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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Game } from '@/lib/actions/games';
import { cancelGame, postponeGame } from '@/lib/actions/games';
import { format } from 'date-fns';
import { AlertTriangle, XCircle, PauseCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CancelGameModalProps {
  game: Game;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (game: Game) => void;
}

const cancelReasonSuggestions = [
  'Weather conditions',
  'Venue unavailable',
  'Insufficient players',
  'Team forfeit',
  'Scheduling conflict',
  'Ice conditions',
  'Other',
];

export function CancelGameModal({
  game,
  open,
  onOpenChange,
  onSuccess,
}: CancelGameModalProps) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<'cancel' | 'postpone'>('cancel');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  const reason = selectedReason === 'Other' ? customReason : selectedReason;
  const isValid = reason.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      toast.error('Please provide a reason');
      return;
    }

    setLoading(true);

    try {
      const result =
        actionType === 'cancel'
          ? await cancelGame(game.id, reason.trim())
          : await postponeGame(game.id, reason.trim());

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        actionType === 'cancel'
          ? 'Game cancelled successfully'
          : 'Game postponed successfully'
      );
      onSuccess?.(result.data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Failed to ${actionType} game`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActionType('cancel');
    setSelectedReason('');
    setCustomReason('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="bg-neutral-800 border-gold-500/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Cancel or Postpone Game
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            This action will affect the schedule. A reason is required for record keeping.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Game Info */}
          <div className="p-4 rounded-xl bg-neutral-900/50 border border-gold-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: game.home_team?.primary_color || '#D4AF37' }}
                />
                <span className="font-medium text-white text-sm">
                  {game.home_team?.short_name || game.home_team?.name}
                </span>
              </div>
              <span className="text-neutral-500 font-medium text-sm">vs</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">
                  {game.away_team?.short_name || game.away_team?.name}
                </span>
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: game.away_team?.primary_color || '#3B82F6' }}
                />
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-2 text-center">
              {format(new Date(game.scheduled_at), 'EEEE, MMMM d, yyyy at h:mm a')}
            </p>
          </div>

          {/* Action Type */}
          <div className="space-y-3">
            <Label className="text-neutral-300">Action</Label>
            <RadioGroup
              value={actionType}
              onValueChange={(v) => setActionType(v as 'cancel' | 'postpone')}
              className="grid grid-cols-2 gap-3"
            >
              <label
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  actionType === 'cancel'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-neutral-900 border-gold-500/10 hover:border-gold-500/30'
                )}
              >
                <RadioGroupItem value="cancel" className="border-red-500 text-red-500" />
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <div>
                    <span className="font-medium text-white text-sm block">Cancel</span>
                    <span className="text-xs text-neutral-500">Remove from schedule</span>
                  </div>
                </div>
              </label>
              <label
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  actionType === 'postpone'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-neutral-900 border-gold-500/10 hover:border-gold-500/30'
                )}
              >
                <RadioGroupItem value="postpone" className="border-yellow-500 text-yellow-500" />
                <div className="flex items-center gap-2">
                  <PauseCircle className="w-4 h-4 text-yellow-500" />
                  <div>
                    <span className="font-medium text-white text-sm block">Postpone</span>
                    <span className="text-xs text-neutral-500">Reschedule later</span>
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <Label className="text-neutral-300">Reason</Label>
            <div className="flex flex-wrap gap-2">
              {cancelReasonSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setSelectedReason(suggestion)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedReason === suggestion
                      ? 'bg-gold-500/20 text-gold-500 border border-gold-500/40'
                      : 'bg-neutral-900 text-neutral-400 border border-gold-500/10 hover:border-gold-500/30'
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Reason */}
          {selectedReason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="customReason" className="text-neutral-300">
                Custom Reason
              </Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter the reason for cancellation or postponement..."
                className="bg-neutral-900 border-gold-500/20 text-white focus:ring-gold-500 focus:border-gold-500 min-h-[80px]"
              />
            </div>
          )}

          {/* Warning */}
          <div
            className={cn(
              'p-3 rounded-lg border',
              actionType === 'cancel'
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-yellow-500/5 border-yellow-500/20'
            )}
          >
            <p className={cn('text-xs', actionType === 'cancel' ? 'text-red-400' : 'text-yellow-400')}>
              {actionType === 'cancel'
                ? 'Cancelling this game will permanently remove it from the schedule. This action cannot be undone.'
                : 'Postponing this game will keep it in the schedule with a postponed status. You can reschedule it later.'}
            </p>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
            >
              Keep Game
            </Button>
            <Button
              type="submit"
              disabled={loading || !isValid}
              className={cn(
                'text-white',
                actionType === 'cancel'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              )}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === 'cancel' ? 'Cancel Game' : 'Postpone Game'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
