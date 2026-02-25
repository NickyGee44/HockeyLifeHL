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
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <article className="card p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
          Terms of Service
        </h1>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          These terms apply to your use of {league.name} services, website features, and player
          registration flows.
        </p>

        <div className="mt-8 space-y-6">
          {TERMS_SECTIONS.map((section) => (
            <section key={section}>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{section}</h2>
              <p className="mt-2 text-[var(--color-text-secondary)] leading-relaxed">
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
          className="mt-4 inline-flex text-sm font-medium text-[var(--league-primary)] hover:opacity-80"
        >
          Back to {league.name}
        </a>
      </article>
    </div>
  );
}
