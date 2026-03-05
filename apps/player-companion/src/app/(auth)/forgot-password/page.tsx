'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@hockey-life/ui';
import { createClient } from '@/lib/supabase/client';

const platformAppUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${platformAppUrl}/api/auth/callback?type=recovery`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[360px] rounded-2xl border border-gold-500/20 bg-neutral-900/80 p-6 shadow-xl shadow-black/30">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-white">Reset your password</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Enter your email and you&apos;ll get a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
              aria-live="polite"
            >
              If an account exists for {email}, a reset email is on the way.
            </div>
            <Link
              href="/login"
              className="block text-center text-sm font-medium text-gold-500 transition-colors hover:text-gold-400"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                spellCheck={false}
                className={cn(
                  'w-full rounded-xl px-4 py-3',
                  'border border-gold-500/20 bg-neutral-850 text-white',
                  'placeholder:text-neutral-500',
                  'focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent'
                )}
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full rounded-xl py-3 text-base font-semibold text-black',
                'bg-gradient-to-r from-gold-500 to-gold-600',
                'hover:shadow-lg hover:shadow-gold-500/20 transition-[box-shadow,transform,opacity]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'active:scale-[0.98]'
              )}
            >
              {isLoading ? 'Sending reset link…' : 'Send Reset Link'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm font-medium text-neutral-400 transition-colors hover:text-gold-400"
            >
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
