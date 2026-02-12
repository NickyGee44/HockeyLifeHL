'use client';

/**
 * Account Locked Message Component
 *
 * Displays when a user's account is locked due to too many failed attempts
 * Shows unlock time and provides support options
 * Uses BRAND-KIT gold/black theme
 */

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Clock, AlertTriangle, Mail, HelpCircle } from 'lucide-react';

interface AccountLockedMessageProps {
  /** When the account will be unlocked */
  lockedUntil: string;
  /** User's email for support context */
  email?: string;
  /** Callback when lockout expires */
  onExpired?: () => void;
}

export function AccountLockedMessage({
  lockedUntil,
  email,
  onExpired,
}: AccountLockedMessageProps) {
  const t = useTranslations('auth');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const unlockTime = new Date(lockedUntil);
      const diff = unlockTime.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        onExpired?.();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    }

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil, onExpired]);

  if (isExpired) {
    return (
      <div className="bg-neutral-800 border border-white/10 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
          <Lock className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-3">{t('accountUnlocked')}</h2>
        <p className="text-neutral-400 mb-6">
          {t('accountUnlockedDescription')}
        </p>
        <Link
          href="/login"
          className="inline-block w-full py-3 px-6 bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold rounded-xl hover:shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:scale-[1.02] transition-all duration-300 text-center"
        >
          {t('tryLoggingIn')}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 border border-red-500/30 rounded-2xl shadow-xl p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
          <Lock className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-2">{t('accountTemporarilyLocked')}</h2>
        <p className="text-neutral-400">
          {t('accountLockedDescription')}
        </p>
      </div>

      {/* Countdown Timer */}
      <div className="bg-neutral-900/50 border border-red-500/20 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Clock className="h-5 w-5 text-rink-500" />
          <span className="text-sm text-neutral-400">{t('timeUntilUnlock')}</span>
        </div>
        <div className="text-3xl font-bold text-rink-500 text-center font-mono">
          {timeRemaining}
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200 font-medium mb-1">{t('securityNotice')}</p>
            <p className="text-xs text-amber-300/70">
              {t('securityNoticeDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-neutral-300 mb-2">{t('whatCanIDo')}</h3>

        {/* Wait Option */}
        <div className="flex items-start gap-3 p-3 bg-neutral-900/50 rounded-lg">
          <Clock className="h-5 w-5 text-neutral-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-neutral-300">{t('waitForLockout')}</p>
            <p className="text-xs text-neutral-500">
              {t('accountAutoUnlock', { time: timeRemaining })}
            </p>
          </div>
        </div>

        {/* Reset Password */}
        <Link
          href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
          className="flex items-start gap-3 p-3 bg-neutral-900/50 rounded-lg hover:bg-neutral-900/70 transition-colors"
        >
          <Mail className="h-5 w-5 text-rink-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rink-500">{t('resetYourPassword')}</p>
            <p className="text-xs text-neutral-500">
              {t('requestPasswordResetLink')}
            </p>
          </div>
        </Link>

        {/* Contact Support */}
        <Link
          href="/account-recovery"
          className="flex items-start gap-3 p-3 bg-neutral-900/50 rounded-lg hover:bg-neutral-900/70 transition-colors"
        >
          <HelpCircle className="h-5 w-5 text-rink-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rink-500">{t('contactSupportOption')}</p>
            <p className="text-xs text-neutral-500">
              {t('lockedOutHelp')}
            </p>
          </div>
        </Link>
      </div>

      {/* Back to Login */}
      <div className="mt-6 pt-6 border-t border-neutral-700 text-center">
        <Link
          href="/login"
          className="text-sm text-neutral-400 hover:text-rink-500 transition-colors"
        >
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}

export default AccountLockedMessage;
