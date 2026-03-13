import type { Metadata } from 'next';
import { Barlow_Condensed, IBM_Plex_Mono } from 'next/font/google';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { CallToAction } from '@/components/marketing/cta';

export const metadata: Metadata = {
  title: 'Pricing | BeerLeagueHockey.ca',
  description:
    'Explore BLH pricing, including first-season partner pricing for qualified leagues switching to BeerLeagueHockey.ca.',
};

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

const considerations = [
  {
    label: 'League size',
    body: 'How many teams, divisions, and registration cycles you actually run.',
  },
  {
    label: 'Payment mix',
    body: 'Whether your league is already fully online or still transitioning off e-transfer-heavy workflows.',
  },
  {
    label: 'Onboarding scope',
    body: 'Whether you need setup support, migration help, branding, or a phased rollout.',
  },
];

export default function PricingPage() {
  return (
    <main
      className={`${barlowCondensed.variable} ${mono.variable} min-h-screen bg-background text-foreground`}
    >
      <section className="border-b border-white/5 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,rgba(11,20,32,0.92),rgba(5,8,13,1))]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-300 transition-all duration-300 hover:-translate-y-[1px] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to homepage
          </Link>

          <div className="mt-8 max-w-4xl space-y-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">Public pricing</p>
            <h1 className="font-heading text-5xl font-bold uppercase tracking-tight text-white md:text-7xl">
              Flexible pricing for leagues switching to BLH.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-neutral-300 md:text-xl">
              BLH is priced like a serious hockey operations platform, but the public pricing story
              is deliberately simple. We scope the commercial model around league size, payment mix,
              and onboarding needs instead of forcing every league into the same transition.
            </p>
            <p className="max-w-3xl text-sm leading-7 text-neutral-400 md:text-base">
              That is why qualified leagues can access first-season partner pricing as low as 1.5%
              without us pretending every league fits the same year-one model.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {considerations.map((item) => (
              <article
                key={item.label}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 shadow-surface"
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  {item.label}
                </p>
                <p className="mt-4 text-sm leading-7 text-neutral-300">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CallToAction />

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                Next step
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                Want the real number for your league?
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-400">
                Bring your team count, registration model, and launch timing. We will tell you
                whether standard pricing or a first-season partner structure makes more sense for
                your rollout.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
              <Link
                href="/book-demo"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-base font-semibold text-[#0B1420] transition-all duration-300 hover:scale-[1.03]"
              >
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10"
              >
                Create an Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
