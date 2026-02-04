/**
 * Pricing & Billing Overview Page
 *
 * Shows the setup + processing fee model. No public tiers or subscriptions.
 */

import { DollarSign, Percent, Mail } from 'lucide-react';
import { getPlatformFeeConfig } from '@/lib/fees/platform-fees';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
};

function formatCAD(cents: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const feeConfig = await getPlatformFeeConfig();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Pricing</h1>
        <p className="text-muted-foreground">
          Simple, transparent pricing. One-time setup fee plus a small processing fee on player payments.
        </p>
      </div>

      {/* Setup Fee */}
      <div className="rounded-xl border border-white/10 bg-rink-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rink-500/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6 text-rink-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">
              {feeConfig.setupFeeCents > 0 ? formatCAD(feeConfig.setupFeeCents) : 'Contact Us'} &mdash; One-Time Setup Fee
            </h3>
            <p className="text-muted-foreground">
              Covers onboarding, platform configuration, domain setup assistance, and data migration.
              This is a one-time fee required to launch your league on the platform.
            </p>
          </div>
        </div>
      </div>

      {/* Processing Fee */}
      <div className="rounded-xl border border-white/10 bg-rink-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rink-500/10 flex items-center justify-center flex-shrink-0">
            <Percent className="w-6 h-6 text-rink-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">
              {feeConfig.processingFeePercent}% Payment Processing Fee
            </h3>
            <p className="text-muted-foreground">
              Applied to all player registration payments processed through the platform.
              This fee can be passed to players at checkout or absorbed by the league.
              Stripe&apos;s own card processing fees apply separately.
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rink-500/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6 text-rink-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">
              Custom Terms &amp; Enterprise
            </h3>
            <p className="text-muted-foreground mb-3">
              Need custom pricing, volume discounts, or enterprise features?
              Contact us to discuss your league&apos;s needs.
            </p>
            <a
              href="mailto:support@beerleaguehockey.ca?subject=Custom Pricing Inquiry"
              className="inline-flex items-center gap-2 px-4 py-2 bg-rink-500/10 text-rink-500 border border-rink-500/30 rounded-xl text-sm font-medium hover:bg-rink-500/20 transition-colors"
            >
              Request Pricing
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
