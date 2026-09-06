'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import {
  getPushSubscription,
  isPushSupported,
  registerServiceWorker,
  serializeSubscription,
  subscribeToPush,
} from '@/lib/push/client';

interface PushSubscriptionPromptProps {
  leagueName: string;
}

type PromptState = 'hidden' | 'ready' | 'subscribed' | 'unsupported' | 'blocked';

export function PushSubscriptionPrompt({ leagueName }: PushSubscriptionPromptProps) {
  const { user, isLoading } = useUser();
  const [state, setState] = useState<PromptState>('hidden');
  const [publicKey, setPublicKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (isLoading || !user) {
        setState('hidden');
        return;
      }

      if (!isPushSupported()) {
        setState('unsupported');
        return;
      }

      if (Notification.permission === 'denied') {
        setState('blocked');
        return;
      }

      await registerServiceWorker();
      const [existingSubscription, keyResponse] = await Promise.all([
        getPushSubscription(),
        fetch('/api/push/subscribe'),
      ]);

      if (cancelled) return;

      const keyPayload = keyResponse.ok ? await keyResponse.json() : null;
      const key = keyPayload?.publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
      setPublicKey(key);

      if (existingSubscription) {
        await saveSubscription(existingSubscription);
        if (!cancelled) setState('subscribed');
        return;
      }

      setState(key ? 'ready' : 'hidden');
    }

    prepare().catch((error) => {
      console.error('[PushSubscriptionPrompt] prepare failed:', error);
      if (!cancelled) setState('hidden');
    });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  if (state === 'hidden' || state === 'unsupported' || state === 'blocked') {
    return null;
  }

  if (state === 'subscribed') {
    return (
      <div className="glass-card fixed bottom-24 right-4 z-50 hidden max-w-xs items-center gap-2 rounded-[20px] border-emerald-500/20 px-3 py-2 text-xs text-[var(--color-text-secondary)] md:flex">
        <BellRing className="h-4 w-4 text-emerald-400" />
        <span>Game alerts are on.</span>
      </div>
    );
  }

  return (
    <div className="glass-card-strong fixed inset-x-4 bottom-24 z-50 rounded-[24px] p-4 md:inset-x-auto md:right-4 md:max-w-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-[var(--league-primary)]/15 p-2 text-[var(--league-primary)]">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Get game alerts
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {leagueName} can send check-in reminders, game reminders, and recap alerts here.
          </p>
          {message ? (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{message}</p>
          ) : null}
          <button
            type="button"
            onClick={handleEnable}
            disabled={isSaving}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--league-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-accent-text)] transition-opacity disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
            Enable alerts
          </button>
        </div>
      </div>
    </div>
  );

  async function handleEnable() {
    setIsSaving(true);
    setMessage(null);

    try {
      const subscription = await subscribeToPush(publicKey);
      if (!subscription) {
        setMessage('Notifications were not enabled in this browser.');
        return;
      }

      await saveSubscription(subscription);
      setState('subscribed');
    } catch (error) {
      console.error('[PushSubscriptionPrompt] enable failed:', error);
      setMessage(error instanceof Error ? error.message : 'Unable to enable alerts.');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSubscription(subscription: PushSubscription) {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: serializeSubscription(subscription) }),
    });

    if (!response.ok) {
      throw new Error('Unable to save push subscription.');
    }
  }
}
