'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  Loader2,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { getTeamInvoice } from '@/lib/actions/team-billing';

interface CaptainTeamFeesProps {
  invoiceId: string;
  teamName: string;
}

interface InvoicePayment {
  id: string;
  amount_cents: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

interface InvoiceDetail {
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
  payments?: InvoicePayment[];
  team_invoice_payments?: InvoicePayment[];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
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

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    text: 'text-yellow-500',
    icon: <Clock className="w-5 h-5" />,
  },
  partial: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-500',
    icon: <DollarSign className="w-5 h-5" />,
  },
  paid: {
    bg: 'bg-green-500/10 border-green-500/30',
    text: 'text-green-500',
    icon: <CheckCircle className="w-5 h-5" />,
  },
  overdue: {
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-500',
    icon: <AlertCircle className="w-5 h-5" />,
  },
  waived: {
    bg: 'bg-neutral-500/10 border-neutral-500/30',
    text: 'text-neutral-400',
    icon: <CheckCircle className="w-5 h-5" />,
  },
};

export function CaptainTeamFees({ invoiceId, teamName }: CaptainTeamFeesProps) {
  const t = useTranslations('teamBilling');
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getTeamInvoice(invoiceId);
      if (result.success && result.data) {
        setInvoice({
          ...result.data,
          payments: result.data.team_invoice_payments || [],
        });
      }
      setLoading(false);
    }
    load();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-rink-500" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-400">{t('noInvoices')}</p>
        <p className="text-sm text-neutral-500 mt-1">{t('contactLeagueAdmin')}</p>
      </div>
    );
  }

  const balance = invoice.total_amount_cents - invoice.amount_paid_cents;
  const statusStyle = STATUS_STYLES[invoice.status] || STATUS_STYLES.pending;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={cn('border rounded-xl p-6', statusStyle.bg)}>
        <div className="flex items-start gap-4">
          <div className={statusStyle.text}>{statusStyle.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{teamName}</h3>
            <p className={cn('text-sm font-medium', statusStyle.text)}>
              {t(`status${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`)}
            </p>
            {invoice.payment_deadline && invoice.status !== 'paid' && invoice.status !== 'waived' && (
              <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t('paymentDeadline')}: {formatDate(invoice.payment_deadline)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fee Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
          <p className="text-sm text-neutral-400 mb-1">{t('amountDue')}</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(invoice.total_amount_cents)}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {invoice.fee_basis === 'team'
              ? `Flat team fee${invoice.total_players > 0 ? ` • ${invoice.total_players} registered player${invoice.total_players === 1 ? '' : 's'}` : ''}`
              : `${invoice.total_players} ${t('players')} × ${formatCurrency(invoice.fee_per_player_cents)}`}
          </p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
          <p className="text-sm text-neutral-400 mb-1">{t('amountPaid')}</p>
          <p className="text-2xl font-bold text-green-500">
            {formatCurrency(invoice.amount_paid_cents)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">{t('paidSoFar')}</p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
          <p className="text-sm text-neutral-400 mb-1">{t('balanceDue')}</p>
          <p className={cn('text-2xl font-bold', balance > 0 ? 'text-yellow-500' : 'text-green-500')}>
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">{t('remainingBalance')}</p>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h4 className="font-semibold text-white">{t('paymentHistory')}</h4>
        </div>

        {(!invoice.payments || invoice.payments.length === 0) ? (
          <div className="p-6 text-center">
            <CreditCard className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">{t('noPaymentsYet')}</p>
            <p className="text-xs text-neutral-500 mt-1">{t('contactLeagueAdmin')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {invoice.payments.map((payment) => (
              <div key={payment.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {formatCurrency(payment.amount_cents)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {METHOD_LABELS[payment.payment_method] || payment.payment_method}
                    {payment.reference_number && ` — ${payment.reference_number}`}
                  </p>
                </div>
                <p className="text-xs text-neutral-400">{formatDate(payment.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes from admin */}
      {invoice.notes && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
          <p className="text-sm text-neutral-400 mb-1">{t('notes')}</p>
          <p className="text-sm text-white">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
