'use client';

import { signUp } from '@/lib/actions/auth';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    try {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-neutral-900 border border-gold-500/20 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {t('auth.checkEmail')}
        </h2>
        <p className="text-sm text-neutral-400">
          {t('auth.passwordResetSent')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-gold-500/20 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-2">
        {t('auth.createAccount')}
      </h2>
      <p className="text-sm text-neutral-400 mb-6">
        {t('navigation.createLeague')}
      </p>

      <form action={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              {t('auth.firstName')}
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-neutral-800 border border-neutral-700',
                'text-white placeholder:text-neutral-500',
                'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent',
                'transition-all'
              )}
              placeholder="John"
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              {t('auth.lastName')}
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-neutral-800 border border-neutral-700',
                'text-white placeholder:text-neutral-500',
                'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent',
                'transition-all'
              )}
              placeholder="Doe"
            />
          </div>
        </div>

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
              'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent',
              'transition-all'
            )}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t('auth.password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            minLength={8}
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-neutral-800 border border-neutral-700',
              'text-white placeholder:text-neutral-500',
              'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent',
              'transition-all'
            )}
            placeholder="********"
          />
          <p className="text-xs text-neutral-500 mt-1">
            {t('validation.minLength', { min: 8 })}
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t('auth.confirmPassword')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            required
            className={cn(
              'w-full px-4 py-3 rounded-xl',
              'bg-neutral-800 border border-neutral-700',
              'text-white placeholder:text-neutral-500',
              'focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent',
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

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full py-3 px-4 rounded-xl font-semibold text-sm',
            'bg-gradient-to-r from-gold-500 to-gold-600 text-black',
            'hover:shadow-lg hover:shadow-gold-500/20',
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
            t('auth.signup')
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            href="/login"
            className="text-gold-500 hover:text-gold-400 font-medium"
          >
            {t('auth.loginNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
