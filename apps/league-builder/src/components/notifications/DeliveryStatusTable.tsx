'use client';

/**
 * DeliveryStatusTable Component
 *
 * Displays notification delivery history with status tracking
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Mail,
  MessageSquare,
  Bell,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { getNotificationHistory, resendNotification, getDeliveryStats } from '@/lib/notifications/actions';

interface DeliveryStatusTableProps {
  leagueId: string;
}

type StatusFilter = 'all' | 'sent' | 'failed' | 'pending';
type TypeFilter = 'all' | 'game_reminder' | 'roster_change' | 'schedule_change' | 'league_announcement';

const STATUS_ICONS = {
  sent: <CheckCircle className="h-4 w-4 text-[#22c55e]" />,
  failed: <XCircle className="h-4 w-4 text-[#ef4444]" />,
  pending: <Clock className="h-4 w-4 text-[#eab308]" />,
  processing: <RefreshCw className="h-4 w-4 text-[#3b82f6] animate-spin" />,
  bounced: <XCircle className="h-4 w-4 text-[#ef4444]" />,
};

const CHANNEL_ICONS = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  push: <Bell className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  game_reminder: 'Game Reminder',
  roster_change: 'Roster Change',
  schedule_change: 'Schedule Change',
  league_announcement: 'Announcement',
  game_rescheduled: 'Game Rescheduled',
  game_cancelled: 'Game Cancelled',
  draft_pick: 'Draft Pick',
  registration_confirmed: 'Registration',
  payment_receipt: 'Payment Receipt',
};

const PAGE_SIZE = 10;

export function DeliveryStatusTable({ leagueId }: DeliveryStatusTableProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [historyResult, statsResult] = await Promise.all([
        getNotificationHistory({
          leagueId,
          limit: PAGE_SIZE,
          offset: (currentPage - 1) * PAGE_SIZE,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
        }),
        getDeliveryStats(leagueId),
      ]);

      setNotifications(historyResult.data);
      setTotalCount(historyResult.total);
      setStats(statsResult);
      setLoading(false);
    }

    loadData();
  }, [leagueId, currentPage, statusFilter, typeFilter]);

  // Handle resend
  const handleResend = async (notificationId: string) => {
    setResending(notificationId);

    const result = await resendNotification(notificationId);

    if (result.success) {
      // Refresh the list
      const historyResult = await getNotificationHistory({
        leagueId,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      });
      setNotifications(historyResult.data);
    }

    setResending(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] border border-[rgba(34,211,238,0.2)] rounded-xl p-4">
          <p className="text-sm text-[#a3a3a3]">Total Sent</p>
          <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[rgba(34,197,94,0.3)] rounded-xl p-4">
          <p className="text-sm text-[#22c55e]">Delivered</p>
          <p className="text-2xl font-bold text-[#22c55e]">{stats.sent.toLocaleString()}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[rgba(239,68,68,0.3)] rounded-xl p-4">
          <p className="text-sm text-[#ef4444]">Failed</p>
          <p className="text-2xl font-bold text-[#ef4444]">{stats.failed.toLocaleString()}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[rgba(34,211,238,0.2)] rounded-xl p-4">
          <p className="text-sm text-[#a3a3a3]">Success Rate</p>
          <p className="text-2xl font-bold text-[#22D3EE]">{stats.successRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#737373]" />
          <span className="text-sm text-[#737373]">Filter:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setCurrentPage(1);
          }}
          className="bg-[#1a1a1a] border border-[rgba(34,211,238,0.3)] rounded-lg px-3 py-2 text-white text-sm focus:border-[#22D3EE] focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="sent">Delivered</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as TypeFilter);
            setCurrentPage(1);
          }}
          className="bg-[#1a1a1a] border border-[rgba(34,211,238,0.3)] rounded-lg px-3 py-2 text-white text-sm focus:border-[#22D3EE] focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="game_reminder">Game Reminders</option>
          <option value="roster_change">Roster Changes</option>
          <option value="schedule_change">Schedule Changes</option>
          <option value="league_announcement">Announcements</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[rgba(34,211,238,0.2)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#22D3EE]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-[#525252]">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.1)]">
                    <th className="text-left p-4 text-sm font-medium text-[#a3a3a3]">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-[#a3a3a3]">Type</th>
                    <th className="text-left p-4 text-sm font-medium text-[#a3a3a3]">Recipient</th>
                    <th className="text-left p-4 text-sm font-medium text-[#a3a3a3]">Subject</th>
                    <th className="text-left p-4 text-sm font-medium text-[#a3a3a3]">Sent</th>
                    <th className="text-right p-4 text-sm font-medium text-[#a3a3a3]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => (
                    <tr
                      key={notification.id}
                      className="border-b border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {STATUS_ICONS[notification.status as keyof typeof STATUS_ICONS] || STATUS_ICONS.pending}
                          <span className="text-sm text-white capitalize">{notification.status}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[#737373]">
                            {CHANNEL_ICONS[notification.channel as keyof typeof CHANNEL_ICONS]}
                          </span>
                          <span className="text-sm text-white">
                            {TYPE_LABELS[notification.type] || notification.type}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-white">
                          {notification.profiles?.full_name || 'Unknown'}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-[#a3a3a3] truncate max-w-[200px]">
                          {notification.subject}
                        </p>
                        {notification.failure_reason && (
                          <p className="text-xs text-[#ef4444] truncate max-w-[200px]">
                            {notification.failure_reason}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-[#737373]">
                          {formatDate(notification.sent_at || notification.created_at)}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        {notification.status === 'failed' && (
                          <button
                            onClick={() => handleResend(notification.id)}
                            disabled={resending === notification.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-[#22D3EE] border border-[rgba(34,211,238,0.3)] rounded-lg hover:bg-[rgba(34,211,238,0.1)] disabled:opacity-50"
                          >
                            {resending === notification.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            Resend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[rgba(255,255,255,0.1)]">
                <p className="text-sm text-[#525252]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-[#a3a3a3] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-[#a3a3a3]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-[#a3a3a3] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
