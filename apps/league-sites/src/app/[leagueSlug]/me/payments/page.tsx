'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { createClient } from '@/lib/supabase/client';
import { getRegistrationPaymentHistory } from '@/lib/actions/registration-payments';
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
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'waitlisted';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded' | 'failed';
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
}

interface PaymentsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export default function PaymentsPage({ params }: PaymentsPageProps) {
  const { leagueSlug } = use(params);
  const { profile, isLoading: profileLoading } = usePlayerProfile();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    registrationId: string;
    registrationName: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();

      // Get league ID from slug
      const { data: league } = await supabase
        .from('leagues')
        .select('id')
        .eq('slug', leagueSlug)
        .single();

      if (!league) {
        setIsLoading(false);
        return;
      }

      // Fetch player registrations with payment info
      const { data: regsData } = await supabase
        .from('registration_submissions')
        .select(`
          id,
          season_id,
          team_id,
          status,
          payment_status,
          amount_paid_cents,
          fee_amount_cents,
          currency,
          stripe_payment_intent_id,
          created_at,
          registration_type,
          season:seasons(id, name, start_date, end_date),
          team:teams(id, name, logo_url)
        `)
        .eq('player_id', profile.id)
        .eq('league_id', league.id)
        .neq('payment_status', 'not_required')
        .order('created_at', { ascending: false });

      if (regsData) {
        // Transform nested arrays, map logo_url to logo, and add registration_type as an object
        const transformedRegs = regsData.map((reg: any) => {
          const rawTeam = Array.isArray(reg.team) ? reg.team[0] : reg.team;
          return {
            ...reg,
            season: Array.isArray(reg.season) ? reg.season[0] : reg.season,
            team: rawTeam ? { ...rawTeam, logo: rawTeam.logo_url } : null,
            registration_type: {
              id: reg.id,
              name: `${reg.registration_type} Registration`,
              fee_amount_cents: reg.fee_amount_cents || 0,
            },
          };
        });
        setRegistrations(transformedRegs);
      }

      // Fetch payment history using server action
      const historyResult = await getRegistrationPaymentHistory(leagueSlug);
      if (historyResult.success && historyResult.data) {
        setPayments(historyResult.data);
      }

      setIsLoading(false);
    };

    if (!profileLoading) {
      fetchData();
    }
  }, [profile, profileLoading, leagueSlug]);

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
      const feeAmount = reg.registration_type?.fee_amount_cents || 0;
      const paid = reg.amount_paid_cents || 0;
      return sum + Math.max(0, feeAmount - paid);
    },
    0
  );

  const totalPaid = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  const handlePayNow = (registrationId: string, amount: number, registrationName: string) => {
    setPaymentModal({
      isOpen: true,
      registrationId,
      registrationName,
      amount,
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

  if (isLoading || profileLoading) {
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
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
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
      {registrations.filter((r) => {
        const feeAmount = r.registration_type?.fee_amount_cents || 0;
        return feeAmount > (r.amount_paid_cents || 0);
      }).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Outstanding Balances
          </h2>
          <div className="space-y-3">
            {registrations
              .filter((r) => {
                const feeAmount = r.registration_type?.fee_amount_cents || 0;
                return feeAmount > (r.amount_paid_cents || 0);
              })
              .map((reg) => {
                const feeAmount = reg.registration_type?.fee_amount_cents || 0;
                const balance = feeAmount - (reg.amount_paid_cents || 0);
                return (
                  <div
                    key={reg.id}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {reg.registration_type?.name || reg.season?.name || 'Season Registration'}
                          </span>
                        </div>
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
                          {(reg.amount_paid_cents || 0) > 0 && (
                            <>Paid: {formatCurrency(reg.amount_paid_cents || 0)} / </>
                          )}
                          Total: {formatCurrency(feeAmount)}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePayNow(reg.id, balance, reg.registration_type?.name || reg.season?.name || 'Registration')}
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
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
            <Receipt className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              No payment history yet.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
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
          leagueSlug={leagueSlug}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
