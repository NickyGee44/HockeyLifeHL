'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ResetPasswordForm } from '@/components/auth';
import { Loader2 } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleRecoveryToken() {
      const supabase = createClient();

      // Check if we have a valid session (from the recovery link)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Invalid or expired link');
      } else if (!session) {
        // Check URL for error codes
        const errorCode = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorCode === 'access_denied' || errorDescription?.includes('expired')) {
          setError('Invalid or expired link');
        } else {
          // No session and no explicit error - might be a direct navigation
          // The auth callback should have set up the session if the link was valid
          setError('Invalid or expired link');
        }
      }

      setLoading(false);
    }

    handleRecoveryToken();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-rink-500 mx-auto mb-4" />
        <p className="text-neutral-400">Verifying your reset link...</p>
      </div>
    );
  }

  return <ResetPasswordForm error={error || undefined} />;
}

function LoadingFallback() {
  return (
    <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl p-8 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-rink-500 mx-auto mb-4" />
      <p className="text-neutral-400">Loading...</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
