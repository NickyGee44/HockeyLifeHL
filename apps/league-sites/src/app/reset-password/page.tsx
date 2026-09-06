'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { updatePassword } from '@/lib/supabase/auth';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setError(new URLSearchParams(window.location.search).get('error'));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await updatePassword(password);

      if (updateError) {
        setError(
          updateError.message ||
            'This reset link is expired or invalid. Request a new password reset email.'
        );
        return;
      }

      setIsComplete(true);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError('Could not update your password. Request a new reset link and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className="league-site-shell relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-[var(--color-text-primary)]"
      data-blh-design-foundation="glass-v1"
    >
      <div className="league-atmosphere" aria-hidden="true">
        <span className="league-atmosphere__rink" />
      </div>
      <section className="glass-card-strong relative z-10 w-full max-w-md overflow-hidden p-6 sm:p-8">
        {isComplete ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
              Password Updated
            </h1>
            <p className="mb-6 text-[var(--color-text-secondary)]">
              Your password has been changed. You can continue back to your league.
            </p>
            <Link
              href="/"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--league-primary-border)] bg-[var(--league-primary-strong)] px-6 py-3 font-bold text-[var(--league-on-primary)] transition-colors hover:bg-[var(--league-primary-hover)]"
            >
              Continue
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--league-primary-border)] bg-[var(--league-primary-muted)]">
              <KeyRound className="h-6 w-6 text-[var(--blh-cyan)]" aria-hidden="true" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
              Reset Password
            </h1>
            <p className="mb-6 text-[var(--color-text-secondary)]">
              Enter a new password for your Hockey Life account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div role="alert" className="glass-control flex items-start gap-2 rounded-xl border border-red-400/25 p-3 text-sm text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] px-4 py-3 text-[var(--color-text-primary)] transition-colors focus:border-[var(--league-primary)] focus:outline-none"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="glass-control min-h-11 w-full rounded-xl border border-[var(--blh-glass-border)] px-4 py-3 text-[var(--color-text-primary)] transition-colors focus:border-[var(--league-primary)] focus:outline-none"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--league-primary-border)] bg-[var(--league-primary-strong)] px-6 py-3 font-bold text-[var(--league-on-primary)] transition-colors hover:bg-[var(--league-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
