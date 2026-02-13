'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Loader2,
  Shield,
  AlertCircle,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Receipt,
} from 'lucide-react';

interface CaptainFeesPageProps {
  params: Promise<{ leagueSlug: string }>;
}

interface InvoicePayment {
  id: string;
  amount_cents: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

interface TeamInvoice {
  id: string;
  total_players: number;
  fee_per_player_cents: number;
  total_amount_cents: number;
  amount_paid_cents: number;
  status: string;
  payment_deadline: string | null;
  notes: string | null;
  currency: string;
  season_id: string;
  team_invoice_payments: InvoicePayment[];
}

function formatCurrency(cents: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const METHOD_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  e_transfer: 'e-Transfer',
  cash: 'Cash',
  check: 'Check',
  other: 'Other',
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; Icon: typeof Clock }> = {
  pending: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-500', label: 'Pending', Icon: Clock },
  partial: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-500', label: 'Partially Paid', Icon: DollarSign },
  paid: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-500', label: 'Paid', Icon: CheckCircle },
  overdue: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-500', label: 'Overdue', Icon: AlertCircle },
  waived: { bg: 'bg-neutral-500/10 border-neutral-500/30', text: 'text-neutral-400', label: 'Waived', Icon: CheckCircle },
};

export default function CaptainFeesPage({ params }: CaptainFeesPageProps) {
  const { leagueSlug } = use(params);
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile();
  const [invoices, setInvoices] = useState<TeamInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!currentTeam?.team_id || !isCaptain) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('team_invoices')
        .select(`
          id,
          total_players,
          fee_per_player_cents,
          total_amount_cents,
          amount_paid_cents,
          status,
          payment_deadline,
          notes,
          currency,
          season_id,
          team_invoice_payments (
            id,
            amount_cents,
            payment_method,
            reference_number,
            notes,
            created_at
          )
        `)
        .eq('team_id', currentTeam.team_id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setInvoices(data as unknown as TeamInvoice[]);
      }
      setIsLoading(false);
    };

    if (!profileLoading) {
      fetchInvoices();
    }
  }, [currentTeam, isCaptain, profileLoading]);

  if (profileLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading team fees...</p>
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
            Only team captains and alternates can view team fees.
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
            Team Fees
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {currentTeam.team.name} — invoices and payment history
          </p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-12 text-center">
          <Receipt className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            No Invoices
          </h3>
          <p className="text-[var(--color-text-secondary)]">
            No team invoices have been generated yet. Contact your league admin for details.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {invoices.map((invoice) => {
            const balance = invoice.total_amount_cents - invoice.amount_paid_cents;
            const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.Icon;

            return (
              <div
                key={invoice.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden"
              >
                {/* Status Banner */}
                <div className={`border-b ${config.bg} p-4`}>
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${config.text}`} />
                    <div className="flex-1">
                      <span className={`font-semibold ${config.text}`}>
                        {config.label}
                      </span>
                      {invoice.payment_deadline && invoice.status !== 'paid' && invoice.status !== 'waived' && (
                        <span className="text-sm text-[var(--color-text-secondary)] ml-3">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Due: {formatDate(invoice.payment_deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fee Summary */}
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Total Due</p>
                      <p className="text-xl font-bold text-[var(--color-text-primary)]">
                        {formatCurrency(invoice.total_amount_cents, invoice.currency)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {invoice.total_players} players &times; {formatCurrency(invoice.fee_per_player_cents, invoice.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Paid</p>
                      <p className="text-xl font-bold text-green-500">
                        {formatCurrency(invoice.amount_paid_cents, invoice.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Balance</p>
                      <p className={`text-xl font-bold ${balance > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {formatCurrency(balance, invoice.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {invoice.notes && (
                    <div className="bg-[var(--color-surface-hover)] rounded-lg p-3 mb-4">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Note from league admin</p>
                      <p className="text-sm text-[var(--color-text-primary)]">{invoice.notes}</p>
                    </div>
                  )}

                  {/* Payment History */}
                  {invoice.team_invoice_payments.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Payment History
                      </p>
                      <div className="divide-y divide-[var(--color-border)]">
                        {invoice.team_invoice_payments.map((payment) => (
                          <div key={payment.id} className="py-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                {formatCurrency(payment.amount_cents, invoice.currency)}
                              </p>
                              <p className="text-xs text-[var(--color-text-muted)]">
                                {METHOD_LABELS[payment.payment_method] || payment.payment_method}
                                {payment.reference_number && ` — ${payment.reference_number}`}
                              </p>
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {formatDate(payment.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
