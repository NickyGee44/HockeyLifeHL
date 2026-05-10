'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Download, Loader2, Share, Smartphone, X } from 'lucide-react';
import { updateNotificationPreferences } from '@/lib/actions/notifications';
import {
  getPushSubscription,
  isPushSupported,
  registerServiceWorker,
  serializeSubscription,
  subscribeToPush,
} from '@/lib/push/client';
import { useInstallPrompt } from '@/lib/pwa/install';

type SetupMessage = { tone: 'neutral' | 'success' | 'error'; text: string } | null;

interface AppSetupControlsProps {
  leagueName: string;
  compact?: boolean;
}

export function AppSetupControls({ leagueName, compact = false }: AppSetupControlsProps) {
  const { canPromptInstall, isIos, isStandalone, promptInstallApp } = useInstallPrompt();
  const [publicKey, setPublicKey] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [hasPushSubscription, setHasPushSubscription] = useState(false);
  const [message, setMessage] = useState<SetupMessage>(null);

  useEffect(() => {
    let cancelled = false;

    async function preparePush() {
      if (!isPushSupported()) return;

      try {
        await registerServiceWorker();
        const [existingSubscription, keyResponse] = await Promise.all([
          getPushSubscription(),
          fetch('/api/push/subscribe'),
        ]);

        if (cancelled) return;

        setHasPushSubscription(!!existingSubscription);
        const keyPayload = keyResponse.ok ? await keyResponse.json() : null;
        setPublicKey(keyPayload?.publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '');
      } catch (error) {
        console.error('[AppSetupControls] preparePush failed:', error);
      }
    }

    preparePush();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (isStandalone) {
      setMessage({ tone: 'success', text: 'The app is already on this device.' });
      return;
    }

    if (isIos || !canPromptInstall) {
      setMessage({
        tone: 'neutral',
        text: isIos
          ? 'Tap Share, then Add to Home Screen.'
          : 'Use your browser menu to install or add this site to your home screen.',
      });
      return;
    }

    setIsInstalling(true);
    setMessage(null);

    try {
      const outcome = await promptInstallApp();
      if (outcome === 'accepted') {
        setMessage({ tone: 'success', text: 'App install started.' });
      } else if (outcome === 'dismissed') {
        setMessage({ tone: 'neutral', text: 'No problem. You can create the app later from this button.' });
      } else {
        setMessage({ tone: 'neutral', text: 'Use your browser menu to install or add this site to your home screen.' });
      }
    } catch (error) {
      console.error('[AppSetupControls] install failed:', error);
      setMessage({ tone: 'error', text: 'Unable to start app install from this browser.' });
    } finally {
      setIsInstalling(false);
    }
  }, [canPromptInstall, isIos, isStandalone, promptInstallApp]);

  const handleEnablePush = useCallback(async () => {
    if (!isPushSupported()) {
      setMessage({ tone: 'error', text: 'Push notifications are not supported in this browser.' });
      return;
    }

    if (!publicKey) {
      setMessage({ tone: 'error', text: 'Push notifications are not ready yet. Try again in a moment.' });
      return;
    }

    setIsEnablingPush(true);
    setMessage(null);

    try {
      const subscription = await subscribeToPush(publicKey);
      if (!subscription) {
        setMessage({ tone: 'neutral', text: 'Notifications were not enabled in this browser.' });
        return;
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: serializeSubscription(subscription) }),
      });

      if (!response.ok) {
        throw new Error('Unable to save push subscription.');
      }

      const prefResult = await updateNotificationPreferences({ push_enabled: true });
      if (!prefResult.success) {
        throw new Error(prefResult.error || 'Unable to enable push preference.');
      }

      setHasPushSubscription(true);
      setMessage({ tone: 'success', text: 'Push notifications are on.' });
    } catch (error) {
      console.error('[AppSetupControls] enable push failed:', error);
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to enable push notifications.',
      });
    } finally {
      setIsEnablingPush(false);
    }
  }, [publicKey]);

  const messageClass =
    message?.tone === 'success'
      ? 'text-emerald-300'
      : message?.tone === 'error'
        ? 'text-red-300'
        : 'text-[var(--color-text-secondary)]';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className={compact ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'grid gap-2 sm:grid-cols-2'}>
        <button
          type="button"
          onClick={handleInstall}
          disabled={isInstalling}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--league-primary)]/25 bg-[var(--league-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--league-primary)] transition-colors hover:bg-[var(--league-primary)]/18 disabled:opacity-60"
        >
          {isInstalling ? <Loader2 className="h-4 w-4 animate-spin" /> : isIos ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {isStandalone ? 'App Created' : 'Create App'}
        </button>
        <button
          type="button"
          onClick={handleEnablePush}
          disabled={isEnablingPush || hasPushSubscription}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--league-primary)]/40 disabled:opacity-60"
        >
          {isEnablingPush ? <Loader2 className="h-4 w-4 animate-spin" /> : hasPushSubscription ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <BellRing className="h-4 w-4" />}
          {hasPushSubscription ? 'Alerts On' : 'Turn On Alerts'}
        </button>
      </div>
      {message ? (
        <p className={`text-xs leading-relaxed ${messageClass}`}>{message.text}</p>
      ) : (
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          Create the {leagueName} app for faster access, then allow push reminders for games and recaps.
        </p>
      )}
    </div>
  );
}

interface OneTimeAppSetupPromptProps {
  leagueName: string;
  leagueSlug: string;
}

export function OneTimeAppSetupPrompt({ leagueName, leagueSlug }: OneTimeAppSetupPromptProps) {
  const [show, setShow] = useState(false);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  useEffect(() => {
    async function preparePrompt() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const key = `blh-app-setup-prompt:${leagueSlug}:${user.id}`;
      setStorageKey(key);
      if (!window.localStorage.getItem(key)) {
        window.setTimeout(() => setShow(true), 600);
      }
    }

    preparePrompt().catch((error) => {
      console.error('[OneTimeAppSetupPrompt] prepare failed:', error);
    });
  }, [leagueSlug]);

  const closePrompt = useCallback((status: 'completed' | 'dismissed') => {
    if (storageKey) {
      window.localStorage.setItem(storageKey, `${status}:${Date.now()}`);
    }
    setShow(false);
  }, [storageKey]);

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl md:inset-x-auto md:right-4">
      <button
        type="button"
        onClick={() => closePrompt('dismissed')}
        className="absolute right-3 top-3 rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
        aria-label="Dismiss app setup prompt"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <div className="rounded-lg bg-[var(--league-primary)]/15 p-2 text-[var(--league-primary)]">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Set up your Hockey Life app
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            Add {leagueName} to your home screen and turn on push notifications so game reminders and recaps reach you.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <AppSetupControls leagueName={leagueName} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => closePrompt('completed')}
          className="text-xs font-semibold text-[var(--league-primary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          Done
        </button>
        <button
          type="button"
          onClick={() => closePrompt('dismissed')}
          className="text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

interface AppSetupQuickActionButtonProps {
  leagueName: string;
}

export function AppSetupQuickActionButton({ leagueName }: AppSetupQuickActionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all hover:bg-[var(--color-surface-hover)]"
      >
        <Smartphone className="h-5 w-5 text-[var(--color-text-secondary)] transition-transform group-hover:scale-110" />
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          Create App
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Create your app
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  Add {leagueName} to your home screen and turn on game alerts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                aria-label="Close app setup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AppSetupControls leagueName={leagueName} compact />
          </div>
        </div>
      ) : null}
    </>
  );
}
