'use client';

import Image from 'next/image';
import { ArrowRight, Play, ShieldCheck, UploadCloud, WandSparkles } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getHomeCopy } from './content';

const heroIcons = [ShieldCheck, UploadCloud, WandSparkles];

export function HeroSection() {
  const locale = useLocale();
  const copy = getHomeCopy(locale);

  return (
    <section className="relative overflow-hidden min-h-screen">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.2),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.4),rgba(2,6,23,0.92))]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt={copy.brand}
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
          />
          <span className="font-black text-xl tracking-tight text-white">
            Beer League <span className="text-gradient-rink">Hockey</span>
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
          >
            {copy.hero.login}
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-rink-500 to-arena-500 px-4 py-2 text-sm font-medium text-neutral-950 transition-opacity hover:opacity-90"
          >
            {copy.hero.signup}
          </Link>
        </div>
      </nav>

      <div className="relative z-10 flex min-h-[calc(100vh-84px)] items-center px-6 pb-16 pt-10 lg:px-12 lg:pb-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:items-end">
          <div className="max-w-4xl">
            <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/15 bg-white/10 p-4 backdrop-blur-md shadow-[0_20px_80px_rgba(2,6,23,0.35)] sm:h-28 sm:w-28">
                <Image
                  src="/logo.png"
                  alt={copy.brand}
                  width={112}
                  height={112}
                  className="h-full w-full object-contain drop-shadow-2xl"
                  priority
                />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rink-200">
                  {copy.hero.brandLabel}
                </p>
                <p className="mt-2 text-sm text-neutral-300 sm:text-base">
                  {copy.hero.brandSublabel}
                </p>
              </div>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-200 backdrop-blur-sm sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-rink-400" />
              {copy.hero.eyebrow}
            </div>

            <div className="mb-7">
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl xl:text-8xl">
                {copy.hero.headline}
                <span className="mt-2 block text-gradient-rink">{copy.hero.headlineAccent}</span>
              </h1>
            </div>

            <p className="mb-10 max-w-3xl text-lg leading-8 text-neutral-200 drop-shadow-md sm:text-xl">
              {copy.hero.subheadline}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rink-500 to-arena-500 px-8 py-4 text-base font-bold text-neutral-950 shadow-lg shadow-rink-500/25 transition-transform hover:-translate-y-0.5"
              >
                {copy.hero.primaryCta}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="mailto:hello@beerleaguehockey.ca?subject=League%20Migration"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/8 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/14"
              >
                {copy.hero.migrationCta}
              </a>
              <a
                href="https://demo.beerleaguehockey.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-bold text-white transition-colors hover:bg-white/10"
              >
                <Play className="h-5 w-5" />
                {copy.hero.demoCta}
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-black/35 p-5 backdrop-blur-md shadow-[0_30px_120px_rgba(2,6,23,0.45)]">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-rink-300">{copy.proof.eyebrow}</p>
                <h2 className="mt-1 max-w-sm text-xl font-semibold text-white">{copy.hero.panelTitle}</h2>
              </div>
              <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                {copy.hero.statusLabel}
              </div>
            </div>
            <div className="space-y-3">
              {copy.hero.proof.map((item, index) => {
                const Icon = heroIcons[index % heroIcons.length];
                return (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4"
                  >
                    <div className="mt-0.5 rounded-xl bg-rink-500/12 p-2 text-rink-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-neutral-200">{item}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/30 p-2">
            <div className="h-3 w-1.5 rounded-full bg-rink-500 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
