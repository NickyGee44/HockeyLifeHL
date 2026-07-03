'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellOff, BellRing, CheckCircle2, Loader2 } from 'lucide-react';
import { updateNotificationPreferences } from '@/lib/actions/notifications';
import {
  getPushSubscription,
  isPushSupported,
  registerServiceWorker,
  serializeSubscription,
  subscribeToPush,
} from '@/lib/push/client';

type ToggleMessage = { tone: 'neutral' | 'success' | 'error'; text: string } | null;

interface PushNotificationSettingsRowProps {
  initialPreferenceEnabled: boolean;
  onPreferenceChange?: (enabled: boolean) => void;
}

export function PushNotificationSettingsRow({
  initialPreferenceEnabled,
  onPreferenceChange,
}: PushNotificationSettingsRowProps) {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<ToggleMessage>(null);

  const loadPublicKey = useCallback(async () => {
    if (publicKey) return publicKey;

    const response = await fetch('/api/push/subscribe');
    const payload = response.ok ? await response.json() : null;
    const key = payload?.publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    setPublicKey(key);
    return key;
  }, [publicKey]);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (!isPushSupported()) {
        if (!cancelled) {
          setSupported(false);
          setEnabled(false);
          setLoading(false);
        }
        return;
      }

      try {
        await registerServiceWorker();
        const [subscription] = await Promise.all([
          getPushSubscription(),
          loadPublicKey(),
        ]);

        if (cancelled) return;

        setEnabled(Boolean(subscription) && initialPreferenceEnabled);
      } catch (error) {
        console.error('[PushNotificationSettingsRow] prepare failed:', error);
        if (!cancelled) {
          setMessage({
            tone: 'error',
            text: 'Unable to read push notification status in this browser.',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    prepare();

    return () => {
      cancelled = true;
    };
  }, [initialPreferenceEnabled, loadPublicKey]);

  const setPreference = useCallback(async (nextEnabled: boolean) => {
    const result = await updateNotificationPreferences({ push_enabled: nextEnabled });
    if (!result.success) {
      throw new Error(result.error || 'Unable to save push notification setting.');
    }
    onPreferenceChange?.(nextEnabled);
  }, [onPreferenceChange]);

  const handleToggle = useCallback(async () => {
    if (!supported) {
      setMessage({
        tone: 'neutral',
        text: 'On iPhone, add Hockey Life to your Home Screen first, then open the app icon to enable push notifications.',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (enabled) {
        const subscription = await getPushSubscription();
        const endpoint = subscription?.endpoint;
        await subscription?.unsubscribe();

        const response = await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });

        if (!response.ok) {
          throw new Error('Unable to disable push subscription.');
        }

        await setPreference(false);
        setEnabled(false);
        setMessage({ tone: 'success', text: 'Push notifications are disabled.' });
        return;
      }

      const key = await loadPublicKey();
      if (!key) {
        throw new Error('Push notifications are not ready yet. Try again in a moment.');
      }

      const subscription = await subscribeToPush(key);
      if (!subscription) {
        setMessage({
          tone: 'neutral',
          text: Notification.permission === 'denied'
            ? 'Browser notification permission is blocked. Enable it in browser settings, then try again.'
            : 'Browser notification permission was not enabled.',
        });
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

      await setPreference(true);
      setEnabled(true);
      setMessage({ tone: 'success', text: 'Push notifications are enabled.' });
    } catch (error) {
      console.error('[PushNotificationSettingsRow] toggle failed:', error);
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to update push notifications.',
      });
    } finally {
      setSaving(false);
    }
  }, [enabled, loadPublicKey, setPreference, supported]);

  const messageClass =
    message?.tone === 'success'
      ? 'text-green-400'
      : message?.tone === 'error'
        ? 'text-red-300'
        : 'text-[var(--color-text-muted)]';

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          Browser Push Notifications
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {enabled
            ? 'Enabled on this browser for game reminders and recap alerts.'
            : 'Disabled on this browser. Enable to receive game reminders and recap alerts.'}
        </p>
        {!supported ? (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            iPhone users must add Hockey Life to the Home Screen and open it from the app icon before push notifications can be enabled.
          </p>
        ) : null}
        {message ? (
          <p className={`mt-2 text-xs ${messageClass}`}>{message.text}</p>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-busy={saving || loading}
        onClick={handleToggle}
        disabled={saving || loading}
        className={`inline-flex min-h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${
          enabled
            ? 'border-green-500/35 bg-green-500/12 text-green-300 hover:bg-green-500/18'
            : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:border-[var(--league-primary)]/40'
        }`}
      >
        {loading || saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : enabled ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : supported ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {loading ? 'Checking' : enabled ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  );
}
