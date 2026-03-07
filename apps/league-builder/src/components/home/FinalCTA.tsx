'use client';

import Image from 'next/image';
import { ArrowRight, MoveRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { getHomeCopy } from './content';

export function FinalCTA() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <section className="bg-[linear-gradient(180deg,#111827_0%,#030712_100%)] px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(17,24,39,0.92),rgba(59,130,246,0.14))] p-8 shadow-[0_30px_120px_rgba(2,6,23,0.35)] lg:p-12">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt={copy.brand}
                width={72}
                height={72}
                className="h-16 w-16 object-contain"
              />
              <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rink-200">
                Beer League Hockey
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">{copy.finalCta.headline}</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-300">{copy.finalCta.subheadline}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[1.8rem] border border-white/10 bg-black/20 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rink-300">{copy.finalCta.primaryTitle}</p>
            <p className="mt-4 text-sm leading-7 text-neutral-300">{copy.finalCta.primaryBody}</p>
            <Link
              href="/signup"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rink-500 to-arena-500 px-6 py-3.5 text-sm font-bold text-neutral-950 transition-transform hover:-translate-y-0.5"
            >
              {copy.finalCta.primaryCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-arena-300">{copy.finalCta.secondaryTitle}</p>
            <p className="mt-4 text-sm leading-7 text-neutral-300">{copy.finalCta.secondaryBody}</p>
            <a
              href="mailto:hello@beerleaguehockey.ca?subject=League%20Migration"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/8"
            >
              {copy.finalCta.secondaryCta}
              <MoveRight className="h-4 w-4" />
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
