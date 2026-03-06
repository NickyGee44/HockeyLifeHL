import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { ArrowLeft, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import type { PlayerPayment } from '@/lib/payments/types';

type Props = {
  params: Promise<{ locale: string; paymentId: string }>;
  searchParams?: Promise<{ status?: string }>;
};

function getPlayerPaymentPageBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export default async function PlayerPaymentPage({ params, searchParams }: Props) {
  const { locale, paymentId } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const status = resolvedSearchParams.status;

  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=${encodeURIComponent(`/payments/${paymentId}`)}`);
  }

  const { data: payment, error } = await supabase
    .from('player_payments')
    .select(
      `
      *,
      season_fee:season_fee_id(id, name, amount_cents),
      league:league_id(name)
    `
    )
    .eq('id', paymentId)
    .eq('player_id', user.id)
    .single();

  if (error || !payment) {
    notFound();
  }

  const playerPayment: PlayerPayment = {
    ...payment,
    base_amount_cents: payment.base_amount_cents ?? 0,
    discount_cents: payment.discount_cents ?? 0,
    installment_fee_cents: payment.installment_fee_cents ?? 0,
    late_fee_cents: payment.late_fee_cents ?? 0,
    total_amount_cents: payment.total_amount_cents ?? 0,
    amount_paid_cents: payment.amount_paid_cents ?? 0,
    currency: payment.currency || 'cad',
    total_installments: payment.total_installments ?? 1,
    current_installment: payment.current_installment ?? 0,
    reminder_sent_count: payment.reminder_sent_count ?? 0,
    metadata: (payment.metadata ?? {}) as Record<string, unknown>,
  };

  const baseUrl = getPlayerPaymentPageBaseUrl();
  const successUrl = `${baseUrl}/${locale}/payments/${paymentId}?status=success`;
  const cancelUrl = `${baseUrl}/${locale}/payments/${paymentId}?status=cancelled`;
  const amountOutstanding = Math.max(
    0,
    playerPayment.total_amount_cents - playerPayment.amount_paid_cents
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href={`/${locale}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>

        {status === 'success' && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Payment submitted.</p>
                <p className="mt-1 text-sm text-green-200/80">
                  Stripe accepted your payment. This page may take a moment to reflect the final status.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Checkout cancelled.</p>
                <p className="mt-1 text-sm text-amber-100/80">
                  No payment was processed. You can restart checkout below whenever you are ready.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">Player Payment</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {payment.season_fee?.name || 'Season fee'}
              </h1>
              <p className="mt-2 text-sm text-neutral-400">
                {payment.league?.name || 'League payment'} for {user.email}
              </p>
            </div>

            <div className="rounded-2xl border border-rink-500/20 bg-rink-500/10 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-rink-300/70">Outstanding</p>
              <p className="mt-1 text-2xl font-semibold text-rink-300">
                ${(amountOutstanding / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-neutral-900/70 p-4 sm:grid-cols-3">
            <StatBlock
              label="Status"
              value={String(playerPayment.status).replace(/_/g, ' ')}
            />
            <StatBlock
              label="Paid"
              value={`$${(playerPayment.amount_paid_cents / 100).toFixed(2)}`}
            />
            <StatBlock
              label="Plan"
              value={String(playerPayment.payment_plan).replace(/_/g, ' ')}
            />
          </div>

          <CheckoutButton
            className="max-w-xl"
            playerPayment={playerPayment}
            seasonFee={{
              id: payment.season_fee?.id || payment.season_fee_id,
              name: payment.season_fee?.name || 'Season fee',
              amount_cents: payment.season_fee?.amount_cents || playerPayment.total_amount_cents,
            }}
            successUrl={successUrl}
            cancelUrl={cancelUrl}
          />

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-neutral-900/60 p-4 text-sm text-neutral-400">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
            <p>
              This payment page only exposes your own payment record. If the amount or deadline looks
              wrong, contact your league administrator before submitting checkout.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-medium capitalize text-white">{value}</p>
    </div>
  );
}
