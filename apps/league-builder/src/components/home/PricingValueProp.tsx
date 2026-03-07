'use client';

import { ArrowRight, Banknote, Building2, Wallet } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getHomeCopy } from './content';

const calloutIcons = [Building2, Banknote, Wallet];

export function PricingValueProp() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <section id="pricing" className="bg-neutral-900 px-6 py-24 lg:px-12" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-rink-300">
              {copy.pricing.eyebrow}
            </p>
            <h2 id="pricing-heading" className="text-3xl font-bold text-white sm:text-5xl">
              {copy.pricing.headline}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
            {copy.pricing.subheadline}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {copy.pricing.tiers.map((tier, index) => (
              <article
                key={tier.name}
                className={`rounded-[1.8rem] border p-6 ${index === 1 ? 'border-rink-500/35 bg-gradient-to-br from-rink-500/10 to-white/[0.04]' : 'border-white/10 bg-white/[0.04]'}`}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                  {index === 1 ? (
                    <span className="rounded-full border border-rink-400/20 bg-rink-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rink-200">
                      {copy.pricing.highlightedBadge}
                    </span>
                  ) : null}
                </div>
                <p className="min-h-[72px] text-sm leading-7 text-neutral-400">{tier.range}</p>
                <div className="mt-6 border-t border-white/10 pt-6">
                  <p className="text-2xl font-black leading-tight text-white">{tier.price}</p>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">{tier.detail}</p>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(34,211,238,0.08))] p-7">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.18em] text-rink-300">{copy.pricing.sidebarLabel}</p>
              <h3 className="mt-2 text-2xl font-bold text-white">{copy.pricing.sidebarHeadline}</h3>
            </div>
            <div className="space-y-4">
              {copy.pricing.callouts.map((callout, index) => {
                const Icon = calloutIcons[index % calloutIcons.length];
                return (
                  <div key={callout.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                    <div className="mb-3 inline-flex rounded-2xl bg-white/8 p-3 text-rink-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-base font-semibold text-white">{callout.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-neutral-400">{callout.body}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rink-500 to-arena-500 px-6 py-3.5 text-sm font-bold text-neutral-950 transition-transform hover:-translate-y-0.5"
              >
                {copy.pricing.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:hello@beerleaguehockey.ca?subject=League%20Migration"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/8"
              >
                {copy.pricing.secondaryCta}
              </a>
            </div>
            <p className="mt-5 text-sm leading-7 text-neutral-500">{copy.pricing.footer}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
