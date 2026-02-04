import Link from 'next/link';
import { getTopLeagues } from '@/lib/data/league';

// Landing page for main domain - shows list of public leagues
export default async function HomePage() {
  const leagues = await getTopLeagues(20);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Hero */}
      <header className="border-b border-[var(--color-border)]">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-black text-[var(--color-accent)]">
            HockeyLifeHL
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Find your hockey league
          </p>
        </div>
      </header>

      {/* League List */}
      <main className="container mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-8">Public Leagues</h2>

        {leagues.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-secondary)]">
            <p>No public leagues available yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <Link
                key={league.slug}
                href={`/league/${league.slug}`}
                className="block p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
              >
                <h3 className="text-lg font-semibold">{league.slug}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  View league website &rarr;
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
