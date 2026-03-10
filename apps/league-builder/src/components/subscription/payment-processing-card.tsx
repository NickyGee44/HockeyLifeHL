import { CreditCard, Info } from 'lucide-react';

interface PaymentProcessingCardProps {
  platformFeePercent: number;
}

export function PaymentProcessingCard({ platformFeePercent }: PaymentProcessingCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="rounded-xl bg-rink-500/10 p-3">
          <CreditCard className="h-6 w-6 text-rink-500" />
        </div>
        <div>
          <h2 className="mb-1 text-lg font-bold text-white">Player payment fees</h2>
          <p className="text-sm text-neutral-400">
            Keep the billing language honest: Stripe processing and BLH platform fees are separate.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        <div className="rounded-xl bg-neutral-800/50 p-4">
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rink-500">{platformFeePercent}%</span>
            <span className="text-neutral-400">platform fee</span>
          </div>
          <p className="text-sm text-neutral-500">
            Added on eligible registration payments so leagues can pass BLH costs through to players.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-neutral-900/40 p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-rink-500" />
            <p className="text-sm text-neutral-300">
              Stripe processing fees are charged separately by Stripe to the league&apos;s connected
              account. They are not covered by the BLH platform fee.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-rink-500" />
            <p className="text-sm text-neutral-300">
              Use each league&apos;s billing page to manage Stripe Connect onboarding, payouts, and
              payment settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
