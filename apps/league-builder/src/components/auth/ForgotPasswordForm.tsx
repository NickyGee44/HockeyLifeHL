'use client';

/**
 * Forgot Password Form Component
 *
 * Email input form for requesting password reset
 * Uses BRAND-KIT gold/black theme
 */

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { requestPasswordReset } from '@/lib/actions/password-reset';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        setSubmitted(true);
        onSuccess?.();
      } else {
        setError(result.error || t('somethingWentWrong'));
      }
    } catch (err) {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (submitted) {
    return (
      <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-3">{t('checkYourEmail')}</h2>
        <p className="text-neutral-400 mb-6">
          {t.rich('resetEmailSent', {
            email: () => <span className="text-rink-500">{email}</span>,
          })}
        </p>
        <div className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 mb-6">
          <p className="text-sm text-neutral-300">
            <strong className="text-rink-500">{t('didntReceiveEmail')}</strong>
            <br />
            {t('checkSpamFolder')}
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => {
              setSubmitted(false);
              setEmail('');
            }}
            className="w-full py-3 px-6 border border-rink-500/30 text-rink-500 font-medium rounded-xl hover:bg-rink-500/10 transition-all"
          >
            {t('tryDifferentEmail')}
          </button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-rink-500/10 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-rink-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-2">{t('forgotPasswordTitle')}</h2>
        <p className="text-neutral-400 text-sm">
          {t('forgotPasswordDescription')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t('emailAddress')}
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className="w-full px-4 py-3 bg-black/50 border border-rink-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent transition-all"
            placeholder={t('emailPlaceholder')}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-3 px-6 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('sending')}
            </>
          ) : (
            t('sendResetLink')
          )}
        </button>
      </form>

      <div className="mt-6">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToLogin')}
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-700">
        <p className="text-xs text-neutral-500 text-center">
          {t('cantAccessEmail')}{' '}
          <Link href="/account-recovery" className="text-rink-500 hover:underline">
            {t('contactSupport')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordForm;
