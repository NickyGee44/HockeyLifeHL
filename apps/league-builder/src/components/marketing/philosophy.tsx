'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const comparisonRows = [
  {
    label: 'Public website',
    typical: 'Often sold as a separate website builder, template tier, or add-on.',
    blh: 'Included as part of the league system, fed by live schedules, stats, standings, sponsors, and news.',
  },
  {
    label: 'Pricing model',
    typical: 'Frequently hidden behind demos, annual bundles, or extra admin software costs.',
    blh: 'Built so the platform fee can ride with player checkout while Stripe processing stays with the league.',
  },
  {
    label: 'Operations',
    typical: 'Registration, payments, scheduling, and communications are usually split across multiple surfaces.',
    blh: 'Commissioners run registrations, payments, schedules, reminders, and reporting in one hockey-first workflow.',
  },
  {
    label: 'Player experience',
    typical: 'Players bounce between form links, team chats, admin emails, and a stale public site.',
    blh: 'Players get one source of truth for schedules, standings, stats, balances, and weekly updates.',
  },
];

export function Philosophy() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.comparison-row', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
        },
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="comparison"
      ref={containerRef}
      className="relative w-full overflow-hidden border-t border-white/[0.07] bg-[#07101a] py-24 md:py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_34%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
            Why the public story matters
          </p>
          <h2 className="mt-4 font-heading text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl md:text-6xl">
            Most competitor sites sell the same checklist.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-300">
            Registration, payments, schedules, websites, communication, apps. That part is no
            longer unique. The sharper public message is how cleanly the website, operations, and
            fee model work together once the league actually launches.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="grid gap-0 border-b border-white/10 px-6 py-5 text-xs uppercase tracking-[0.24em] text-neutral-500 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)] md:px-8">
            <span>Focus area</span>
            <span className="md:px-6">Typical public competitor pattern</span>
            <span className="md:px-6">BLH</span>
          </div>

          {comparisonRows.map((row, index) => (
            <div
              key={row.label}
              className={`comparison-row grid gap-4 px-6 py-7 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)] md:px-8 ${
                index > 0 ? 'border-t border-white/[0.08]' : ''
              }`}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-rink-300">
                {row.label}
              </p>
              <p className="text-sm leading-7 text-neutral-400 md:px-6">{row.typical}</p>
              <p className="text-sm leading-7 text-white md:px-6">{row.blh}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
