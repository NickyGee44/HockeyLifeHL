'use client';

import { useState } from 'react';
import { cn } from '@hockey-life/ui';
import { X, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TeamRegistrationRequestWithDetails } from '@/lib/actions/team-registration-requests';

interface TeamDenialModalProps {
  request: TeamRegistrationRequestWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onDeny: (params: { requestId: string; denialReason: string; adminNotes?: string }) => Promise<void>;
  isProcessing?: boolean;
}

export function TeamDenialModal({
  request,
  isOpen,
  onClose,
  onDeny,
  isProcessing = false,
}: TeamDenialModalProps) {
  const [denialReason, setDenialReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');

  const handleDeny = async () => {
    if (!request) return;

    if (!denialReason.trim()) {
      setError('Please provide a reason for denying this request.');
      return;
    }

    setError('');
    await onDeny({
      requestId: request.id,
      denialReason: denialReason.trim(),
      adminNotes: adminNotes.trim() || undefined,
    });

    // Reset state
    setDenialReason('');
    setAdminNotes('');
  };

  const handleClose = () => {
    setDenialReason('');
    setAdminNotes('');
    setError('');
    onClose();
  };

  if (!request) return null;

  const commonReasons = [
    'Team name conflicts with an existing team',
    'Incomplete team information provided',
    'League roster is full for this season',
    'Does not meet league eligibility requirements',
    'Division requested is not accepting new teams',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <X className="w-5 h-5" />
            Deny Team Registration
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Deny the registration request for <span className="text-white font-medium">{request.team_name}</span>.
            Please provide a reason that will be shared with the requester.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Team Preview */}
          <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: request.team_primary_color || '#22D3EE' }}
            >
              {request.team_short_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{request.team_name}</p>
              <p className="text-sm text-neutral-400">
                Requested by {(request.requester as any)?.full_name || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Denial Reason */}
          <div className="space-y-2">
            <Label htmlFor="denialReason" className="text-neutral-300">
              Reason for Denial <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="denialReason"
              value={denialReason}
              onChange={(e) => {
                setDenialReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Explain why this request is being denied..."
              className={cn(
                'bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 resize-none',
                error && 'border-red-500'
              )}
              rows={3}
            />
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            )}
            <p className="text-xs text-neutral-500">
              This reason will be shown to the requester in their notification email.
            </p>
          </div>

          {/* Common Reasons */}
          <div className="space-y-2">
            <Label className="text-neutral-300 text-xs">Common Reasons</Label>
            <div className="flex flex-wrap gap-2">
              {commonReasons.map((reason, index) => (
                <button
                  key={index}
                  onClick={() => setDenialReason(reason)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-full border transition-colors',
                    denialReason === reason
                      ? 'bg-rink-500/20 text-rink-500 border-rink-500/30'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-600'
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="adminNotes" className="text-neutral-300">
              Admin Notes (Optional)
            </Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this denial..."
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 resize-none"
              rows={2}
            />
            <p className="text-xs text-neutral-500">
              These notes are for internal use only and will not be shown to the requester.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeny}
            disabled={isProcessing || !denialReason.trim()}
            className={cn(
              'bg-red-500 text-white hover:bg-red-600',
              (isProcessing || !denialReason.trim()) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Denying...
              </>
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Deny Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TeamDenialModal;
