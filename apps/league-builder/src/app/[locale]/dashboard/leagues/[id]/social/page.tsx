import type { ReactNode } from 'react';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarRange, ImageIcon, Sparkles, Trophy } from 'lucide-react';
import { LeagueLogo } from '@/components/ui/league-logo';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type TemplateCard = {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  icon: ReactNode;
};

const templateCards: TemplateCard[] = [
  {
    eyebrow: 'Game Result',
    title: 'Score cards',
    description:
      'Single-game result graphics for final scores, logos, venue context, and fast post-game sharing.',
    accent: 'from-cyan-500/20 to-sky-500/5',
    icon: <ImageIcon className="h-4 w-4" />,
  },
  {
    eyebrow: 'Weekly Story',
    title: 'Weekly recap',
    description:
      'Multi-game roundups that package the week into one clean visual recap surface for social.',
    accent: 'from-fuchsia-500/20 to-pink-500/5',
    icon: <CalendarRange className="h-4 w-4" />,
  },
  {
    eyebrow: 'Standings Push',
    title: 'Standings updates',
    description:
      'Table-driven standings graphics that spotlight movement, points, and goal differential.',
    accent: 'from-amber-500/20 to-yellow-500/5',
    icon: <Trophy className="h-4 w-4" />,
  },
];

export default async function LeagueSocialGraphicsPage({ params }: Props) {
  const { locale, id: leagueId } = await params;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, logo_url, primary_color, secondary_color, city, state_province, timezone')
    .eq('id', leagueId)
    .single();

  if (error || !league) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {league.name}
          </Link>
        </div>

        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <LeagueLogo
                logoUrl={league.logo_url}
                leagueName={league.name}
                primaryColor={league.primary_color || '#22D3EE'}
                size="lg"
                shape="square"
                bordered
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rink-300/80">
                  Social Graphics
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                  {league.name} creative workspace
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-300">
                  Review the core graphic directions for score cards, weekly recaps, and standings
                  updates in one league-scoped workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/[0.10] bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-neutral-300">
                {league.timezone || 'Timezone not set'}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <InfoMetric
              label="League"
              value={league.name}
              helper={league.city ? `${league.city}${league.state_province ? `, ${league.state_province}` : ''}` : 'Location optional'}
            />
            <InfoMetric
              label="Template lanes"
              value="3 live directions"
              helper="Score cards, recaps, standings"
            />
            <InfoMetric
              label="Workspace"
              value="Social graphics"
              helper="Score cards, recaps, standings"
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Template library
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">Current social directions</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Use these template lanes as the starting point for league-branded graphics.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {templateCards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-3xl border border-white/[0.08] bg-gradient-to-br ${card.accent} p-[1px]`}
                >
                  <div className="h-full rounded-[calc(1.5rem-1px)] bg-neutral-950/90 p-5 backdrop-blur">
                    <div className="flex items-center gap-2 text-neutral-400">
                      <span className="rounded-xl bg-rink-500/10 p-2 text-rink-300">{card.icon}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                        {card.eyebrow}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-neutral-400">{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface-premium p-6">
              <div className="flex items-center gap-2 text-neutral-400">
                <span className="rounded-xl bg-rink-500/10 p-2 text-rink-300">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Included lanes
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">Built for repeatable league graphics</h3>
              <div className="mt-4 space-y-3 text-sm text-neutral-300">
                <StepRow title="Score cards" body="Use final-score visuals for same-night posting after games wrap." />
                <StepRow title="Weekly recaps" body="Package multiple results into one clean story for league channels." />
                <StepRow title="Standings updates" body="Highlight movement, points, and momentum with one consistent system." />
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-rink-400/20 bg-rink-500/10 px-4 py-2 text-sm font-semibold text-rink-200 transition-colors hover:bg-rink-500/20"
            >
              Back to league hub
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4 backdrop-blur-xl">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-3 truncate text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-neutral-400">{helper}</p>
    </div>
  );
}

function StepRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 leading-6 text-neutral-400">{body}</p>
    </div>
  );
}
