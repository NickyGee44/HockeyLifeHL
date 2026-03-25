'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

const signalItems = [
  {
    label: 'Public website included',
    body: 'Schedules, standings, stats, sponsors, news, and player pages live in the same system.',
  },
  {
    label: 'League pays Stripe',
    body: "Stripe processing stays with the league's connected account instead of hiding inside a software bundle.",
  },
  {
    label: 'Players pay BLH',
    body: 'The BLH platform fee can ride with online checkout so software cost does not become another admin invoice.',
  },
];

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-element', {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.15,
      });

      gsap.from('.hero-bg', {
        scale: 1.04,
        duration: 2.4,
        ease: 'power2.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[100svh] w-full items-end overflow-hidden bg-background pt-28 md:pt-0"
    >
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#05080d]">
        <div className="hero-bg absolute inset-0 h-full w-full opacity-45">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover object-center"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_82%_24%,rgba(59,130,246,0.16),transparent_28%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05080d]/30 via-[#05080d]/38 to-[#05080d]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,10,15,1),rgba(7,10,15,0.68),rgba(7,10,15,0.16))]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col justify-end px-6 pb-14 md:pb-18">
        <div className="max-w-4xl">
          <div className="hero-element inline-flex items-center gap-3 rounded-full border border-white/[0.12] bg-black/25 px-4 py-2 backdrop-blur-md">
            <img
              src="/logo.png"
              alt="BeerLeagueHockey.ca"
              className="h-9 w-9 rounded-full object-cover"
              width={36}
              height={36}
            />
            <div>
              <p className="font-heading text-lg font-bold uppercase tracking-[0.08em] text-white">
                BeerLeagueHockey.ca
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-400">
                League Builder
              </p>
            </div>
          </div>

          <p className="hero-element mt-8 font-mono text-xs uppercase tracking-[0.28em] text-accent">
            Commissioner-first hockey operations
          </p>

          <h1 className="hero-element mt-4 max-w-4xl font-heading text-5xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[6.2rem]">
            Run the league.
            <span className="mt-2 block bg-gradient-to-r from-white via-rink-200 to-rink-400 bg-clip-text text-transparent">
              Publish the site.
            </span>
          </h1>

          <p className="hero-element mt-6 max-w-2xl text-lg font-medium leading-8 text-neutral-300 md:text-xl">
            Registrations, payments, schedules, standings, stats, sponsors, and news in one
            hockey-first system with a live public league website built in.
          </p>

          <div className="hero-element mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/[0.14] bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
              League pays Stripe processing
            </span>
            <span className="rounded-full border border-accent/[0.35] bg-accent/[0.12] px-4 py-2 text-sm font-semibold text-rink-100 backdrop-blur-md">
              Players pay the BLH platform fee
            </span>
          </div>

          <div className="hero-element mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/book-demo"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-[#0B1420] transition-all duration-300 hover:scale-[1.03]"
            >
              Book a Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/[0.18] bg-black/[0.18] px-7 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10"
            >
              See Pricing
            </Link>
          </div>

          <p className="hero-element mt-5 max-w-2xl text-sm leading-7 text-neutral-400">
            Qualified leagues switching to BLH can access first-season partner pricing as low as
            1.5% while migration, payment mix, and rollout are scoped around the way the league
            actually runs.
          </p>
        </div>

        <div className="hero-element mt-12 grid gap-5 border-t border-white/[0.12] pt-6 sm:grid-cols-3">
          {signalItems.map((item) => (
            <div key={item.label} className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-rink-300">
                {item.label}
              </p>
              <p className="max-w-sm text-sm leading-6 text-neutral-300">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
