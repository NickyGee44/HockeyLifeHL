'use client';

import { useState } from 'react';
import { cn } from '@hockey-life/ui';
import { Check, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from '@/components/ui/select';
import type { TeamRegistrationRequestWithDetails } from '@/lib/actions/team-registration-requests';

interface Division {
  id: string;
  name: string;
}

interface TeamApprovalModalProps {
  request: TeamRegistrationRequestWithDetails | null;
  divisions: Division[];
  isOpen: boolean;
  onClose: () => void;
  onApprove: (params: { requestId: string; assignedDivisionId?: string; adminNotes?: string }) => Promise<void>;
  isProcessing?: boolean;
}

export function TeamApprovalModal({
  request,
  divisions,
  isOpen,
  onClose,
  onApprove,
  isProcessing = false }: TeamApprovalModalProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');

  // Reset state when request changes
  const requestedDivision = request?.requested_division as { id: string; name: string } | null | undefined;

  const handleApprove = async () => {
    if (!request) return;

    await onApprove({
      requestId: request.id,
      assignedDivisionId: selectedDivision || request.requested_division_id || undefined,
      adminNotes: adminNotes.trim() || undefined });

    // Reset state
    setSelectedDivision('');
    setAdminNotes('');
  };

  const handleClose = () => {
    setSelectedDivision('');
    setAdminNotes('');
    onClose();
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Approve Team Registration
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Approve <span className="text-white font-medium">{request.team_name}</span> to join the league.
            This will create the team and make the requester the team captain.
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
              <p className="text-sm text-neutral-400">{request.team_short_name}</p>
            </div>
          </div>

          {/* Division Selection */}
          <div className="space-y-2">
            <Label htmlFor="division" className="text-neutral-300">
              Assign to Division
            </Label>
            {requestedDivision && (
              <p className="text-xs text-neutral-500 mb-2">
                Requested: <span className="text-rink-500">{requestedDivision.name}</span>
              </p>
            )}
            <Select
              value={selectedDivision || request.requested_division_id || ''}
              onValueChange={setSelectedDivision}
            >
              <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                <SelectValue placeholder="Select a division" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                {divisions.length > 0 ? (
                  divisions.map((division) => (
                    <SelectItem
                      key={division.id}
                      value={division.id}
                      className="text-white hover:bg-neutral-700"
                    >
                      {division.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled className="text-neutral-500">
                    No divisions available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {divisions.length === 0 && (
              <p className="text-xs text-yellow-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Create divisions first or team will be unassigned
              </p>
            )}
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
              placeholder="Internal notes about this approval..."
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 resize-none"
              rows={3}
            />
            <p className="text-xs text-neutral-500">
              These notes are for internal use only and will not be shown to the team.
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
            onClick={handleApprove}
            disabled={isProcessing}
            className={cn(
              'bg-green-500 text-white hover:bg-green-600',
              isProcessing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Approving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Approve & Create Team
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TeamApprovalModal;
