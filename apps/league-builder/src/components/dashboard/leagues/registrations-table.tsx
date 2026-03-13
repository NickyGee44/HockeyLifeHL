'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Check,
  X,
  Clock,
  Eye,
  User,
  CreditCard,
  Landmark,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Trophy,
  Target,
  FileCheck,
  AlertTriangle,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';
import { Button, ResponsiveTable } from '@hockey-life/ui';
import {
  approveRegistration,
  rejectRegistration,
  waitlistRegistration,
  bulkUpdateRegistrations,
} from '@/lib/actions/player-registration';
import { formatRegistrationType, formatSkillLevel, formatPosition } from '@/lib/schemas/player-registration';
import { cn } from '@hockey-life/ui/lib/utils';
import { ManualRegistrationPaymentDialog } from './ManualRegistrationPaymentDialog';

interface Registration {
  id: string;
  player_id: string;
  registration_type: string;
  draft_data?: {
    registration_intent?: string | null;
    requested_team_name?: string | null;
    previous_team_name?: string | null;
    team_return_status?: string | null;
    date_of_birth?: string | null;
    phone?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
    medical_notes?: string | null;
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
  created_at: string;
  submitted_at: string | null;
  player: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;
    photo_url?: string | null;
  };
  team: {
    id: string;
    name: string;
  } | null;
  waiver: {
    id: string;
    signed_name: string;
    agreed_at: string;
  } | null;
}

type SortField = 'name' | 'email' | 'position' | 'skill' | 'team' | 'waiver' | 'payment' | 'status' | 'submitted';
type SortDirection = 'asc' | 'desc';

interface RegistrationsTableProps {
  registrations: Registration[];
  leagueId: string;
}

function formatRegistrationIntent(intent?: string | null): string {
  switch (intent) {
    case 'return_to_previous_team':
      return 'Returning player';
    case 'join_team':
      return 'Joining team';
    case 'captain_application':
      return 'Captain application';
    case 'free_agent':
      return 'Free agent';
    default:
      return '';
  }
}

function formatTeamReturnStatus(status?: string | null): string {
  switch (status) {
    case 'confirmed':
      return 'Team confirmed';
    case 'pending_team_return':
      return 'Waiting on team return';
    case 'team_not_returning':
      return 'Team not returning';
    case 'new_team_request':
      return 'Waiting on new team approval';
    default:
      return '';
  }
}

function getRequestedTeamLabel(reg: Registration): string | null {
  return reg.team?.name || reg.draft_data?.requested_team_name || null;
}

function getPreviousTeamLabel(reg: Registration): string | null {
  return reg.draft_data?.previous_team_name || null;
}

function getRegistrationAvatarUrl(reg: Registration): string {
  return reg.photo_url || reg.player.avatar_url || reg.player.photo_url || '/blank_player.png';
}

function getEmergencyContactSummary(reg: Registration): string | null {
  const name = reg.draft_data?.emergency_contact_name || null;
  const phone = reg.draft_data?.emergency_contact_phone || null;

  if (!name && !phone) return null;
  if (name && phone) return `${name} • ${phone}`;
  return name || phone;
}

function getSortValue(reg: Registration, field: SortField): string | number {
  switch (field) {
    case 'name': return reg.player.full_name.toLowerCase();
    case 'email': return reg.player.email.toLowerCase();
    case 'position': return (reg.preferred_position || '').toLowerCase();
    case 'skill': {
      const order = { expert: 4, advanced: 3, intermediate: 2, beginner: 1 };
      return order[reg.self_assessed_skill as keyof typeof order] || 0;
    }
    case 'team': return (reg.team?.name || '').toLowerCase();
    case 'waiver': return reg.waiver ? 1 : 0;
    case 'payment': return reg.payment_status;
    case 'status': return reg.status;
    case 'submitted': return reg.submitted_at || '';
    default: return '';
  }
}

function getOutstandingBalanceCents(reg: Registration) {
  return Math.max(0, (reg.fee_amount_cents || 0) - (reg.amount_paid_cents || 0));
}

function canRecordOfflinePayment(reg: Registration) {
  return (
    reg.payment_status !== 'not_required' &&
    getOutstandingBalanceCents(reg) > 0 &&
    !['rejected', 'cancelled'].includes(reg.status)
  );
}

function getPaymentBadgeModel(reg: Registration) {
  if (reg.payment_status === 'pending' && reg.amount_paid_cents > 0) {
    return {
      status: 'partial',
      label: 'Partial',
      detail: `$${(reg.amount_paid_cents / 100).toFixed(2)} received`,
    };
  }

  if (reg.payment_status === 'completed') {
    return {
      status: 'completed',
      label: 'Paid',
      detail:
        reg.amount_paid_cents > 0
          ? `$${(reg.amount_paid_cents / 100).toFixed(2)} received`
          : undefined,
    };
  }

  if (reg.payment_status === 'pending' && canRecordOfflinePayment(reg)) {
    return {
      status: 'pending',
      label: 'Pending',
      detail: `$${(getOutstandingBalanceCents(reg) / 100).toFixed(2)} due`,
    };
  }

  if (reg.payment_status === 'refunded') {
    return { status: 'refunded', label: 'Refunded', detail: undefined };
  }

  if (reg.payment_status === 'failed') {
    return { status: 'failed', label: 'Failed', detail: undefined };
  }

  if (reg.payment_status === 'not_required') {
    return { status: 'not_required', label: 'N/A', detail: undefined };
  }

  return { status: reg.payment_status, label: reg.payment_status, detail: undefined };
}

export function RegistrationsTable({
  registrations,
  leagueId,
}: RegistrationsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('submitted');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [paymentTarget, setPaymentTarget] = useState<Registration | null>(null);

  const sortedRegistrations = useMemo(() => {
    return [...registrations].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [registrations, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(registrations.filter(r => r.status === 'pending').map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const result = await approveRegistration(id);
    setProcessingId(null);

    if (result.success) {
      toast.success('Registration approved');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Enter rejection reason (optional):');

    setProcessingId(id);
    const result = await rejectRegistration(id, reason || 'Registration rejected');
    setProcessingId(null);

    if (result.success) {
      toast.success('Registration rejected');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleWaitlist = async (id: string) => {
    setProcessingId(id);
    const result = await waitlistRegistration(id);
    setProcessingId(null);

    if (result.success) {
      toast.success('Registration moved to waitlist');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'waitlist') => {
    if (selectedIds.length === 0) {
      toast.error('No registrations selected');
      return;
    }

    const result = await bulkUpdateRegistrations(selectedIds, action);

    if (result.success) {
      toast.success(`${result.data?.updated} registrations updated`);
      setSelectedIds([]);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const pendingRegistrations = registrations.filter(r => r.status === 'pending');
  const allPendingSelected = pendingRegistrations.length > 0 &&
    pendingRegistrations.every((r) => selectedIds.includes(r.id));

  if (registrations.length === 0) {
    return (
      <div className="text-center py-12 border border-neutral-700 rounded-xl bg-neutral-800/30">
        <User className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          No Registrations Found
        </h3>
        <p className="text-neutral-400">
          No player registrations match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-rink-500/10 border border-rink-500/30">
          <span className="text-sm text-rink-400">
            {selectedIds.length} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleBulkAction('approve')}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('waitlist')}
            >
              <Clock className="w-4 h-4 mr-1" />
              Waitlist All
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('reject')}
            >
              <X className="w-4 h-4 mr-1" />
              Reject All
            </Button>
          </div>
        </div>
      )}

      {/* Table (desktop) / Cards (mobile) */}
      <ResponsiveTable
        className="rounded-xl border border-neutral-700"
        mobileCards={sortedRegistrations.map((reg) => (
          <RegistrationMobileCard
            key={reg.id}
            reg={reg}
            leagueId={leagueId}
            isSelected={selectedIds.includes(reg.id)}
            isProcessing={processingId === reg.id}
            onSelect={handleSelectOne}
            onApprove={handleApprove}
            onReject={handleReject}
            onWaitlist={handleWaitlist}
            onRecordPayment={setPaymentTarget}
          />
        ))}
      >
        <table className="w-full">
          <thead className="bg-neutral-800">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-neutral-600 bg-neutral-700 text-rink-500 focus:ring-rink-500"
                />
              </th>
              <th className="w-10 px-2 py-3" />
              <SortableHeader field="name" label="Player" current={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="skill" label="Skill" current={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="position" label="Position" current={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="team" label="Team" current={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="waiver" label="Waiver" current={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="payment" label="Payment" current={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="status" label="Status" current={sortField} direction={sortDirection} onSort={handleSort} />
              <SortableHeader field="submitted" label="Submitted" current={sortField} direction={sortDirection} onSort={handleSort} />
              <th className="px-4 py-3 text-right text-sm font-medium text-neutral-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700">
            {sortedRegistrations.map((reg) => (
              <RegistrationRow
                key={reg.id}
                reg={reg}
                leagueId={leagueId}
                isSelected={selectedIds.includes(reg.id)}
                isExpanded={expandedId === reg.id}
                isProcessing={processingId === reg.id}
                onSelect={handleSelectOne}
                onToggleExpand={toggleExpanded}
                onApprove={handleApprove}
                onReject={handleReject}
                onWaitlist={handleWaitlist}
                onRecordPayment={setPaymentTarget}
              />
            ))}
          </tbody>
        </table>
      </ResponsiveTable>

      <ManualRegistrationPaymentDialog
        open={Boolean(paymentTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentTarget(null);
          }
        }}
        registration={paymentTarget}
        onSaved={() => {
          setPaymentTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}

// Sortable column header
function SortableHeader({
  field,
  label,
  current,
  direction,
  onSort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = current === field;
  return (
    <th
      className="px-4 py-3 text-left text-sm font-medium text-neutral-300 cursor-pointer select-none hover:text-white transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-rink-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-rink-400" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-600" />
        )}
      </span>
    </th>
  );
}

// Individual registration row with expandable details
function RegistrationRow({
  reg,
  leagueId,
  isSelected,
  isExpanded,
  isProcessing,
  onSelect,
  onToggleExpand,
  onApprove,
  onReject,
  onWaitlist,
  onRecordPayment,
}: {
  reg: Registration;
  leagueId: string;
  isSelected: boolean;
  isExpanded: boolean;
  isProcessing: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onWaitlist: (id: string) => void;
  onRecordPayment: (registration: Registration) => void;
}) {
  const paymentBadge = getPaymentBadgeModel(reg);

  return (
    <>
      <tr className="hover:bg-neutral-800/50 transition-colors">
        <td className="px-4 py-3">
          {reg.status === 'pending' && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(reg.id, e.target.checked)}
              className="rounded border-neutral-600 bg-neutral-700 text-rink-500 focus:ring-rink-500"
            />
          )}
        </td>
        <td className="px-2 py-3">
          <button
            onClick={() => onToggleExpand(reg.id)}
            className="p-2 rounded hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-white"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={getRegistrationAvatarUrl(reg)}
                alt={reg.player.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">
                {reg.player.full_name}
              </p>
              <p className="text-sm text-neutral-400 truncate">
                {reg.player.email}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-neutral-300">
            {reg.self_assessed_skill
              ? formatSkillLevel(reg.self_assessed_skill as any)
              : '-'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-neutral-300">
            {reg.preferred_position
              ? formatPosition(reg.preferred_position as any)
              : '-'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-neutral-300">
            {getRequestedTeamLabel(reg) || '-'}
          </span>
          {getPreviousTeamLabel(reg) && (
            <p className="text-xs text-neutral-500">
              Prev: {getPreviousTeamLabel(reg)}
            </p>
          )}
          <p className="text-xs text-neutral-500">
            {formatRegistrationType(reg.registration_type as any)}
          </p>
          {reg.draft_data?.registration_intent && (
            <p className="text-xs text-rink-300">
              {formatRegistrationIntent(reg.draft_data.registration_intent)}
            </p>
          )}
          {reg.draft_data?.team_return_status && (
            <p className="text-xs text-neutral-500">
              {formatTeamReturnStatus(reg.draft_data.team_return_status)}
            </p>
          )}
          {getEmergencyContactSummary(reg) && (
            <p className="text-xs text-neutral-500">
              Emergency: {getEmergencyContactSummary(reg)}
            </p>
          )}
        </td>
        <td className="px-4 py-3">
          <WaiverBadge waiver={reg.waiver} />
        </td>
        <td className="px-4 py-3">
          <PaymentBadge
            status={paymentBadge.status}
            label={paymentBadge.label}
            detail={paymentBadge.detail}
          />
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={reg.status} />
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-neutral-400">
            {reg.submitted_at
              ? new Date(reg.submitted_at).toLocaleDateString()
              : '-'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/dashboard/leagues/${leagueId}/registrations/${reg.id}`}
              className="p-2 rounded-lg hover:bg-neutral-700 transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-neutral-400" />
            </Link>

            {canRecordOfflinePayment(reg) && (
              <button
                onClick={() => onRecordPayment(reg)}
                disabled={isProcessing}
                className="p-2 rounded-lg hover:bg-blue-500/20 transition-colors text-blue-400 disabled:opacity-50"
                title="Record manual payment"
              >
                <Landmark className="w-4 h-4" />
              </button>
            )}

            {reg.status === 'pending' && (
              <>
                <button
                  onClick={() => onApprove(reg.id)}
                  disabled={isProcessing}
                  className="p-2 rounded-lg hover:bg-green-500/20 transition-colors text-green-400 disabled:opacity-50"
                  title="Approve"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onWaitlist(reg.id)}
                  disabled={isProcessing}
                  className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors text-purple-400 disabled:opacity-50"
                  title="Waitlist"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onReject(reg.id)}
                  disabled={isProcessing}
                  className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-400 disabled:opacity-50"
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr className="bg-neutral-800/30">
          <td colSpan={11} className="px-4 py-4">
            <ExpandedDetails reg={reg} />
          </td>
        </tr>
      )}
    </>
  );
}

// Expanded detail section within the table
function ExpandedDetails({ reg }: { reg: Registration }) {
  const outstandingCents = getOutstandingBalanceCents(reg);
  const paymentBadge = getPaymentBadgeModel(reg);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-12">
      {/* Contact Info */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          Contact
        </h4>
        <div className="text-sm space-y-1">
          <p className="text-neutral-300">{reg.player.email}</p>
          {reg.player.phone && (
            <p className="text-neutral-400 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {reg.player.phone}
            </p>
          )}
        </div>
      </div>

      {/* Playing Info */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" />
          Playing Details
        </h4>
        <div className="text-sm space-y-1">
          <DetailRow label="Position" value={reg.preferred_position ? formatPosition(reg.preferred_position as any) : '-'} />
          {reg.secondary_position && (
            <DetailRow label="Secondary" value={formatPosition(reg.secondary_position as any)} />
          )}
          <DetailRow label="Skill" value={reg.self_assessed_skill ? formatSkillLevel(reg.self_assessed_skill as any) : '-'} />
          <DetailRow label="Experience" value={reg.years_experience !== null && reg.years_experience !== undefined ? `${reg.years_experience} years` : '-'} />
          {reg.preferred_jersey_number && (
            <DetailRow label="Jersey #" value={`#${reg.preferred_jersey_number}`} />
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          Additional
        </h4>
        <div className="text-sm space-y-1">
          <DetailRow label="Type" value={formatRegistrationType(reg.registration_type as any)} />
          {reg.draft_data?.date_of_birth && (
            <DetailRow
              label="DOB"
              value={new Date(`${reg.draft_data.date_of_birth}T00:00:00`).toLocaleDateString()}
            />
          )}
          {reg.draft_data?.registration_intent && (
            <DetailRow label="Path" value={formatRegistrationIntent(reg.draft_data.registration_intent)} />
          )}
          <DetailRow label="Requested Team" value={getRequestedTeamLabel(reg) || 'None'} />
          {getPreviousTeamLabel(reg) && (
            <DetailRow label="Previous Team" value={getPreviousTeamLabel(reg) || '-'} />
          )}
          {reg.draft_data?.team_return_status && (
            <DetailRow label="Team Status" value={formatTeamReturnStatus(reg.draft_data.team_return_status)} />
          )}
          {getEmergencyContactSummary(reg) && (
            <DetailRow label="Emergency" value={getEmergencyContactSummary(reg) || '-'} />
          )}
          <DetailRow
            label="Waiver"
            value={reg.waiver ? `Signed by ${reg.waiver.signed_name}` : 'Not signed'}
          />
          <DetailRow label="Payment" value={paymentBadge.label} />
          {reg.amount_paid_cents > 0 && (
            <DetailRow
              label="Paid"
              value={`$${(reg.amount_paid_cents / 100).toFixed(2)}`}
            />
          )}
          {reg.fee_amount_cents !== null && reg.fee_amount_cents > 0 && (
            <DetailRow
              label="Outstanding"
              value={`$${(outstandingCents / 100).toFixed(2)}`}
            />
          )}
        </div>
        {reg.previous_leagues && (
          <div className="mt-2 pt-2 border-t border-neutral-700">
            <p className="text-xs text-neutral-500">Previous Leagues</p>
            <p className="text-sm text-neutral-300 mt-0.5">{reg.previous_leagues}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-300 text-right">{value}</span>
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
        'inline-flex px-2.5 py-1 rounded-full text-xs font-medium',
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
}

// Waiver Badge Component
function WaiverBadge({ waiver }: { waiver: Registration['waiver'] }) {
  if (waiver) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <FileCheck className="w-3 h-3" />
        Signed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
      <AlertTriangle className="w-3 h-3" />
      Missing
    </span>
  );
}

// Payment Badge Component
function PaymentBadge({
  status,
  label,
  detail,
}: {
  status: string;
  label?: string;
  detail?: string;
}) {
  const config = {
    not_required: { icon: null, text: 'text-neutral-500', label: 'N/A' },
    pending: { icon: Clock, text: 'text-amber-400', label: 'Pending' },
    partial: { icon: CreditCard, text: 'text-blue-400', label: 'Partial' },
    completed: { icon: CreditCard, text: 'text-green-400', label: 'Paid' },
    failed: { icon: X, text: 'text-red-400', label: 'Failed' },
    refunded: { icon: CreditCard, text: 'text-blue-400', label: 'Refunded' },
  }[status] || { icon: null, text: 'text-neutral-500', label: status };

  return (
    <span className="inline-flex flex-col">
      <span className={cn('inline-flex items-center gap-1 text-xs', config.text)}>
        {config.icon && <config.icon className="w-3 h-3" />}
        {label || config.label}
      </span>
      {detail && <span className="text-[11px] text-neutral-500">{detail}</span>}
    </span>
  );
}

// Mobile Card Component (shown on <md screens)
function RegistrationMobileCard({
  reg,
  leagueId,
  isSelected,
  isProcessing,
  onSelect,
  onApprove,
  onReject,
  onWaitlist,
  onRecordPayment,
}: {
  reg: Registration;
  leagueId: string;
  isSelected: boolean;
  isProcessing: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onWaitlist: (id: string) => void;
  onRecordPayment: (registration: Registration) => void;
}) {
  const paymentBadge = getPaymentBadgeModel(reg);

  return (
    <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 p-4 space-y-3">
      {/* Header: avatar + name + status */}
      <div className="flex items-start gap-3">
        {reg.status === 'pending' && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(reg.id, e.target.checked)}
            className="mt-1 rounded border-neutral-600 bg-neutral-700 text-rink-500 focus:ring-rink-500"
          />
        )}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <img src={getRegistrationAvatarUrl(reg)} alt={reg.player.full_name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{reg.player.full_name}</p>
          <p className="text-xs text-neutral-400 truncate">{reg.player.email}</p>
        </div>
        <StatusBadge status={reg.status} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-neutral-500 text-xs">Position</span>
          <p className="text-neutral-300">
            {reg.preferred_position ? formatPosition(reg.preferred_position as any) : '-'}
          </p>
        </div>
        <div>
          <span className="text-neutral-500 text-xs">Skill</span>
          <p className="text-neutral-300">
            {reg.self_assessed_skill ? formatSkillLevel(reg.self_assessed_skill as any) : '-'}
          </p>
        </div>
        <div>
          <span className="text-neutral-500 text-xs">Payment</span>
          <p>
            <PaymentBadge
              status={paymentBadge.status}
              label={paymentBadge.label}
              detail={paymentBadge.detail}
            />
          </p>
        </div>
        <div>
          <span className="text-neutral-500 text-xs">Path</span>
          <p className="text-neutral-300">
            {formatRegistrationIntent(reg.draft_data?.registration_intent) || formatRegistrationType(reg.registration_type as any)}
          </p>
        </div>
        <div>
          <span className="text-neutral-500 text-xs">Waiver</span>
          <p><WaiverBadge waiver={reg.waiver} /></p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-neutral-700/50">
        <Link
          href={`/dashboard/leagues/${leagueId}/registrations/${reg.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-700/50 text-sm text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </Link>
        {canRecordOfflinePayment(reg) && (
          <button
            onClick={() => onRecordPayment(reg)}
            className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
            title="Record manual payment"
          >
            <Landmark className="w-4 h-4" />
          </button>
        )}
        {reg.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(reg.id)}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/20 text-sm text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={() => onWaitlist(reg.id)}
              disabled={isProcessing}
              className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              title="Waitlist"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReject(reg.id)}
              disabled={isProcessing}
              className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              title="Reject"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
