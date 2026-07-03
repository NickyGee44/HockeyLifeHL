'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import {
  getRegistrationPaymentHistory,
  getRegistrationPaymentRegistrations,
} from '@/lib/actions/registration-payments';
import { PaymentModal } from '@/components/payments';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Receipt,
  Calendar,
  DollarSign,
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description: string;
  created_at: string;
  payment_method?: string;
}

interface Registration {
  id: string;
  season_id: string;
  team_id: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'waitlisted' | 'pending';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded' | 'failed' | 'completed' | 'not_required';
  fee_amount_cents: number;
  currency: string;
  amount_paid_cents: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
  season?: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
  team?: {
    id: string;
    name: string;
    logo: string | null;
  };
  registration_type?: {
    id: string;
    name: string;
    fee_amount_cents: number;
  };
  payment_mode: 'hidden' | 'required' | 'optional' | 'team_contribution';
  payment_quote: {
    baseFeeCents: number;
    baseAmountDueCents: number;
    baseAmountPaidCents: number;
    platformFeeCents: number;
    platformFeeOnFullFeeCents: number;
    outstandingChargeCents: number;
    totalChargeCents: number;
    totalPaidDisplayCents: number;
    platformFeePercent: number;
    chargeIncludesPlatformFee: boolean;
  };
}

interface PaymentsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default function PaymentsPage({ params }: PaymentsPageProps) {
  const { leagueSlug } = use(params);
  const { session, user, isLoading: userLoading } = useUser();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    registrationId: string;
    registrationName: string;
    amount: number;
    baseFeeCents: number;
    platformFeeCents: number;
    platformFeePercent: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [registrationsResult, historyResult] = await Promise.all([
        getRegistrationPaymentRegistrations(leagueSlug, session?.access_token),
        getRegistrationPaymentHistory(leagueSlug, session?.access_token),
      ]);

      if (registrationsResult.success && registrationsResult.data) {
        setRegistrations(registrationsResult.data as Registration[]);
      }

      if (historyResult.success && historyResult.data) {
        setPayments(historyResult.data);
      }

      setIsLoading(false);
    };

    if (!userLoading) {
      fetchData();
    }
  }, [user, userLoading, leagueSlug, session?.access_token]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount / 100); // Assuming amounts are in cents
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return (
          <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'refunded':
        return (
          <span className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full">
            <Receipt className="w-3 h-3" />
            Refunded
          </span>
        );
      default:
        return null;
    }
  };

  const totalOwed = registrations.reduce(
    (sum, reg) => {
      return sum + Math.max(0, reg.payment_quote?.outstandingChargeCents || 0);
    },
    0
  );

  const totalPaid = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingRegistrations = registrations.filter((reg) => {
    return (reg.payment_quote?.outstandingChargeCents || 0) > 0;
  });

  const primaryOutstanding = outstandingRegistrations[0] || null;

  const handlePayNow = (
    registrationId: string,
    amount: number,
    registrationName: string,
    baseFeeCents: number,
    platformFeeCents: number,
    platformFeePercent: number
  ) => {
    setPaymentModal({
      isOpen: true,
      registrationId,
      registrationName,
      amount,
      baseFeeCents,
      platformFeeCents,
      platformFeePercent,
    });
  };

  const handleClosePaymentModal = () => {
    setPaymentModal(null);
  };

  const handlePaymentComplete = () => {
    // Refresh the data after payment
    setPaymentModal(null);
    window.location.reload();
  };

  if (isLoading || userLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/${leagueSlug}/me`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Payments</h1>
          <p className="text-[var(--color-text-secondary)]">
            View balances and payment history
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {totalOwed > 0 && primaryOutstanding && (
        <div className="mb-6 rounded-2xl border border-[var(--league-primary)]/25 bg-[var(--league-primary)]/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--league-primary)]">
                Ready to pay online
              </p>
              <h2 className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">
                {formatCurrency(totalOwed)} outstanding
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Open your payment screen and complete your outstanding balance with Stripe.
              </p>
            </div>
            <button
              onClick={() =>
                handlePayNow(
                  primaryOutstanding.id,
                  primaryOutstanding.payment_quote?.outstandingChargeCents || 0,
                  primaryOutstanding.registration_type?.name || primaryOutstanding.season?.name || 'Registration',
                  primaryOutstanding.payment_quote?.baseAmountDueCents || 0,
                  primaryOutstanding.payment_quote?.platformFeeCents || 0,
                  primaryOutstanding.payment_quote?.platformFeePercent || 0
                )
              }
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--league-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              Pay Online Now
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Outstanding Balance */}
        <div
          className={`bg-[var(--color-surface)] border rounded-xl p-6 ${
            totalOwed > 0
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-[var(--color-border)]'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                totalOwed > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'
              }`}
            >
              {totalOwed > 0 ? (
                <DollarSign className="w-6 h-6 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Balance Due</p>
              <p
                className={`text-2xl font-bold ${
                  totalOwed > 0 ? 'text-amber-400' : 'text-green-400'
                }`}
              >
                {totalOwed > 0 ? formatCurrency(totalOwed) : 'Paid in Full'}
              </p>
            </div>
          </div>
        </div>

        {/* Total Paid */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--league-primary)]/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-[var(--league-primary)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Total Paid</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Outstanding Registrations */}
      {outstandingRegistrations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Outstanding Balances
          </h2>
          <div className="space-y-3">
            {outstandingRegistrations.map((reg) => {
                const balance = reg.payment_quote?.outstandingChargeCents || 0;
                const feeAmount = reg.payment_quote?.baseFeeCents || reg.fee_amount_cents || 0;
                const platformFee = reg.payment_quote?.platformFeeOnFullFeeCents || 0;
                const isTeamContribution = reg.payment_mode === 'team_contribution';
                return (
                  <div
                    key={reg.id}
                    className="glass-card rounded-xl p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {reg.registration_type?.name || reg.season?.name || 'Season Registration'}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {isTeamContribution
                            ? 'Contribution toward your team invoice'
                            : 'Registration balance'}
                        </p>
                        {reg.team && (
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Team: {reg.team.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right sm:text-left">
                        <p className="text-lg font-bold text-amber-400">
                          {formatCurrency(balance)}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {(reg.payment_quote?.totalPaidDisplayCents || 0) > 0 && (
                            <>Paid: {formatCurrency(reg.payment_quote?.totalPaidDisplayCents || 0)} / </>
                          )}
                          Total: {formatCurrency(reg.payment_quote?.totalChargeCents || feeAmount)}
                        </p>
                        {platformFee > 0 && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {isTeamContribution ? 'Contribution' : 'League fee'} {formatCurrency(feeAmount)} + BLH fee {formatCurrency(platformFee)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          handlePayNow(
                            reg.id,
                            balance,
                            reg.registration_type?.name || reg.season?.name || 'Registration',
                            reg.payment_quote?.baseAmountDueCents || 0,
                            reg.payment_quote?.platformFeeCents || 0,
                            reg.payment_quote?.platformFeePercent || 0
                          )
                        }
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-[var(--league-primary)] text-[var(--color-accent-text)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Pay Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Payment History
        </h2>

        {payments.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Receipt className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              No payment history yet.
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 flex items-center gap-4 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payment.status === 'succeeded'
                        ? 'bg-green-500/10'
                        : payment.status === 'pending'
                          ? 'bg-amber-500/10'
                          : payment.status === 'refunded'
                            ? 'bg-blue-500/10'
                            : 'bg-red-500/10'
                    }`}
                  >
                    {payment.status === 'succeeded' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : payment.status === 'pending' ? (
                      <Clock className="w-5 h-5 text-amber-400" />
                    ) : payment.status === 'refunded' ? (
                      <Receipt className="w-5 h-5 text-blue-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">
                      {payment.description || 'Payment'}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {formatDate(payment.created_at)}
                      {payment.payment_method && (
                        <> &middot; {payment.payment_method}</>
                      )}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className={`font-bold ${
                        payment.status === 'refunded'
                          ? 'text-blue-400'
                          : 'text-[var(--color-text-primary)]'
                      }`}
                    >
                      {payment.status === 'refunded' ? '-' : ''}
                      {formatCurrency(payment.amount)}
                    </p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={handleClosePaymentModal}
          registrationId={paymentModal.registrationId}
          registrationName={paymentModal.registrationName}
          amount={paymentModal.amount}
          baseFeeCents={paymentModal.baseFeeCents}
          platformFeeCents={paymentModal.platformFeeCents}
          platformFeePercent={paymentModal.platformFeePercent}
          leagueSlug={leagueSlug}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
