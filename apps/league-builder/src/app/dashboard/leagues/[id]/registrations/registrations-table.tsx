'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Check,
  X,
  Clock,
  Eye,
  User,
  Mail,
  CreditCard,
} from 'lucide-react';
import { Button } from '@hockey-life/ui';
import {
  approveRegistration,
  rejectRegistration,
  bulkUpdateRegistrations,
} from '@/lib/actions/player-registration';
import { formatRegistrationType, formatSkillLevel } from '@/lib/schemas/player-registration';
import { cn } from '@hockey-life/ui/lib/utils';

interface Registration {
  id: string;
  player_id: string;
  registration_type: string;
  status: string;
  preferred_position: string | null;
  self_assessed_skill: string | null;
  payment_status: string;
  created_at: string;
  submitted_at: string | null;
  player: {
    id: string;
    full_name: string;
    email: string;
  };
  team: {
    id: string;
    name: string;
  } | null;
}

interface RegistrationsTableProps {
  registrations: Registration[];
  leagueId: string;
}

export function RegistrationsTable({
  registrations,
  leagueId,
}: RegistrationsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-700">
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
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-300">
                Player
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-300">
                Type
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-300">
                Skill
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-300">
                Position
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-300">
                Payment
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-300">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-neutral-300">
                Submitted
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-neutral-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700">
            {registrations.map((reg) => (
              <tr
                key={reg.id}
                className="hover:bg-neutral-800/50 transition-colors"
              >
                <td className="px-4 py-3">
                  {reg.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(reg.id)}
                      onChange={(e) => handleSelectOne(reg.id, e.target.checked)}
                      className="rounded border-neutral-600 bg-neutral-700 text-rink-500 focus:ring-rink-500"
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {reg.player.full_name}
                      </p>
                      <p className="text-sm text-neutral-400">
                        {reg.player.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-300">
                    {formatRegistrationType(reg.registration_type as any)}
                  </span>
                  {reg.team && (
                    <p className="text-xs text-neutral-500">{reg.team.name}</p>
                  )}
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
                    {reg.preferred_position || '-'}
                  </span>
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
                  <div className="flex items-center justify-end gap-2">
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
                          onClick={() => handleApprove(reg.id)}
                          disabled={processingId === reg.id}
                          className="p-2 rounded-lg hover:bg-green-500/20 transition-colors text-green-400"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(reg.id)}
                          disabled={processingId === reg.id}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-400"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
