'use client';

import { ArrowRightLeft, Archive, TableProperties } from 'lucide-react';
import { useLocale } from 'next-intl';
import { getHomeCopy } from './content';

const icons = [TableProperties, ArrowRightLeft, Archive];

export function ThreePillars() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <section id="migration" className="bg-neutral-950 px-6 py-24 lg:px-12" aria-labelledby="why-switch-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-rink-300">
            {copy.switchboard.eyebrow}
          </p>
          <h2 id="why-switch-heading" className="text-3xl font-bold text-white sm:text-5xl">
            {copy.switchboard.headline}
          </h2>
          <p className="mt-5 text-lg leading-8 text-neutral-400">
            {copy.switchboard.subheadline}
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="grid gap-6 md:grid-cols-3 xl:grid-cols-1">
            {copy.switchboard.lanes.map((lane, index) => {
              const Icon = icons[index % icons.length];
              return (
                <article
                  key={lane.title}
                  className="rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-white/[0.045] to-transparent p-6"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="rounded-2xl bg-white/8 p-3 text-rink-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-200">
                      {copy.switchboard.replaceLabel}
                    </span>
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">{lane.title}</h3>
                  <p className="mb-5 text-sm leading-7 text-neutral-400">{lane.body}</p>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{copy.switchboard.replaceSubtitle}</p>
                    <p className="mt-2 text-sm text-neutral-200">{lane.replace}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-rink-500/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(2,6,23,0.95))] p-8 shadow-[0_30px_100px_rgba(14,116,144,0.18)]">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-rink-500/12 blur-3xl" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rink-400/20 bg-rink-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rink-200">
                {copy.switchboard.migrationLabel}
              </div>
              <h3 className="text-2xl font-bold text-white sm:text-3xl">
                {copy.switchboard.migrationTitle}
              </h3>
              <p className="mt-4 text-base leading-8 text-neutral-300">
                {copy.switchboard.migrationBody}
              </p>

              <div className="mt-8 space-y-4">
                {copy.switchboard.migrationSteps.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rink-500/15 text-sm font-bold text-rink-200">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-neutral-200">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-3 text-sm text-rink-200">
                <ArrowRightLeft className="h-4 w-4" />
                {copy.switchboard.migrationFooter}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
