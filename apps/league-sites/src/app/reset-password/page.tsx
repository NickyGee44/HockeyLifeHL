'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { updatePassword } from '@/lib/supabase/auth';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

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
    <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-8 shadow-2xl">
        {isComplete ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
              Password Updated
            </h1>
            <p className="mb-6 text-[var(--color-text-secondary)]">
              Your password has been changed. You can continue back to your league.
            </p>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--league-primary)] px-6 py-3 font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90"
            >
              Continue
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--league-primary)]/15">
              <KeyRound className="h-6 w-6 text-[var(--league-primary)]" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
              Reset Password
            </h1>
            <p className="mb-6 text-[var(--color-text-secondary)]">
              Enter a new password for your Hockey Life account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
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
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3 text-[var(--color-text-primary)] transition-all duration-200 focus:border-[var(--league-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
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
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-3 text-[var(--color-text-primary)] transition-all duration-200 focus:border-[var(--league-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--league-primary)] px-6 py-3 font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
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
