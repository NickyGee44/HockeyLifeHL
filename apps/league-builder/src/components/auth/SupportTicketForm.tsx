'use client';

/**
 * Support Ticket Form Component
 *
 * Form for submitting account recovery requests when self-service fails
 * Allows users to describe issues and request manual assistance
 * Uses BRAND-KIT gold/black theme
 */

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  HelpCircle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Lock,
  Mail,
  User,
  AlertCircle,
} from 'lucide-react';
import { submitRecoveryRequest } from '@/lib/actions/password-reset';

interface SupportTicketFormProps {
  /** Pre-fill email if known */
  defaultEmail?: string;
  /** Pre-select recovery type */
  defaultType?: string;
  /** Success callback */
  onSuccess?: (ticketId: string) => void;
}

export function SupportTicketForm({
  defaultEmail,
  defaultType,
  onSuccess,
}: SupportTicketFormProps) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState(defaultEmail || '');
  const [recoveryType, setRecoveryType] = useState(defaultType || '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const RECOVERY_TYPES = [
    {
      value: 'password_reset',
      label: t('cantResetPassword'),
      description: t('cantResetPasswordDescription'),
      icon: Lock,
    },
    {
      value: 'account_unlock',
      label: t('accountLocked'),
      description: t('accountLockedHelp'),
      icon: Lock,
    },
    {
      value: 'email_change',
      label: t('emailChange'),
      description: t('emailChangeDescription'),
      icon: Mail,
    },
    {
      value: 'account_access',
      label: t('accountAccess'),
      description: t('accountAccessDescription'),
      icon: User,
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !recoveryType || !description) {
      setError(t('fillAllFields'));
      return;
    }

    if (description.length < 10) {
      setError(t('provideMoreDetails'));
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('recoveryType', recoveryType);
      formData.append('description', description);

      const result = await submitRecoveryRequest(formData);

      if (result.success && result.data) {
        setTicketId(result.data.ticketId);
        setSubmitted(true);
        onSuccess?.(result.data.ticketId);
      } else {
        setError(result.error || t('failedToSubmit'));
      }
    } catch (err) {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (submitted && ticketId) {
    return (
      <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-3">{t('requestSubmitted')}</h2>
        <p className="text-neutral-400 mb-4">
          {t('requestSubmittedDescription')}
        </p>

        {/* Ticket ID */}
        <div className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 mb-6">
          <p className="text-xs text-neutral-500 mb-1">{t('referenceNumber')}</p>
          <p className="text-lg font-mono text-rink-500">{ticketId.substring(0, 8).toUpperCase()}</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 text-left">
          <h3 className="text-sm font-medium text-blue-300 mb-2">{t('whatHappensNext')}</h3>
          <ul className="text-xs text-blue-200/70 space-y-1.5">
            <li>{t('supportReview')}</li>
            <li>{t('emailUpdate')}</li>
            <li>{t('additionalVerification')}</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setSubmitted(false);
              setTicketId(null);
              setDescription('');
            }}
            className="w-full py-3 px-6 border border-rink-500/30 text-rink-500 font-medium rounded-xl hover:bg-rink-500/10 transition-all"
          >
            {t('submitAnotherRequest')}
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
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-rink-500/10 rounded-full flex items-center justify-center">
          <HelpCircle className="h-6 w-6 text-rink-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-2">{t('accountRecovery')}</h2>
        <p className="text-neutral-400 text-sm">
          {t('accountRecoveryDescription')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t('accountEmail')}
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-black/50 border border-rink-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent transition-all"
            placeholder={t('emailPlaceholder')}
          />
        </div>

        {/* Recovery Type Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-3">
            {t('whatsTheIssue')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RECOVERY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setRecoveryType(type.value)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  recoveryType === type.value
                    ? 'bg-rink-500/10 border-rink-500/50'
                    : 'bg-neutral-900/50 border-neutral-700 hover:border-rink-500/30'
                }`}
              >
                <type.icon
                  className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    recoveryType === type.value ? 'text-rink-500' : 'text-neutral-500'
                  }`}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      recoveryType === type.value ? 'text-rink-500' : 'text-neutral-300'
                    }`}
                  >
                    {type.label}
                  </p>
                  <p className="text-xs text-neutral-500">{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            {t('describeYourIssue')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-3 bg-black/50 border border-rink-500/30 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-transparent transition-all resize-none"
            placeholder={t('descriptionPlaceholder')}
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            {t('characterCount', { count: description.length })}
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-neutral-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-neutral-400">
                {t('securityVerificationNotice')}
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !email || !recoveryType || !description}
          className="w-full py-3 px-6 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('submitting')}
            </>
          ) : (
            t('submitRequest')
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-6">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToLogin')}
        </Link>
      </div>

      {/* Alternative Options */}
      <div className="mt-6 pt-6 border-t border-neutral-700">
        <p className="text-xs text-neutral-500 text-center">
          {t('rememberYourPassword')}{' '}
          <Link href="/login" className="text-rink-500 hover:underline">
            {t('signIn')}
          </Link>
          {' | '}
          <Link href="/forgot-password" className="text-rink-500 hover:underline">
            {t('resetPassword')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SupportTicketForm;
