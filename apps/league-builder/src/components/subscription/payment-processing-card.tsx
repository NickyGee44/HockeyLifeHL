/**
 * Payment Processing Card Component
 *
 * Displays platform fee information (2.99% transaction fee model).
 */

import { CreditCard } from 'lucide-react';

interface PaymentProcessingCardProps {
  platformFeePercent: number;
}

export function PaymentProcessingCard({ platformFeePercent }: PaymentProcessingCardProps) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-xl bg-rink-500/10">
          <CreditCard className="w-6 h-6 text-rink-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Payment Processing</h2>
          <p className="text-neutral-400 text-sm">
            We charge {platformFeePercent}% on player registration payments. You can pass this fee to
            players or absorb it yourself.
          </p>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="bg-neutral-800/50 rounded-xl p-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-black text-rink-500">{platformFeePercent}%</span>
          <span className="text-neutral-400">per transaction</span>
        </div>
        <p className="text-sm text-neutral-500">
          Covers Stripe payment processing fees and platform costs. No monthly fees or hidden
          charges.
        </p>
      </div>
    </div>
  );
}
