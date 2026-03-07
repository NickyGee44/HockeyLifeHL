'use client';

import { Blocks, CreditCard, ImagePlus, Trophy } from 'lucide-react';
import { useLocale } from 'next-intl';
import { getHomeCopy } from './content';

const icons = [Blocks, ImagePlus, CreditCard, Trophy];

export function TrustIndicators() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <section className="border-y border-white/10 bg-neutral-950 py-16" aria-labelledby="platform-proof-heading">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-rink-300">
              {copy.proof.eyebrow}
            </p>
            <h2 id="platform-proof-heading" className="text-3xl font-bold text-white sm:text-4xl">
              {copy.proof.headline}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
            {copy.proof.subheadline}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {copy.proof.cards.map((card, index) => {
            const Icon = icons[index % icons.length];
            return (
              <article
                key={card.title}
                className="group rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-6 transition-transform hover:-translate-y-1"
              >
                <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-rink-500/10 p-3 text-rink-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{card.title}</h3>
                <p className="text-sm leading-7 text-neutral-400">{card.body}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {copy.proof.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-neutral-300"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
