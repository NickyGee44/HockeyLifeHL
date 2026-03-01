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
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Mail,
  RefreshCw,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
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
  onRefund?: (payment: PlayerPaymentWithDetails) => void;
  onSendReminder?: (payment: PlayerPaymentWithDetails) => void;
  onViewDetails?: (payment: PlayerPaymentWithDetails) => void;
  onMarkAsPaid?: (payment: PlayerPaymentWithDetails) => void;
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
  onRefund,
  onSendReminder,
  onViewDetails,
  onMarkAsPaid,
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = payments.length;
    const paid = payments.filter((p) => p.status === 'paid').length;
    const partial = payments.filter((p) => p.status === 'partially_paid').length;
    const overdue = payments.filter((p) => p.status === 'overdue').length;
    const totalExpected = payments.reduce((sum, p) => sum + p.total_amount_cents, 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount_paid_cents, 0);

    return { total, paid, partial, overdue, totalExpected, totalCollected };
  }, [payments]);

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
    <div className="bg-neutral-800 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header with Stats */}
      <div className="p-6 border-b border-neutral-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-white">{t('title')}</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-neutral-700 rounded-lg text-neutral-300">
              {t('total', { count: stats.total })}
            </span>
            <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
              {t('paid', { count: stats.paid })}
            </span>
            {stats.overdue > 0 && (
              <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                {t('overdue', { count: stats.overdue })}
              </span>
            )}
          </div>
        </div>

        {/* Collection Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-neutral-400">{t('collectionProgress')}</span>
            <span className="text-white">
              {formatCurrency(stats.totalCollected)} / {formatCurrency(stats.totalExpected)}
            </span>
          </div>
          <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rink-500 to-arena-500 rounded-full transition-all"
              style={{
                width: `${stats.totalExpected > 0 ? (stats.totalCollected / stats.totalExpected) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
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

          {/* Status Filter */}
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

          {/* Team Filter */}
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-900/50">
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
              <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
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
                    className="hover:bg-neutral-700/30 transition-colors"
                  >
                    {/* Player */}
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

                    {/* Team */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-300">
                        {payment.team?.name || '-'}
                      </span>
                    </td>

                    {/* Amount */}
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

                    {/* Progress */}
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

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${statusConfig.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {tStatus(statusConfig.labelKey)}
                      </span>
                    </td>

                    {/* Payment Plan */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-neutral-300">
                        {tPlan(PAYMENT_PLAN_KEYS[payment.payment_plan])}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === payment.id ? null : payment.id)
                          }
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openMenuId === payment.id && (
                          <>
                            {/* Backdrop */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />

                            {/* Menu */}
                            <div className="absolute right-0 top-8 z-20 w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1">
                              {onViewDetails && (
                                <button
                                  onClick={() => {
                                    onViewDetails(payment);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white flex items-center gap-2"
                                >
                                  <DollarSign className="h-4 w-4" />
                                  {t('viewDetails')}
                                </button>
                              )}
                              {onMarkAsPaid &&
                                ['pending', 'partially_paid', 'overdue'].includes(
                                  payment.status
                                ) && (
                                  <button
                                    onClick={() => {
                                      onMarkAsPaid(payment);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-neutral-700 flex items-center gap-2"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    {t('markAsPaid')}
                                  </button>
                                )}
                              {onSendReminder &&
                                ['pending', 'partially_paid', 'overdue'].includes(
                                  payment.status
                                ) && (
                                  <button
                                    onClick={() => {
                                      onSendReminder(payment);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white flex items-center gap-2"
                                  >
                                    <Mail className="h-4 w-4" />
                                    {t('sendReminder')}
                                  </button>
                                )}
                              {onRefund &&
                                ['paid', 'partially_paid'].includes(payment.status) &&
                                payment.amount_paid_cents > 0 && (
                                  <button
                                    onClick={() => {
                                      onRefund(payment);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-neutral-700 flex items-center gap-2"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    {t('issueRefund')}
                                  </button>
                                )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filteredPayments.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-700 bg-neutral-900/30">
          <p className="text-xs text-neutral-500">
            {t('showing', { shown: filteredPayments.length, total: payments.length })}
          </p>
        </div>
      )}
    </div>
  );
}

export default PaymentStatusTable;
