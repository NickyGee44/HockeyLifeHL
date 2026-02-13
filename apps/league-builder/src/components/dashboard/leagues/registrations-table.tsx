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

interface Registration {
  id: string;
  player_id: string;
  registration_type: string;
  status: string;
  preferred_position: string | null;
  secondary_position: string | null;
  preferred_jersey_number: number | null;
  self_assessed_skill: string | null;
  years_experience: number | null;
  previous_leagues: string | null;
  photo_url: string | null;
  payment_status: string;
  amount_paid_cents: number;
  created_at: string;
  submitted_at: string | null;
  player: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
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
              />
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
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
}) {
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
            <div className="w-9 h-9 rounded-full bg-neutral-700 overflow-hidden flex items-center justify-center flex-shrink-0">
              {reg.photo_url ? (
                <img
                  src={reg.photo_url}
                  alt={reg.player.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-neutral-400" />
              )}
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
            {reg.team?.name || '-'}
          </span>
          <p className="text-xs text-neutral-500">
            {formatRegistrationType(reg.registration_type as any)}
          </p>
        </td>
        <td className="px-4 py-3">
          <WaiverBadge waiver={reg.waiver} />
        </td>
        <td className="px-4 py-3">
          <PaymentBadge status={reg.payment_status} />
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
          <DetailRow label="Team Pref." value={reg.team?.name || 'None'} />
          <DetailRow
            label="Waiver"
            value={reg.waiver ? `Signed by ${reg.waiver.signed_name}` : 'Not signed'}
          />
          {reg.amount_paid_cents > 0 && (
            <DetailRow
              label="Paid"
              value={`$${(reg.amount_paid_cents / 100).toFixed(2)}`}
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
function PaymentBadge({ status }: { status: string }) {
  const config = {
    not_required: { icon: null, text: 'text-neutral-500', label: 'N/A' },
    pending: { icon: Clock, text: 'text-amber-400', label: 'Pending' },
    completed: { icon: CreditCard, text: 'text-green-400', label: 'Paid' },
    failed: { icon: X, text: 'text-red-400', label: 'Failed' },
    refunded: { icon: CreditCard, text: 'text-blue-400', label: 'Refunded' },
  }[status] || { icon: null, text: 'text-neutral-500', label: status };

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', config.text)}>
      {config.icon && <config.icon className="w-3 h-3" />}
      {config.label}
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
}: {
  reg: Registration;
  leagueId: string;
  isSelected: boolean;
  isProcessing: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onWaitlist: (id: string) => void;
}) {
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
        <div className="w-10 h-10 rounded-full bg-neutral-700 overflow-hidden flex items-center justify-center flex-shrink-0">
          {reg.photo_url ? (
            <img src={reg.photo_url} alt={reg.player.full_name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-neutral-400" />
          )}
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
          <p><PaymentBadge status={reg.payment_status} /></p>
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
