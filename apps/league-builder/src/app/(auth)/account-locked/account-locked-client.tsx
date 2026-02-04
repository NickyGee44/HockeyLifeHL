'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AccountLockedMessage } from '@/components/auth';
import { Loader2 } from 'lucide-react';

function AccountLockedContent() {
  const searchParams = useSearchParams();
  const lockedUntil = searchParams.get('until');
  const email = searchParams.get('email');

  // If no lock time provided, redirect to login
  if (!lockedUntil) {
    return (
      <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl p-8 text-center">
        <p className="text-neutral-400">No lock information available.</p>
        <Link
          href="/login"
          className="inline-block mt-4 text-rink-500 hover:text-rink-400 transition-colors"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <AccountLockedMessage
      lockedUntil={lockedUntil}
      email={email || undefined}
    />
  );
}

function LoadingFallback() {
  return (
    <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl p-8 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-rink-500" />
    </div>
  );
}

export default function AccountLockedClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AccountLockedContent />
    </Suspense>
  );
}
