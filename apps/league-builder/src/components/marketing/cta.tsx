'use client';

import { Link } from '@/i18n/navigation';

const pricingCards = [
  {
    title: 'Standard',
    label: 'Ready to run fully online',
    price: 'Custom platform pricing',
    description:
      'For leagues ready to run registrations, payments, schedules, standings, stats, and league websites in one system.',
    bullets: [
      'Best fit for leagues already committed to online registration and payments.',
      'Pricing is scoped around league setup, season structure, and rollout needs.',
      'Built for leagues that want one operating system instead of another patchwork tool.',
    ],
  },
  {
    title: 'First Season Partner',
    label: 'Qualified switching offer',
    price: 'As low as 1.5%',
    description:
      'Flexible year-one pricing for qualified leagues based on league size, payment mix, and onboarding needs.',
    bullets: [
      'Designed to keep first-season costs predictable while your league transitions.',
      'Supports mixed payment workflows, including leagues still using some e-transfer.',
      'Built to reduce switching friction for leagues moving off spreadsheets and manual admin.',
    ],
    finePrint:
      'Available for qualified leagues. Final first-season pricing depends on league size, payment mix, and onboarding scope.',
    featured: true,
  },
  {
    title: 'Association / Multi-League',
    label: 'Volume and operational support',
    price: 'Custom pricing',
    description:
      'For associations, operators running multiple leagues, or organizations that need a broader rollout plan.',
    bullets: [
      'Volume-based commercial structure.',
      'Supports centralized operations, multiple properties, and staged onboarding.',
      'Best fit for leagues that need more than a single-season launch plan.',
    ],
  },
];

const faqItems = [
  {
    question: 'How does first season partner pricing work?',
    answer:
      'It is a year-one commercial offer for qualified leagues switching to BLH. We scope it around league size, payment mix, and onboarding needs so the first season is easier to budget and easier to launch.',
  },
  {
    question: 'Is the 1.5% rate available to every league?',
    answer:
      'No. It is not an automatic public rate. Qualified leagues may access first-season pricing as low as 1.5%, but the final structure depends on how the league actually operates.',
  },
  {
    question: 'What happens after season one?',
    answer:
      'After the first season, pricing is revisited based on real usage, payment volume, and how much of the league is running through BLH. The goal is to start with a workable transition, then settle into the right long-term structure.',
  },
  {
    question: 'Can we still use e-transfer?',
    answer:
      'Yes. For the right leagues, BLH can support a mixed first-season payment workflow while you transition operations into the platform. That is part of the onboarding and pricing conversation.',
  },
];

export function CallToAction() {
  return (
    <section
      id="pricing"
      className="relative w-full overflow-hidden border-t border-white/5 bg-background py-20 md:py-32"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
            Pricing for leagues switching to BLH
          </p>
          <h2 className="mt-5 font-heading text-4xl font-bold tracking-tight text-white uppercase sm:text-5xl md:text-7xl">
            First season partner pricing <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-ice to-steel bg-clip-text text-transparent">
              as low as 1.5%
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium text-neutral-400 md:text-xl">
            Flexible year-one pricing for qualified leagues based on league size, payment mix,
            and onboarding needs.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-neutral-500 md:text-base">
            Built to make switching easy, keep year-one costs predictable, and avoid forcing a
            one-size-fits-all pricing model on leagues with different payment realities.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {pricingCards.map((card) => (
            <article
              key={card.title}
              className={`rounded-[2rem] border p-7 text-left shadow-surface ${
                card.featured
                  ? 'border-accent/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(255,255,255,0.04))]'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <p className={`font-mono text-xs uppercase tracking-[0.2em] ${card.featured ? 'text-accent' : 'text-ice'}`}>
                {card.label}
              </p>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-white">{card.title}</h3>
              <p className="mt-4 text-3xl font-bold text-white">{card.price}</p>
              <p className="mt-4 text-sm leading-7 text-neutral-300">{card.description}</p>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-neutral-400">
                {card.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
              {card.finePrint ? (
                <p className="mt-6 rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4 text-xs leading-6 text-neutral-400">
                  {card.finePrint}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(17,24,39,0.9),rgba(59,130,246,0.1))] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.18em] text-rink-300">
                Predictable first-season structure
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white">
                If your league is switching from spreadsheets, e-transfer-heavy workflows, or a
                patchwork stack, we can scope year one to match the transition.
              </h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400">
                We keep the public message simple on purpose. The detailed structure is scoped in
                the demo and migration conversation so it fits how your league actually collects
                money and runs operations.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Link
                href="/book-demo"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-4 text-base font-semibold text-[#0B1420] transition-all duration-300 hover:scale-[1.03] md:px-8"
              >
                Book a Demo
              </Link>
              <a
                href="mailto:support@beerleaguehockey.ca?subject=BLH%20First%20Season%20Partner%20Pricing"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10 md:px-8"
              >
                Talk Through Pricing
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {faqItems.map((item) => (
            <article
              key={item.question}
              className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
            >
              <h3 className="text-lg font-semibold text-white">{item.question}</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-400">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
