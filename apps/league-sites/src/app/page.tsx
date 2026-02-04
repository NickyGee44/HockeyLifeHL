import Link from 'next/link';

/**
 * Root page for Platform 2 (League Sites)
 *
 * This page is only shown when accessing the base domain without a subdomain.
 * In production, users should always access via [league-slug].beerleaguehockey.ca
 *
 * For development, this page provides navigation to test different leagues.
 */
export default function RootPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-4 text-gold-500">
          Beer League Hockey - League Sites
        </h1>
        <p className="text-lg text-gray-400 mb-8">
          This is Platform 2 - the public-facing league website generator.
        </p>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <ul className="text-left text-gray-300 space-y-2">
            <li>
              <strong className="text-gold-400">Production:</strong> Access leagues via{' '}
              <code className="bg-neutral-800 px-2 py-1 rounded">
                [league-slug].beerleaguehockey.ca
              </code>
            </li>
            <li>
              <strong className="text-gold-400">Development:</strong> Access leagues via{' '}
              <code className="bg-neutral-800 px-2 py-1 rounded">
                [league-slug].localhost:3001
              </code>
            </li>
          </ul>
        </div>

        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Looking to manage your league?{' '}
            <Link
              href="https://app.beerleaguehockey.ca"
              className="text-gold-500 hover:text-gold-400 underline"
            >
              Go to League Builder
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
