'use client';

/**
 * Payment Status Table Component
 *
 * Displays player payments with status, progress, and actions.
 * Used by league admins to track and manage player fee collection.
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Archive,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  XCircle,
  Users,
} from 'lucide-react';
import type {
  PlayerPaymentWithDetails,
  PlayerPaymentStatus,
  PaymentPlanType,
} from '@/lib/payments/types';

interface PaymentStatusTableProps {
  payments: PlayerPaymentWithDetails[];
  teams?: { id: string; name: string }[];
  onViewDetails?: (payment: PlayerPaymentWithDetails) => void;
  isLoading?: boolean;
}

type SortField = 'player' | 'team' | 'amount' | 'status' | 'progress' | 'date';
type SortDirection = 'asc' | 'desc';

const STATUS_CONFIG: Record<
  PlayerPaymentStatus,
  { labelKey: string; icon: typeof CheckCircle; className: string }
> = {
  pending: {
    labelKey: 'pending',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  },
  processing: {
    labelKey: 'processing',
    icon: RefreshCw,
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  paid: {
    labelKey: 'paid',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-500 border-green-500/30',
  },
  partially_paid: {
    labelKey: 'partiallyPaid',
    icon: DollarSign,
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  overdue: {
    labelKey: 'overdue',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-500 border-red-500/30',
  },
  refunded: {
    labelKey: 'refunded',
    icon: RefreshCw,
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  },
  partially_refunded: {
    labelKey: 'partiallyRefunded',
    icon: RefreshCw,
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  },
  cancelled: {
    labelKey: 'cancelled',
    icon: XCircle,
    className: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/30',
  },
  failed: {
    labelKey: 'failed',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-500 border-red-500/30',
  },
  disputed: {
    labelKey: 'disputed',
    icon: AlertCircle,
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  },
};

const PAYMENT_PLAN_KEYS: Record<PaymentPlanType, string> = {
  full: 'full',
  two_pay: 'twoPay',
  three_pay: 'threePay',
};

interface SortIconProps {
  field: SortField;
  currentSortField: SortField;
  sortDirection: SortDirection;
}

function SortIcon({ field, currentSortField, sortDirection }: SortIconProps) {
  if (currentSortField !== field) return null;
  return sortDirection === 'asc' ? (
    <ChevronUp className="h-4 w-4" />
  ) : (
    <ChevronDown className="h-4 w-4" />
  );
}

export function PaymentStatusTable({
  payments,
  teams,
  onViewDetails,
  isLoading = false,
}: PaymentStatusTableProps) {
  const t = useTranslations('payments.statusTable');
  const tStatus = useTranslations('payments.history.statusLabels');
  const tPlan = useTranslations('payments.planLabels');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlayerPaymentStatus | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    let result = [...payments];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.player.full_name.toLowerCase().includes(query) ||
          p.player.email.toLowerCase().includes(query) ||
          p.team?.name.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Apply team filter
    if (teamFilter !== 'all') {
      result = result.filter((p) => p.team?.id === teamFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'player':
          comparison = a.player.full_name.localeCompare(b.player.full_name);
          break;
        case 'team':
          comparison = (a.team?.name || '').localeCompare(b.team?.name || '');
          break;
        case 'amount':
          comparison = a.total_amount_cents - b.total_amount_cents;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'progress': {
          const aProgress = a.amount_paid_cents / a.total_amount_cents;
          const bProgress = b.amount_paid_cents / b.total_amount_cents;
          comparison = aProgress - bProgress;
          break;
        }
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [payments, searchQuery, statusFilter, teamFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="bg-neutral-800 border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-rink-500 animate-spin" />
          <span className="ml-3 text-neutral-400">{t('loadingPayments')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{t('title')}</h3>
            <p className="mt-1 text-sm text-neutral-400">{t('showing', { shown: filteredPayments.length, total: payments.length })}</p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/50 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PlayerPaymentStatus | 'all')}
              className="pl-10 pr-8 py-2 bg-black/50 border border-neutral-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent"
            >
              <option value="all">{t('status')}</option>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {tStatus(config.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
          </div>

          {teams && teams.length > 0 && (
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-black/50 border border-neutral-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent"
              >
                <option value="all">{t('allTeams')}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-900/70">
              <th
                className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('player')}
              >
                <div className="flex items-center gap-1">
                  {t('player')}
                  <SortIcon field="player" currentSortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('team')}
              >
                <div className="flex items-center gap-1">
                  {t('team')}
                  <SortIcon field="team" currentSortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  {t('amount')}
                  <SortIcon field="amount" currentSortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('progress')}
              >
                <div className="flex items-center gap-1">
                  {t('progress')}
                  <SortIcon field="progress" currentSortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-white"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  {t('status')}
                  <SortIcon field="status" currentSortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                {t('plan')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                {t('created')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                  {searchQuery || statusFilter !== 'all' || teamFilter !== 'all'
                    ? t('noMatchingFilters')
                    : t('noPaymentsYet')}
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const statusConfig = STATUS_CONFIG[payment.status];
                const StatusIcon = statusConfig.icon;
                const progressPercent =
                  payment.total_amount_cents > 0
                    ? (payment.amount_paid_cents / payment.total_amount_cents) * 100
                    : 0;

                return (
                  <tr
                    key={payment.id}
                    className="border-t border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={payment.player.avatar_url || '/blank_player.png'}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {payment.player.full_name}
                          </p>
                          <p className="text-xs text-neutral-500">{payment.player.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-300">
                        {payment.team?.name || '-'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {formatCurrency(payment.total_amount_cents)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {t('amountPaid', { amount: formatCurrency(payment.amount_paid_cents) })}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-neutral-400">
                            {payment.current_installment}/{payment.total_installments}
                          </span>
                          <span className="text-neutral-300">
                            {Math.round(progressPercent)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progressPercent >= 100
                                ? 'bg-green-500'
                                : progressPercent > 0
                                  ? 'bg-rink-500'
                                  : 'bg-neutral-600'
                            }`}
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${statusConfig.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {tStatus(statusConfig.labelKey)}
                        </span>
                        {payment.archived_at && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-neutral-600 bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
                            <Archive className="h-3 w-3" />
                            {t('archived')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-300">
                        {tPlan(PAYMENT_PLAN_KEYS[payment.payment_plan])}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-neutral-400">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {onViewDetails ? (
                        <button
                          type="button"
                          onClick={() => onViewDetails(payment)}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-neutral-100 transition hover:bg-white/[0.08]"
                        >
                          {t('viewDetails')}
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default PaymentStatusTable;
