'use client';

import { signIn } from '@/lib/actions/auth';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@hockey-life/ui/lib/utils';
import { Loader2 } from 'lucide-react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export default function LoginPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const redirectTo = searchParams.get('redirect');

  async function handleSubmit(formData: FormData) {
    setError(null);
    setWarning(null);
    setLoading(true);

    try {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);

        // Show remaining attempts warning if close to lockout
        if (result.remainingAttempts !== undefined && result.remainingAttempts <= 2 && result.remainingAttempts > 0) {
          setWarning(`${result.remainingAttempts} attempt${result.remainingAttempts === 1 ? '' : 's'} remaining before your account is locked.`);
        }
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-2">
        {t('auth.welcomeBack')}
      </h2>
      <p className="text-sm text-neutral-400 mb-6">
        {t('auth.enterEmail')}
      </p>

      <form action={handleSubmit} className="space-y-4">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t('auth.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-neutral-800 border border-neutral-700',
              'text-white placeholder:text-neutral-500',
              'focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent',
              'transition-all'
            )}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300"
            >
              {t('auth.password')}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-rink-500 hover:text-rink-400"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <input
            type="password"
            id="password"
            name="password"
            required
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-neutral-800 border border-neutral-700',
              'text-white placeholder:text-neutral-500',
              'focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent',
              'transition-all'
            )}
            placeholder="********"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {warning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <p className="text-sm text-amber-400">{warning}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full py-3 px-4 rounded-xl font-semibold text-sm',
            'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
            'hover:shadow-lg hover:shadow-rink-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all flex items-center justify-center gap-2'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            t('auth.login')
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400">
          {t('auth.dontHaveAccount')}{' '}
          <Link
            href="/signup"
            className="text-rink-500 hover:text-rink-400 font-medium"
          >
            {t('auth.signUpNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
