import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLeagueBySlug } from '@/lib/data';

interface TermsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

const TERMS_SECTIONS = [
  'Acceptance of Terms',
  'User Accounts & Registration',
  'League Participation',
  'Payments & Refunds',
  'Code of Conduct',
  'Liability & Waivers',
  'Data Collection & Use',
  'Termination',
  'Changes to Terms',
  'Contact Information',
];

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  return {
    title: league ? `Terms of Service | ${league.name}` : 'Terms of Service',
    description: league
      ? `Terms of Service for ${league.name}`
      : 'Terms of Service for league participation and registration',
  };
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 md:py-14">
      <article className="glass-card-strong overflow-hidden p-6 md:p-10 lg:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
          Terms of Service
        </h1>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          These terms apply to your use of {league.name} services, website features, and player
          registration flows.
        </p>

        <div className="mt-8 space-y-8">
          {TERMS_SECTIONS.map((section) => (
            <section key={section}>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{section}</h2>
              <p className="mt-2 max-w-3xl leading-7 text-[var(--color-text-secondary)]">
                Placeholder policy text for {section}. This section will be replaced with final
                legal language for this league.
              </p>
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          Last updated: February 2026
        </p>
        <a
          href={`/${leagueSlug}`}
          className="glass-control mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--blh-glass-border)] px-4 py-2 text-sm font-semibold text-[var(--league-primary)] transition-colors hover:border-[var(--league-primary)] hover:bg-[var(--color-surface-hover)]"
        >
          Back to {league.name}
        </a>
      </article>
    </div>
  );
}
