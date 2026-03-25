'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const operations = [
  'Open registration and collect fees in the same workflow.',
  'Track balances, reminders, and payment status from league control.',
  'Publish schedules, standings, stats, and stories without copying data twice.',
  'Give captains, staff, and players one source of truth every week.',
];

const siteModules = [
  'Homepage hero, announcements, and sponsor placements',
  'Live schedule, standings, player stats, goalie stats, and team pages',
  'News, gallery coverage, and story-led league recaps',
  'League branding, colors, logos, and public pages without another site vendor',
];

export function Features() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.feature-block', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 72%',
        },
        y: 56,
        opacity: 0,
        duration: 1,
        stagger: 0.14,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="platform"
      ref={containerRef}
      className="relative w-full border-t border-white/[0.07] bg-background-elevated py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
            Built for the public side of the league
          </p>
          <h2 className="mt-4 font-heading text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl md:text-6xl">
            Your website should not be the afterthought.
          </h2>
          <p className="mt-5 text-lg leading-8 text-neutral-300">
            Competitors all promise an all-in-one platform. BLH makes the public website part of
            the operating system, not a second purchase or a stale template parked beside the real
            admin tools.
          </p>
        </div>

        <div className="feature-block mt-16 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-rink-300">
              Public league website
            </p>
            <h3 className="font-heading text-3xl font-bold uppercase tracking-tight text-white md:text-5xl">
              A real public front door for the league.
            </h3>
            <p className="max-w-2xl text-base leading-8 text-neutral-300 md:text-lg">
              Sponsors, standings, top players, recaps, registrations, schedule changes, and story
              moments should live on a site people actually check. BLH ships that site with the
              league, then keeps it fed from the same hockey data the commissioner is already
              managing.
            </p>
            <ul className="space-y-4">
              {siteModules.map((item) => (
                <li key={item} className="flex gap-4 text-sm leading-7 text-neutral-300 md:text-base">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-[2.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,15,0.86),rgba(4,7,11,0.98))] p-4 shadow-surface">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#08111b]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/bmhl-logo.png"
                    alt="Sample league logo"
                    className="h-11 w-11 rounded-full object-cover"
                    width={44}
                    height={44}
                  />
                  <div>
                    <p className="font-heading text-xl font-bold uppercase tracking-tight text-white">
                      Friday Night League
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                      Live public league homepage
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-rink-200">
                  Story-led
                </span>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.45fr_0.85fr]">
                <div className="relative min-h-[360px] overflow-hidden border-b border-white/[0.08] lg:border-b-0 lg:border-r">
                  <img
                    src="https://images.unsplash.com/photo-1515703407324-5f753afd8be8?auto=format&fit=crop&w=1400&q=80"
                    alt="Hockey game action"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,17,27,1),rgba(8,17,27,0.44),transparent)]" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-rink-200">
                      Latest recap
                    </p>
                    <h4 className="mt-3 max-w-lg font-heading text-3xl font-bold uppercase leading-tight tracking-tight text-white">
                      Wildcats clinch top seed after late winner in week 14.
                    </h4>
                    <p className="mt-3 max-w-md text-sm leading-7 text-neutral-200">
                      News, hero imagery, and current-season energy belong on the public homepage,
                      not buried behind an admin tool.
                    </p>
                  </div>
                </div>

                <div className="grid grid-rows-[auto_auto_1fr] bg-[#07101a]">
                  <div className="border-b border-white/[0.08] px-5 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                      Tonight
                    </p>
                    <div className="mt-3 space-y-3">
                      {[
                        'Wolves vs Bears · 8:45 PM',
                        'Jets vs Rustlers · 9:30 PM',
                        'Kings vs Outlaws · 10:15 PM',
                      ].map((game) => (
                        <div key={game} className="flex items-center justify-between text-sm text-white">
                          <span>{game}</span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                            Live site
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-b border-white/[0.08] px-5 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                      Top skaters
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        ['M. Keller', '28 pts'],
                        ['C. Marsh', '25 pts'],
                        ['J. Santos', '23 pts'],
                      ].map(([name, value]) => (
                        <div key={name} className="flex items-center justify-between text-sm text-neutral-200">
                          <span>{name}</span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-rink-200">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                      Sponsors + updates
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['Arena Dental', 'Smith Plumbing', 'Puck Stop Pub'].map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-neutral-300"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-neutral-400">
                      The site carries sponsor value, current league energy, and live operational
                      data in the same place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="feature-block mt-20 grid gap-10 border-t border-white/[0.08] pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#05080d] shadow-surface">
            <div className="border-b border-white/[0.08] px-6 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                Commissioner control
              </p>
            </div>
            <div className="space-y-0">
              {operations.map((item, index) => (
                <div
                  key={item}
                  className={`flex items-start gap-4 px-6 py-5 ${
                    index > 0 ? 'border-t border-white/[0.08]' : ''
                  }`}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-rink-300">
                    0{index + 1}
                  </span>
                  <p className="text-sm leading-7 text-neutral-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-rink-300">
              Operations without the patchwork
            </p>
            <h3 className="font-heading text-3xl font-bold uppercase tracking-tight text-white md:text-5xl">
              One database powers the admin side and the public side.
            </h3>
            <p className="max-w-2xl text-base leading-8 text-neutral-300 md:text-lg">
              The weekly league grind is where bad software shows itself. BLH keeps registration,
              payment status, schedules, standings, stats, and public publishing tied together so
              commissioners stop doing the same work in two systems.
            </p>
            <p className="max-w-2xl text-sm leading-7 text-neutral-400 md:text-base">
              That is the difference between having a feature list and having a league platform that
              actually reduces admin time once the season is live.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
