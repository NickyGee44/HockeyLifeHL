import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 text-yellow-500 mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>

        <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or the league may have been
          removed.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 btn-primary px-6 py-3"
        >
          <Home className="w-5 h-5" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
