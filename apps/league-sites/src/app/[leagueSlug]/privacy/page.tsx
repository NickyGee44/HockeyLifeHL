import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLeagueBySlug } from '@/lib/data';

interface PrivacyPageProps {
  params: Promise<{ leagueSlug: string }>;
}

const PRIVACY_SECTIONS = [
  'Information We Collect',
  'How We Use Your Information',
  'Email Communications',
  'Data Sharing',
  'Data Retention',
  'Your Rights',
  'Cookies & Analytics',
  "Children's Privacy",
  'Changes to This Policy',
  'Contact Information',
];

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  return {
    title: league ? `Privacy Policy | ${league.name}` : 'Privacy Policy',
    description: league
      ? `Privacy Policy for ${league.name}`
      : 'Privacy Policy for league registration and website use',
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <article className="card p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
          Privacy Policy
        </h1>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          This policy describes how {league.name} collects and uses personal information.
        </p>

        <div className="mt-8 space-y-6">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section}>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{section}</h2>
              <p className="mt-2 text-[var(--color-text-secondary)] leading-relaxed">
                Placeholder policy text for {section}. Email communications are opt-in and handled
                in compliance with CASL requirements.
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
