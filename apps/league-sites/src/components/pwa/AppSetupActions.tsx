'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BellOff, BellRing, Download, Loader2, Menu, MoreHorizontal, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/actions/notifications';
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
  const [isInstalling, setIsInstalling] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [message, setMessage] = useState<SetupMessage>(null);

  const handleInstall = useCallback(async () => {
    if (isStandalone) {
      setMessage({ tone: 'success', text: 'The app is already on this device.' });
      return;
    }

    if (isIos || !canPromptInstall) {
      setShowGuide(true);
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
        setShowGuide(true);
      }
    } catch (error) {
      console.error('[AppSetupControls] install failed:', error);
      setShowGuide(true);
    } finally {
      setIsInstalling(false);
    }
  }, [canPromptInstall, isIos, isStandalone, promptInstallApp]);

  const messageClass =
    message?.tone === 'success'
      ? 'text-emerald-300'
      : message?.tone === 'error'
        ? 'text-red-300'
        : 'text-[var(--color-text-secondary)]';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <button
        type="button"
        onClick={handleInstall}
        disabled={isInstalling}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--league-primary)]/25 bg-[var(--league-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--league-primary)] transition-colors hover:bg-[var(--league-primary)]/18 disabled:opacity-60"
      >
        {isInstalling ? <Loader2 className="h-4 w-4 animate-spin" /> : isIos ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {isStandalone ? 'App Created' : 'Create App'}
      </button>
      {message ? (
        <p className={`text-xs leading-relaxed ${messageClass}`}>{message.text}</p>
      ) : (
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          Create the {leagueName} app for faster access from your home screen.
        </p>
      )}
      {showGuide ? (
        <InstallGuideModal leagueName={leagueName} isIos={isIos} onClose={() => setShowGuide(false)} />
      ) : null}
    </div>
  );
}

function InstallGuideModal({
  leagueName,
  isIos,
  onClose,
}: {
  leagueName: string;
  isIos: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Add {leagueName} to your Home Screen
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {isIos
                ? 'On iPhone, open this page in Safari, use the Share menu, and add it to your Home Screen. Then launch it from the new icon to turn on alerts.'
                : 'This browser does not allow the site to create the app automatically. Follow these steps instead.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            aria-label="Close install guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3">
          {isIos ? <IosInstallSteps /> : <BrowserInstallSteps />}
        </div>
      </div>
    </div>
  );
}

function InstructionScreenshot({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-elevated)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--league-primary)] text-xs font-black text-[var(--color-accent-text)]">
          {step}
        </span>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white text-slate-950 shadow-inner">
        {children}
      </div>
    </div>
  );
}

function IosInstallSteps() {
  return (
    <>
      <InstructionScreenshot step="1" title="Tap Share in Safari">
        <div className="space-y-3 p-3">
          <div className="rounded-full bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-600">
            hockey-life.beerleaguehockey.ca
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
              <div className="h-8 w-8 rounded-lg bg-slate-900" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">Hockey Life - Player Profile</p>
                <p className="truncate text-[10px] text-slate-500">hockey-life.beerleaguehockey.ca</p>
              </div>
            </div>
            <div className="flex items-center justify-around rounded-xl bg-white py-2 shadow-sm">
              <MoreHorizontal className="h-5 w-5 text-slate-400" />
              <Share className="h-8 w-8 rounded-xl bg-sky-100 p-1.5 text-sky-600 ring-2 ring-sky-300" />
              <PlusSquare className="h-5 w-5 text-slate-400" />
            </div>
          </div>
        </div>
      </InstructionScreenshot>
      <InstructionScreenshot step="2" title="Scroll to Add to Home Screen">
        <div className="p-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-2 grid grid-cols-4 gap-2">
              {['Messages', 'WhatsApp', 'Copy', 'Reading List'].map((label) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="h-9 w-9 rounded-full bg-slate-200" />
                  <span className="max-w-full truncate text-[9px] font-semibold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 rounded-xl bg-white p-2 shadow-sm">
              {['Add to Bookmarks', 'Create a QR Code', 'Find in Page', 'Request Desktop Site', 'Print'].map((label) => (
                <div key={label} className="flex items-center gap-3 border-b border-slate-100 px-2 py-2 last:border-b-0">
                  <div className="h-5 w-5 rounded bg-slate-200" />
                  <span className="text-xs font-semibold text-slate-700">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-xl bg-white p-2 shadow-sm ring-2 ring-sky-300">
              <div className="flex items-center gap-3 px-2 py-2">
                <PlusSquare className="h-6 w-6 text-slate-800" />
                <span className="text-sm font-bold">Add to Home Screen</span>
              </div>
            </div>
          </div>
        </div>
      </InstructionScreenshot>
      <InstructionScreenshot step="3" title="Tap Add, then open the app">
        <div className="p-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-sm">
              <span className="text-slate-500">Cancel</span>
              <span className="font-semibold">Add to Home Screen</span>
              <span className="font-bold text-sky-600">Add</span>
            </div>
            <div className="flex items-center gap-3 p-3">
              <div className="h-10 w-10 rounded-xl bg-slate-900" />
              <div>
                <p className="text-sm font-semibold">Hockey Life</p>
                <p className="text-xs text-slate-500">beerleaguehockey.ca</p>
              </div>
            </div>
          </div>
        </div>
      </InstructionScreenshot>
    </>
  );
}

function BrowserInstallSteps() {
  return (
    <>
      <InstructionScreenshot step="1" title="Open your browser menu">
        <div className="space-y-3 p-3">
          <div className="rounded-full bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-600">
            hockey-life.beerleaguehockey.ca
          </div>
          <div className="flex justify-end rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <Menu className="h-7 w-7 rounded-xl bg-slate-200 p-1.5 text-slate-800 ring-2 ring-slate-300" />
          </div>
        </div>
      </InstructionScreenshot>
      <InstructionScreenshot step="2" title="Tap Install app or Add to Home Screen">
        <div className="p-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm">
              <Download className="h-6 w-6 text-slate-700" />
              <span className="text-sm font-semibold">Install app</span>
            </div>
          </div>
        </div>
      </InstructionScreenshot>
      <InstructionScreenshot step="3" title="Confirm the install">
        <div className="p-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold">Install Hockey Life?</p>
            <div className="mt-3 flex justify-end gap-2">
              <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500">Cancel</span>
              <span className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white">Install</span>
            </div>
          </div>
        </div>
      </InstructionScreenshot>
    </>
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
            Add {leagueName} to your home screen for faster access.
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
                  Add {leagueName} to your home screen for faster access.
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

export function PushAlertsQuickActionButton() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [publicKey, setPublicKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (!isPushSupported()) {
        setSupported(false);
        return;
      }

      try {
        await registerServiceWorker();
        const [subscription, keyResponse, prefs] = await Promise.all([
          getPushSubscription(),
          fetch('/api/push/subscribe'),
          getNotificationPreferences(),
        ]);

        if (cancelled) return;

        const keyPayload = keyResponse.ok ? await keyResponse.json() : null;
        setPublicKey(keyPayload?.publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '');
        setEnabled(Boolean(subscription) && prefs?.push_enabled !== false);
      } catch (error) {
        console.error('[PushAlertsQuickActionButton] prepare failed:', error);
      }
    }

    prepare();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleAlerts = useCallback(async () => {
    if (!supported) {
      setMessage('Install the app first, then turn alerts on here.');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      if (enabled) {
        const subscription = await getPushSubscription();
        const endpoint = subscription?.endpoint;
        await subscription?.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });

        const prefResult = await updateNotificationPreferences({ push_enabled: false });
        if (!prefResult.success) {
          throw new Error(prefResult.error || 'Unable to turn alerts off.');
        }

        setEnabled(false);
        setMessage('Alerts off');
        return;
      }

      if (!publicKey) {
        setMessage('Alerts are not ready yet.');
        return;
      }

      const subscription = await subscribeToPush(publicKey);
      if (!subscription) {
        setMessage('Browser notification permission was not enabled.');
        return;
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: serializeSubscription(subscription) }),
      });

      if (!response.ok) {
        throw new Error('Unable to save alerts.');
      }

      const prefResult = await updateNotificationPreferences({ push_enabled: true });
      if (!prefResult.success) {
        throw new Error(prefResult.error || 'Unable to turn alerts on.');
      }

      setEnabled(true);
      setMessage('Alerts on');
    } catch (error) {
      console.error('[PushAlertsQuickActionButton] toggle failed:', error);
      setMessage(error instanceof Error ? error.message : 'Unable to update alerts.');
    } finally {
      setIsSaving(false);
    }
  }, [enabled, publicKey, supported]);

  return (
    <button
      type="button"
      onClick={toggleAlerts}
      disabled={isSaving}
      aria-pressed={enabled}
      className="group relative flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-all hover:bg-[var(--color-surface-hover)] disabled:opacity-70"
      title={message || (enabled ? 'Game alerts are on' : 'Turn game alerts on')}
    >
      <span className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-[var(--color-border)]'}`} />
      {isSaving ? (
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-secondary)]" />
      ) : enabled ? (
        <BellRing className="h-5 w-5 text-emerald-300 transition-transform group-hover:scale-110" />
      ) : (
        <BellOff className="h-5 w-5 text-[var(--color-text-secondary)] transition-transform group-hover:scale-110" />
      )}
      <span className="text-xs font-medium text-[var(--color-text-primary)]">
        {enabled ? 'Alerts On' : 'Alerts Off'}
      </span>
    </button>
  );
}
