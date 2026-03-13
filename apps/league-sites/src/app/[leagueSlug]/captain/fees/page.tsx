'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useLeague } from '@/hooks/useLeague';
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
  X,
} from 'lucide-react';
import { recordCaptainTeamInvoicePayment } from '@/lib/actions/captain-payments';

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
  fee_basis?: 'player' | 'team';
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
  const { league } = useLeague();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(
    league?.id,
    league?.current_season_id
  );
  const [invoices, setInvoices] = useState<TeamInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvoice, setActiveInvoice] = useState<TeamInvoice | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!currentTeam?.team_id || !isCaptain) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const invoiceQuery = async (includeFeeBasis: boolean) =>
        supabase
          .from('team_invoices')
          .select(`
            id,
            total_players,
            ${includeFeeBasis ? 'fee_basis,' : ''}
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

      let { data, error } = await invoiceQuery(true);

      if (error && (error.code === '42703' || error.message?.includes('fee_basis'))) {
        const fallbackResult = await invoiceQuery(false);
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (!error && data) {
        setInvoices(data as unknown as TeamInvoice[]);
      }
      setIsLoading(false);
    };

    if (!profileLoading) {
      fetchInvoices();
    }
  }, [currentTeam, isCaptain, profileLoading, refreshKey]);

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
            const isZeroBalancePlaceholder =
              invoice.status === 'waived' &&
              invoice.total_amount_cents === 0 &&
              invoice.total_players === 0;
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
                        {isZeroBalancePlaceholder ? 'No Balance Yet' : config.label}
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
                        {invoice.fee_basis === 'team'
                          ? `Flat team fee${invoice.total_players > 0 ? ` • ${invoice.total_players} registered player${invoice.total_players === 1 ? '' : 's'}` : ''}`
                          : `${invoice.total_players} players × ${formatCurrency(invoice.fee_per_player_cents, invoice.currency)}`}
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

                  {isZeroBalancePlaceholder && (
                    <div className="bg-[var(--color-surface-hover)] rounded-lg p-3 mb-4">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Team billing status</p>
                      <p className="text-sm text-[var(--color-text-primary)]">
                        Your team invoice is ready, but there is no balance yet. As players are assigned and fees are recorded, this summary will update automatically.
                      </p>
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

                  {balance > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveInvoice(invoice)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--league-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90"
                      >
                        <DollarSign className="h-4 w-4" />
                        Record Team Payment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeInvoice && (
        <RecordTeamInvoicePaymentDialog
          teamId={currentTeam.team_id}
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
          onRecorded={() => {
            setActiveInvoice(null);
            setRefreshKey((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}

function RecordTeamInvoicePaymentDialog({
  teamId,
  invoice,
  onClose,
  onRecorded,
}: {
  teamId: string;
  invoice: TeamInvoice;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const outstandingCents = Math.max(0, invoice.total_amount_cents - invoice.amount_paid_cents);
  const [amount, setAmount] = useState((outstandingCents / 100).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState<'e_transfer' | 'cash' | 'check' | 'other'>(
    'e_transfer'
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > outstandingCents) {
      setError(`Enter an amount between $0.01 and ${formatCurrency(outstandingCents, invoice.currency)}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await recordCaptainTeamInvoicePayment(teamId, invoice.id, {
      amountCents,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to record team payment.');
      return;
    }

    onRecorded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Record Team Payment</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Apply a chunk payment against this team invoice.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--color-surface-hover)]">
            <X className="h-5 w-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Outstanding Balance</p>
            <p className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(outstandingCents, invoice.currency)}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Amount</label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Method</label>
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as 'e_transfer' | 'cash' | 'check' | 'other')
              }
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
            >
              <option value="e_transfer">e-Transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Reference</label>
            <input
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
              placeholder="Optional reference number"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-primary)]">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional bookkeeping notes"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-text-primary)]"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--league-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Payment
          </button>
        </div>
      </div>
    </div>
  );
}
