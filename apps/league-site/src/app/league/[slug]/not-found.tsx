import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-black text-[var(--color-accent)] mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">League Not Found</h2>
        <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">
          The league you&apos;re looking for doesn&apos;t exist or is not publicly available.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-accent)] text-black font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="w-5 h-5" />
            Browse Leagues
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
