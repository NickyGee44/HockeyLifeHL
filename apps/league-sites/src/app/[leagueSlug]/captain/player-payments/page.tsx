'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useLeague } from '@/hooks/useLeague';
import {
  ArrowLeft,
  Loader2,
  Shield,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  CreditCard,
} from 'lucide-react';
import {
  getCaptainTeamPayments,
  getCaptainPaymentSummary,
  sendCaptainPaymentReminder,
  type CaptainPaymentPlayer,
  type CaptainPaymentSummary,
} from '@/lib/actions/captain-payments';

interface PlayerPaymentsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  paid: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-500', label: 'Paid' },
  partially_paid: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-500', label: 'Partial' },
  pending: { bg: 'bg-neutral-500/10 border-neutral-500/30', text: 'text-neutral-400', label: 'Pending' },
  processing: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', label: 'Processing' },
  overdue: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-500', label: 'Overdue' },
  refunded: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', label: 'Refunded' },
  cancelled: { bg: 'bg-neutral-500/10 border-neutral-600/30', text: 'text-neutral-500', label: 'Cancelled' },
  failed: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', label: 'Failed' },
  disputed: { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', label: 'Disputed' },
  no_fee: { bg: 'bg-neutral-800/50 border-neutral-700/30', text: 'text-neutral-500', label: 'No Fee' },
};

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function isReminderDisabled(player: CaptainPaymentPlayer): boolean {
  if (!player.paymentId) return true; // no payment record
  if (['paid', 'refunded', 'cancelled', 'no_fee'].includes(player.status)) return true;
  if (player.lastReminderSentAt) {
    const lastSent = new Date(player.lastReminderSentAt).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (now - lastSent < twentyFourHours) return true;
  }
  return false;
}

export default function PlayerPaymentsPage({ params }: PlayerPaymentsPageProps) {
  const { leagueSlug } = use(params);
  const { league, isLoading: leagueLoading } = useLeague();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(league?.id);
  const [payments, setPayments] = useState<CaptainPaymentPlayer[]>([]);
  const [summary, setSummary] = useState<CaptainPaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTeam?.team_id || !isCaptain || !league?.current_season_id) {
        setIsLoading(false);
        return;
      }

      const [paymentsResult, summaryResult] = await Promise.all([
        getCaptainTeamPayments(currentTeam.team_id, league.current_season_id),
        getCaptainPaymentSummary(currentTeam.team_id, league.current_season_id),
      ]);

      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data);
      } else if (paymentsResult.error) {
        setError(paymentsResult.error);
      }

      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data);
      }

      setIsLoading(false);
    };

    if (!profileLoading && !leagueLoading) {
      fetchData();
    }
  }, [currentTeam, isCaptain, profileLoading, league, leagueLoading]);

  if (profileLoading || leagueLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading player payments...</p>
        </div>
      </div>
    );
  }

  if (!currentTeam?.team || !isCaptain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
          <Shield className="w-12 h-12 mx-auto text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Captain Access Required
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Only team captains and alternates can view player payments.
          </p>
          <Link
            href={`/${leagueSlug}/me`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-lg font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const collectionPercent =
    summary && summary.totalExpectedCents > 0
      ? Math.round((summary.totalCollectedCents / summary.totalExpectedCents) * 100)
      : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/${leagueSlug}/captain`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Player Payments
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {currentTeam.team.name} — track player fee collection
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              icon={<Users className="w-5 h-5 text-[var(--league-primary)]" />}
              value={summary.totalPlayers}
              label="Total Players"
            />
            <SummaryCard
              icon={<CheckCircle className="w-5 h-5 text-green-500" />}
              value={summary.paidCount}
              label="Paid in Full"
            />
            <SummaryCard
              icon={<Clock className="w-5 h-5 text-yellow-500" />}
              value={summary.pendingCount}
              label="Pending"
            />
            <SummaryCard
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              value={summary.overdueCount}
              label="Overdue"
              highlight={summary.overdueCount > 0}
            />
          </div>

          {/* Collection Progress */}
          {summary.totalExpectedCents > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Collection Progress</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {formatMoney(summary.totalCollectedCents)} / {formatMoney(summary.totalExpectedCents)} ({collectionPercent}%)
                </span>
              </div>
              <div className="w-full h-3 bg-[var(--color-surface-hover)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, collectionPercent)}%`,
                    backgroundColor: 'var(--league-primary)',
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            No Roster Members
          </h3>
          <p className="text-[var(--color-text-secondary)]">
            No active players on the roster yet. Once players join, their payment status will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                    Player
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                    Amount
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                    Paid
                  </th>
                  <th className="text-center text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {payments.map((player) => {
                  const config = STATUS_CONFIG[player.status] || STATUS_CONFIG.no_fee;
                  const progress =
                    player.amountOwedCents > 0
                      ? Math.round((player.amountPaidCents / player.amountOwedCents) * 100)
                      : 0;

                  return (
                    <tr key={player.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                      {/* Player */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {player.avatarUrl ? (
                            <img
                              src={player.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)]">
                              {player.playerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                              {player.playerName}
                            </p>
                            {player.email && (
                              <p className="text-xs text-[var(--color-text-muted)] truncate max-w-[150px]">
                                {player.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {formatMoney(player.amountOwedCents)}
                        </p>
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {formatMoney(player.amountPaidCents)}
                        </p>
                        {player.amountOwedCents > 0 && (
                          <div className="w-16 h-1.5 bg-[var(--color-surface-hover)] rounded-full overflow-hidden ml-auto mt-1">
                            <div
                              className={`h-full rounded-full ${
                                progress >= 100 ? 'bg-green-500' : progress > 0 ? 'bg-yellow-500' : 'bg-neutral-600'
                              }`}
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${config.bg} ${config.text}`}
                        >
                          {config.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <ReminderButton
                          player={player}
                          teamId={currentTeam.team_id}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)]">
              {payments.length} player{payments.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border transition-all ${
        highlight
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-[var(--color-surface)] border-[var(--color-border)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className={`text-xl font-bold ${highlight ? 'text-red-400' : 'text-[var(--color-text-primary)]'}`}>
            {value}
          </p>
          <p className={`text-sm ${highlight ? 'text-red-400/80' : 'text-[var(--color-text-secondary)]'}`}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReminderButton({
  player,
  teamId,
}: {
  player: CaptainPaymentPlayer;
  teamId: string;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = isReminderDisabled(player) || sending || sent;

  if (!player.paymentId) {
    return <span className="text-xs text-[var(--color-text-muted)]">—</span>;
  }

  const handleSend = async () => {
    setSending(true);
    setError(null);

    const result = await sendCaptainPaymentReminder(teamId, player.paymentId!);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || 'Failed to send');
    }

    setSending(false);
  };

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <CheckCircle className="w-3.5 h-3.5" />
        Sent
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleSend}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-surface-hover)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--league-primary)]/10 hover:border-[var(--league-primary)]/30 hover:text-[var(--league-primary)]"
        title={
          isReminderDisabled(player)
            ? player.status === 'paid'
              ? 'Already paid'
              : 'Reminder sent recently'
            : 'Send payment reminder email'
        }
      >
        {sending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Mail className="w-3.5 h-3.5" />
        )}
        Remind
      </button>
      {error && (
        <p className="text-[10px] text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
