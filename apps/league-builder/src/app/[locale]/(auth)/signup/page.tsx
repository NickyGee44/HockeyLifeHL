'use client';

import { signUp } from '@/lib/actions/auth';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Loader2 } from 'lucide-react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export default function SignupPage() {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    try {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
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

  const inputClasses = cn(
    'w-full px-4 py-3 rounded-xl',
    'bg-neutral-800 border border-neutral-700',
    'text-white placeholder:text-neutral-500',
    'focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent',
    'transition-all'
  );

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-white mb-2">
        {t('auth.createAccount')}
      </h2>
      <p className="text-sm text-neutral-400 mb-6">
        {t('navigation.createLeague')}
      </p>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t('auth.fullName')}
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            required
            className={inputClasses}
            placeholder={t('auth.fullNamePlaceholder')}
          />
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
            className={inputClasses}
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
            className={inputClasses}
            placeholder="••••••••"
          />
          <div className="text-xs text-neutral-500 mt-1.5 space-y-0.5">
            <p className="font-medium text-neutral-400">{t('auth.passwordMustContain')}</p>
            <ul className="list-disc list-inside ml-1 space-y-0.5">
              <li>{t('auth.passwordRuleLength')}</li>
              <li>{t('auth.passwordRuleUppercase')}</li>
              <li>{t('auth.passwordRuleLowercase')}</li>
              <li>{t('auth.passwordRuleNumber')}</li>
              <li>{t('auth.passwordRuleSpecial')}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-700 pt-4">
          <label
            htmlFor="organizationName"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t('auth.companyName')}
          </label>
          <input
            type="text"
            id="organizationName"
            name="organizationName"
            required
            className={inputClasses}
            placeholder={t('auth.companyNamePlaceholder')}
          />
          <p className="text-xs text-neutral-500 mt-1">
            {t('auth.companyNameDescription')}
          </p>
          <p className="text-xs text-neutral-600 mt-0.5">
            {t('auth.companyNameExample')}
          </p>
        </div>

        <div className="border-t border-neutral-700 pt-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="acceptTerms"
              name="acceptTerms"
              value="true"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-rink-500 focus:ring-rink-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
              {t.rich('auth.acceptTerms', {
                link: (chunks) => (
                  <Link href="/terms" target="_blank" className="text-rink-500 hover:text-rink-400 underline" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    {chunks}
                  </Link>
                ),
              })}{' '}
              <span className="text-red-400">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              id="acceptPrivacy"
              name="acceptPrivacy"
              value="true"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-rink-500 focus:ring-rink-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-neutral-300 group-hover:text-neutral-200">
              {t.rich('auth.acceptPrivacy', {
                link: (chunks) => (
                  <Link href="/privacy" target="_blank" className="text-rink-500 hover:text-rink-400 underline" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    {chunks}
                  </Link>
                ),
              })}{' '}
              <span className="text-red-400">*</span>
            </span>
          </label>

          <p className="text-xs text-neutral-500">
            <span className="text-red-400">*</span> {t('auth.requiredField')}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !acceptedTerms || !acceptedPrivacy}
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
            t('auth.signup')
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            href="/login"
            className="text-rink-500 hover:text-rink-400 font-medium"
          >
            {t('auth.loginNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
