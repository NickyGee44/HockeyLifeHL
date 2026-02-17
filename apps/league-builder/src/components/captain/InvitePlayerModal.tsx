'use client';

import { useState, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { sendTeamInvite } from '@/lib/actions/team-invites';

interface InvitePlayerModalProps {
  teamId: string;
  seasonId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InvitePlayerModal({
  teamId,
  seasonId,
  open,
  onOpenChange,
  onSuccess,
}: InvitePlayerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setEmail('');
      setMessage('');
      setError(null);
      setSuccessMessage(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await sendTeamInvite(
        teamId,
        seasonId,
        email.trim(),
        message.trim() || undefined
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Show success feedback
      if (result.alreadyHasAccount) {
        setSuccessMessage('Player already has account — added to roster directly!');
      } else {
        setSuccessMessage('Invite sent!');
      }

      // Close after brief delay so user sees the success message
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 1500);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-rink-500" />
            Invite Player
          </DialogTitle>
          <DialogDescription>
            Send an invite to a player by email to join your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Email (required) */}
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-neutral-300">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                required
                autoFocus
                className="bg-neutral-800 border-neutral-700 text-white"
              />
            </div>

            {/* Message (optional) */}
            <div className="space-y-2">
              <Label htmlFor="invite-message" className="text-neutral-300">
                Message
              </Label>
              <textarea
                id="invite-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
                className={cn(
                  'w-full px-3 py-2 rounded-md text-sm',
                  'bg-neutral-800 border border-neutral-700 text-white',
                  'placeholder:text-neutral-500',
                  'focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent',
                  'resize-none'
                )}
              />
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                {successMessage}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !email.trim() || !!successMessage}
              className={cn(
                'bg-gradient-to-r from-rink-500 to-rink-600 text-black font-semibold',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
