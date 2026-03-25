'use client';

const commissionerItems = [
  'Track balances and payment status without chasing captains in side chats.',
  'Control schedules, divisions, reminders, and league publishing from one place.',
  'Keep the public site, admin data, and player experience synced automatically.',
  'Stop paying separately for operations software and a league website.',
];

const playerItems = [
  'See schedules, standings, stats, and league updates in one place.',
  'Check balances and online registration status without emailing the commissioner.',
  'Land on a current, branded website instead of a stale league page.',
  'Get a cleaner weekly experience that actually feels like a live league.',
];

export function AudienceSplit() {
  return (
    <section id="why-blh" className="relative w-full border-y border-white/[0.07] bg-[#060b12] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
            Who the platform is for
          </p>
          <h2 className="mt-4 font-heading text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl md:text-6xl">
            Better for the commissioner. Better for the players.
          </h2>
          <p className="mt-5 text-lg leading-8 text-neutral-300">
            The public website only works if the operations side is clean. The operations side only
            sticks if players and captains trust the public site.
          </p>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-16">
          <div className="border-t border-white/10 pt-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-rink-300">
              For commissioners
            </p>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Keep the league moving without the patchwork.
            </h3>
            <ul className="mt-8 space-y-5">
              {commissionerItems.map((item) => (
                <li key={item} className="flex gap-4 text-sm leading-7 text-neutral-300 md:text-base">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ice">
              For players
            </p>
            <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Give the league a site people actually use.
            </h3>
            <ul className="mt-8 space-y-5">
              {playerItems.map((item) => (
                <li key={item} className="flex gap-4 text-sm leading-7 text-neutral-300 md:text-base">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rink-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
