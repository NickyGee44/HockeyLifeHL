'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Check, ArrowRight } from 'lucide-react';

const benefits = [
  'pricing.benefit1',
  'pricing.benefit2',
  'pricing.benefit3',
  'pricing.benefit4',
];

export function PricingValueProp() {
  const t = useTranslations('homepage');

  return (
    <div className="px-6 py-24 lg:px-12 bg-neutral-900">
      <div className="max-w-4xl mx-auto">
        <div className="relative p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-rink-500/10 via-neutral-900 to-arena-500/10 border border-white/10 overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-rink-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-arena-500/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-10">
              <span className="inline-block px-4 py-1 rounded-full bg-rink-500/20 text-rink-400 text-sm font-medium mb-4">
                {t('pricing.badge')}
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                {t('pricing.headline')}
              </h2>
              <p className="text-lg text-neutral-300">
                {t('pricing.subheadline')}
              </p>
            </div>

            {/* Pricing Display */}
            <div className="flex flex-col items-center mb-10">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl lg:text-7xl font-black text-white">$0</span>
                <span className="text-2xl text-neutral-400">/month</span>
              </div>
              <p className="text-neutral-400">
                {t('pricing.fee')}{' '}
                <span className="text-rink-400 font-semibold">2.99%</span>{' '}
                {t('pricing.feeContext')}
              </p>
            </div>

            {/* Benefits */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-rink-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-rink-400" />
                  </div>
                  <span className="text-neutral-300">{t(benefit)}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-rink-500 to-arena-500 text-neutral-950 font-bold rounded-xl hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-rink-500/25"
              >
                {t('pricing.cta')}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="mt-4 text-sm text-neutral-500">
                {t('pricing.noCard')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
