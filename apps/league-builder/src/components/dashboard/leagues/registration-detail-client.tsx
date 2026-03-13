'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  User,
  AlertTriangle,
  Trophy,
  Target,
  FileCheck,
  CreditCard,
  Landmark,
  Check,
  X,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  approveRegistration,
  rejectRegistration,
} from '@/lib/actions/player-registration';
import {
  formatRegistrationType,
  formatSkillLevel,
  formatPosition,
  formatRelationship,
} from '@/lib/schemas/player-registration';
import { cn } from '@hockey-life/ui/lib/utils';
import { ManualRegistrationPaymentDialog } from './ManualRegistrationPaymentDialog';

interface Registration {
  id: string;
  player_id: string;
  league_id: string;
  season_id: string;
  team_id: string | null;
  registration_type: string;
  draft_data?: {
    registration_intent?: string | null;
    requested_team_name?: string | null;
    previous_team_name?: string | null;
    team_return_status?: string | null;
  } | null;
  status: string;
  preferred_position: string | null;
  secondary_position: string | null;
  preferred_jersey_number: number | null;
  self_assessed_skill: string | null;
  years_experience: number | null;
  previous_leagues: string | null;
  photo_url: string | null;
  payment_status: string;
  fee_amount_cents: number | null;
  amount_paid_cents: number;
  currency: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  submitted_at: string | null;
  player: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
    medical_notes?: string;
  };
  team: {
    id: string;
    name: string;
  } | null;
  waiver: {
    id: string;
    signed_name: string;
    agreed_at: string;
    signature_data?: string;
  } | null;
}

interface RegistrationDetailClientProps {
  registration: Registration;
  leagueId: string;
  teams: { id: string; name: string }[];
}

function formatRegistrationIntent(intent?: string | null): string {
  switch (intent) {
    case 'return_to_previous_team':
      return 'Returning to previous team';
    case 'join_team':
      return 'Joining a team';
    case 'captain_application':
      return 'Captain / team application';
    case 'free_agent':
      return 'Free agent';
    default:
      return 'Standard registration';
  }
}

function formatTeamReturnStatus(status?: string | null): string {
  switch (status) {
    case 'confirmed':
      return 'Team is confirmed for this season';
    case 'pending_team_return':
      return 'Waiting on the team to confirm for this season';
    case 'team_not_returning':
      return 'That team is marked as not returning for this season';
    case 'new_team_request':
      return 'Waiting on team/captain approval';
    default:
      return '-';
  }
}

function getOutstandingBalanceCents(registration: Registration) {
  return Math.max(
    0,
    (registration.fee_amount_cents || 0) - (registration.amount_paid_cents || 0)
  );
}

function canRecordOfflinePayment(registration: Registration) {
  return (
    registration.payment_status !== 'not_required' &&
    getOutstandingBalanceCents(registration) > 0 &&
    !['rejected', 'cancelled'].includes(registration.status)
  );
}

function formatMoney(amountCents: number, currency: string | null) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  }).format(amountCents / 100);
}

function getPaymentStatusLabel(registration: Registration) {
  if (registration.payment_status === 'pending' && registration.amount_paid_cents > 0) {
    return 'Partial';
  }

  if (registration.payment_status === 'completed') {
    return 'Paid';
  }

  if (registration.payment_status === 'not_required') {
    return 'Not required';
  }

  if (registration.payment_status === 'failed') {
    return 'Failed';
  }

  if (registration.payment_status === 'refunded') {
    return 'Refunded';
  }

  return 'Pending';
}

export function RegistrationDetailClient({
  registration,
  teams,
}: RegistrationDetailClientProps) {
  const router = useRouter();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Approval form state
  const [assignedTeamId, setAssignedTeamId] = useState<string | undefined>(
    registration.team_id || undefined
  );
  const [assignedJerseyNumber, setAssignedJerseyNumber] = useState<
    number | undefined
  >(registration.preferred_jersey_number || undefined);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Rejection form state
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setProcessing(true);
    const result = await approveRegistration(registration.id, {
      teamId: assignedTeamId,
      jerseyNumber: assignedJerseyNumber,
      notes: approvalNotes,
    });
    setProcessing(false);

    if (result.success) {
      toast.success('Registration approved');
      setShowApproveDialog(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    const result = await rejectRegistration(registration.id, rejectionReason);
    setProcessing(false);

    if (result.success) {
      toast.success('Registration rejected');
      setShowRejectDialog(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const isPending = registration.status === 'pending';
  const outstandingCents = getOutstandingBalanceCents(registration);
  const canRecordPayment = canRecordOfflinePayment(registration);
  const paymentStatusLabel = getPaymentStatusLabel(registration);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            <img
              src={registration.photo_url || '/blank_player.png'}
              alt={registration.player.full_name}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">
              {registration.player.full_name}
            </h1>
            <p className="text-neutral-400">{registration.player.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={registration.status} />
              <span className="text-sm text-neutral-500">
                {formatRegistrationType(registration.registration_type as any)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {canRecordPayment && (
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(true)}
              className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
            >
              <Landmark className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          )}
          {isPending && (
            <>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button onClick={() => setShowApproveDialog(true)}>
              <Check className="w-4 h-4 mr-2" />
              Approve
            </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <InfoCard
          icon={User}
          title="Personal Information"
          iconColor="text-blue-400"
        >
          <InfoRow label="Full Name" value={registration.player.full_name} />
          <InfoRow label="Email" value={registration.player.email} />
          {registration.player.phone && (
            <InfoRow label="Phone" value={registration.player.phone} />
          )}
          {registration.submitted_at && (
            <InfoRow
              label="Submitted"
              value={new Date(registration.submitted_at).toLocaleString()}
            />
          )}
        </InfoCard>

        {/* Emergency Contact */}
        <InfoCard
          icon={AlertTriangle}
          title="Emergency Contact"
          iconColor="text-amber-400"
        >
          <InfoRow
            label="Name"
            value={registration.player.emergency_contact_name || '-'}
          />
          <InfoRow
            label="Phone"
            value={registration.player.emergency_contact_phone || '-'}
          />
          <InfoRow
            label="Relationship"
            value={
              registration.player.emergency_contact_relationship
                ? formatRelationship(
                    registration.player.emergency_contact_relationship as any
                  )
                : '-'
            }
          />
          {registration.player.medical_notes && (
            <div className="mt-3 pt-3 border-t border-neutral-700">
              <p className="text-xs text-neutral-500 mb-1">Medical Notes</p>
              <p className="text-sm text-neutral-300">
                {registration.player.medical_notes}
              </p>
            </div>
          )}
        </InfoCard>

        {/* Skill Assessment */}
        <InfoCard icon={Trophy} title="Skill Assessment" iconColor="text-rink-500">
          <InfoRow
            label="Skill Level"
            value={
              registration.self_assessed_skill
                ? formatSkillLevel(registration.self_assessed_skill as any)
                : '-'
            }
          />
          <InfoRow
            label="Primary Position"
            value={
              registration.preferred_position
                ? formatPosition(registration.preferred_position as any)
                : '-'
            }
          />
          <InfoRow
            label="Secondary Position"
            value={
              registration.secondary_position
                ? formatPosition(registration.secondary_position as any)
                : '-'
            }
          />
          <InfoRow
            label="Years Experience"
            value={
              registration.years_experience !== null
                ? `${registration.years_experience} years`
                : '-'
            }
          />
          {registration.previous_leagues && (
            <div className="mt-3 pt-3 border-t border-neutral-700">
              <p className="text-xs text-neutral-500 mb-1">Previous Leagues</p>
              <p className="text-sm text-neutral-300">
                {registration.previous_leagues}
              </p>
            </div>
          )}
        </InfoCard>

        {/* Preferences */}
        <InfoCard icon={Target} title="Preferences" iconColor="text-green-400">
          <InfoRow
            label="Registration Path"
            value={formatRegistrationIntent(registration.draft_data?.registration_intent)}
          />
          <InfoRow
            label="Preferred Team"
            value={
              registration.team?.name ||
              registration.draft_data?.requested_team_name ||
              registration.draft_data?.previous_team_name ||
              'None selected'
            }
          />
          <InfoRow
            label="Team Status"
            value={formatTeamReturnStatus(registration.draft_data?.team_return_status)}
          />
          <InfoRow
            label="Preferred Jersey #"
            value={
              registration.preferred_jersey_number
                ? `#${registration.preferred_jersey_number}`
                : '-'
            }
          />
        </InfoCard>

        {/* Waiver Status */}
        <InfoCard icon={FileCheck} title="Waiver" iconColor="text-purple-400">
          {registration.waiver ? (
            <>
              <InfoRow
                label="Signed As"
                value={registration.waiver.signed_name}
              />
              <InfoRow
                label="Signed At"
                value={new Date(registration.waiver.agreed_at).toLocaleString()}
              />
              <div className="mt-3 pt-3 border-t border-neutral-700">
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Waiver signed and accepted
                </p>
              </div>
            </>
          ) : (
            <p className="text-neutral-400 text-sm">No waiver on file</p>
          )}
        </InfoCard>

        {/* Payment Status */}
        <InfoCard icon={CreditCard} title="Payment" iconColor="text-cyan-400">
          <InfoRow label="Status" value={paymentStatusLabel} />
          {registration.fee_amount_cents !== null && registration.fee_amount_cents > 0 && (
            <InfoRow
              label="Total Fee"
              value={formatMoney(registration.fee_amount_cents, registration.currency)}
            />
          )}
          {registration.amount_paid_cents > 0 && (
            <InfoRow
              label="Amount Paid"
              value={formatMoney(registration.amount_paid_cents, registration.currency)}
            />
          )}
          {registration.fee_amount_cents !== null && registration.fee_amount_cents > 0 && (
            <InfoRow
              label="Outstanding"
              value={formatMoney(outstandingCents, registration.currency)}
            />
          )}
          {canRecordPayment && (
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(true)}
              className="mt-3 w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
            >
              <Landmark className="w-4 h-4 mr-2" />
              Record Offline Payment
            </Button>
          )}
        </InfoCard>
      </div>

      {/* Review History (if reviewed) */}
      {registration.reviewed_at && (
        <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/30">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            Review History
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-neutral-400">
              Reviewed on{' '}
              <span className="text-white">
                {new Date(registration.reviewed_at).toLocaleString()}
              </span>
            </p>
            {registration.review_notes && (
              <p className="text-neutral-400">
                Notes:{' '}
                <span className="text-white">{registration.review_notes}</span>
              </p>
            )}
            {registration.rejection_reason && (
              <p className="text-red-400">
                Rejection reason: {registration.rejection_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Approve Registration
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Team Assignment */}
            <div className="space-y-2">
              <Label className="text-white">Assign to Team (Optional)</Label>
              <Select
                value={assignedTeamId || ''}
                onValueChange={(v) => setAssignedTeamId(v || undefined)}
              >
                <SelectTrigger className="bg-neutral-800 border-neutral-700">
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No team assignment</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jersey Number */}
            <div className="space-y-2">
              <Label className="text-white">
                Assign Jersey Number (Optional)
              </Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={assignedJerseyNumber || ''}
                onChange={(e) =>
                  setAssignedJerseyNumber(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                placeholder={
                  registration.preferred_jersey_number
                    ? `Player requested #${registration.preferred_jersey_number}`
                    : 'Enter jersey number'
                }
                className="bg-neutral-800 border-neutral-700"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-white">Notes (Optional)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                className="bg-neutral-800 border-neutral-700 resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Approve Registration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Registration</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">
                Rejection Reason <span className="text-red-400">*</span>
              </Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                className="bg-neutral-800 border-neutral-700 resize-none"
                rows={4}
              />
              <p className="text-xs text-neutral-500">
                This reason will be included in the rejection email sent to the
                player.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Reject Registration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManualRegistrationPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        registration={registration}
        onSaved={() => {
          setShowPaymentDialog(false);
          router.refresh();
        }}
      />
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending' },
    approved: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      label: 'Approved',
    },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
    waitlisted: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      label: 'Waitlisted',
    },
    cancelled: {
      bg: 'bg-neutral-500/20',
      text: 'text-neutral-400',
      label: 'Cancelled',
    },
  }[status] || { bg: 'bg-neutral-500/20', text: 'text-neutral-400', label: status };

  return (
    <span
      className={cn(
        'inline-flex px-3 py-1 rounded-full text-sm font-medium',
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
}

// Info Card Component
interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}

function InfoCard({ icon: Icon, title, iconColor, children }: InfoCardProps) {
  return (
    <div className="p-4 rounded-xl border border-neutral-700 bg-neutral-800/30">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn('w-4 h-4', iconColor)} />
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// Info Row Component
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
