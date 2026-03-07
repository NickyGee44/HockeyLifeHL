'use client';

import { CalendarDays, ClipboardList, Goal, Shield, Users2, Wand2, Waves } from 'lucide-react';
import { useLocale } from 'next-intl';
import { getHomeCopy } from './content';

const roleIcons = [Shield, Goal, ClipboardList, Users2];

export function ProductModules() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <section id="operations" className="bg-[linear-gradient(180deg,#050816_0%,#0a1220_100%)] px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-20">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-rink-300">
            {copy.roles.eyebrow}
          </p>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-3xl text-3xl font-bold text-white sm:text-5xl">
              {copy.roles.headline}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-neutral-400 sm:text-base">
              {copy.roles.subheadline}
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {copy.roles.cards.map((card, index) => {
            const Icon = roleIcons[index % roleIcons.length];
            return (
              <article
                key={card.title}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.24)]"
              >
                <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 text-rink-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-4 text-xl font-semibold text-white">{card.title}</h3>
                <ul className="space-y-3 text-sm text-neutral-300">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rink-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-stretch">
          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-xs uppercase tracking-[0.18em] text-rink-300">{copy.operations.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-bold text-white">{copy.operations.websiteTitle}</h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-neutral-400">{copy.operations.websiteBody}</p>
            </div>
            <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#08101e] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{copy.operations.siteLabel}</p>
                    <p className="text-xs text-neutral-500">{copy.operations.sitePreviewLabel}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    <Wand2 className="h-3.5 w-3.5" />
                    {copy.operations.liveEditingLabel}
                  </div>
                </div>
                <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-gradient-to-br from-rink-500/10 via-white/[0.04] to-arena-500/10 p-4">
                  <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                    <div className="mb-6 h-28 rounded-[1rem] bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(59,130,246,0.22),rgba(255,255,255,0.05))]" />
                    <div className="space-y-3">
                      <div className="h-3 w-2/3 rounded-full bg-white/20" />
                      <div className="h-3 w-full rounded-full bg-white/10" />
                      <div className="h-3 w-4/5 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {copy.operations.websiteBullets.map((bullet) => (
                  <div key={bullet} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm font-medium text-white">{bullet}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.05] via-transparent to-rink-500/[0.08] p-6">
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-arena-300">{copy.operations.opsLabel}</p>
                <h3 className="mt-2 text-2xl font-bold text-white">{copy.operations.opsTitle}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400">{copy.operations.opsBody}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300">
                {copy.operations.opsSyncNote}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {copy.operations.opsBullets.map((bullet, index) => (
                <div key={bullet} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                  <div className="mb-3 inline-flex rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-neutral-400">
                    0{index + 1}
                  </div>
                  <p className="text-sm font-medium leading-7 text-white">{bullet}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.6rem] border border-rink-500/15 bg-[#08101e] p-6">
              <div className="mb-5 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-rink-300" />
                <h4 className="text-lg font-semibold text-white">{copy.operations.gamedayTitle}</h4>
              </div>
              <p className="mb-6 max-w-2xl text-sm leading-7 text-neutral-400">{copy.operations.gamedayBody}</p>
              <div className="grid gap-4 md:grid-cols-3">
                {copy.operations.gamedayBullets.map((bullet, index) => (
                  <div key={bullet} className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-3 inline-flex rounded-full bg-rink-500/10 p-2 text-rink-300">
                      {index === 0 ? <ClipboardList className="h-4 w-4" /> : index === 1 ? <Waves className="h-4 w-4" /> : <Goal className="h-4 w-4" />}
                    </div>
                    <p className="text-sm font-medium leading-6 text-neutral-100">{bullet}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
