import Link from 'next/link';

interface Props {
  params: Promise<{ leagueSlug: string }>;
}

export default async function GoalieRegisterConfirmationPage({ params }: Props) {
  const { leagueSlug } = await params;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-xl mx-auto card p-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Registration Submitted</h1>
        <p className="text-[var(--color-text-secondary)] mt-2">
          You are now in the goalie marketplace queue. You will receive request emails when teams need a sub.
        </p>
        <Link
          href={`/${leagueSlug}`}
          className="inline-flex mt-6 rounded-lg bg-[var(--league-primary)] px-4 py-2 font-semibold text-[var(--color-accent-text)]"
        >
          Back to League Site
        </Link>
      </div>
    </div>
  );
}
