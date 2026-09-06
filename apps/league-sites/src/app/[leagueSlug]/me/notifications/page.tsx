'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  ChevronLeft,
  Loader2,
  Check,
} from 'lucide-react';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/actions/notifications';
import { PushNotificationSettingsRow } from '@/components/push/PushNotificationSettingsRow';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--league-primary)] ${
        checked
          ? 'bg-[var(--league-primary)]'
          : 'bg-[var(--color-surface-hover)]'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-[var(--color-accent-text)] shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

interface PrefRowProps {
  label: string;
  description: string;
  prefKey: keyof NotificationPreferences;
  prefs: NotificationPreferences;
  disabled?: boolean;
  onToggle: (key: keyof NotificationPreferences) => void;
}

function PrefRow({ label, description, prefKey, prefs, disabled, onToggle }: PrefRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-4 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
      </div>
      <Toggle
        checked={!!prefs[prefKey]}
        onChange={() => onToggle(prefKey)}
        disabled={disabled}
      />
    </div>
  );
}

export default function NotificationsPage() {
  const params = useParams();
  const leagueSlug = params.leagueSlug as string;

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getNotificationPreferences().then((p) => {
      setPrefs(p);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!prefs) return;

    const newValue = !prefs[key];
    const updated = { ...prefs, [key]: newValue };

    // When disabling the master email toggle, disable all email sub-toggles too
    if (key === 'email_enabled' && !newValue) {
      updated.email_game_updates = false;
      updated.email_registration = false;
      updated.email_draft = false;
      updated.email_billing = false;
      updated.email_marketing = false;
    }

    // When disabling master SMS toggle, disable sub-toggles
    if (key === 'sms_enabled' && !newValue) {
      updated.sms_game_updates = false;
    }

    setPrefs(updated);

    setSaving(true);
    await updateNotificationPreferences(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading || !prefs) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--league-primary)]" />
      </div>
    );
  }

  const emailDisabled = !prefs.email_enabled;
  const smsDisabled = !prefs.sms_enabled;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${leagueSlug}/me`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--league-primary)]" />
            Notification Settings
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Control how and when you hear from us
          </p>
        </div>

        {/* Save indicator */}
        <div className="ml-auto h-6 flex items-center">
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving
            </span>
          )}
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Email */}
        <div className="glass-card-strong overflow-hidden rounded-[24px]">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
            <Mail className="w-4 h-4 text-[var(--league-primary)]" />
            <span className="font-medium text-[var(--color-text-primary)]">Email</span>
          </div>
          <div className="px-5 divide-y divide-[var(--color-border)]">
            <PrefRow
              label="Enable Email Notifications"
              description="Master toggle for all email notifications"
              prefKey="email_enabled"
              prefs={prefs}
              onToggle={handleToggle}
            />
            <PrefRow
              label="Game Reminders"
              description="24-hour reminders before your games"
              prefKey="email_game_updates"
              prefs={prefs}
              disabled={emailDisabled}
              onToggle={handleToggle}
            />
            <PrefRow
              label="Registration"
              description="Confirmations, roster changes, team assignments"
              prefKey="email_registration"
              prefs={prefs}
              disabled={emailDisabled}
              onToggle={handleToggle}
            />
            <PrefRow
              label="Draft"
              description="Draft picks and team assignment updates"
              prefKey="email_draft"
              prefs={prefs}
              disabled={emailDisabled}
              onToggle={handleToggle}
            />
            <PrefRow
              label="Billing"
              description="Invoices, payment confirmations, receipts"
              prefKey="email_billing"
              prefs={prefs}
              disabled={emailDisabled}
              onToggle={handleToggle}
            />
            <PrefRow
              label="League News"
              description="Announcements, promotions, league updates"
              prefKey="email_marketing"
              prefs={prefs}
              disabled={emailDisabled}
              onToggle={handleToggle}
            />
          </div>
        </div>

        {/* SMS */}
        <div className="glass-card-strong overflow-hidden rounded-[24px]">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-[var(--league-primary)]" />
            <span className="font-medium text-[var(--color-text-primary)]">SMS</span>
          </div>
          <div className="px-5 divide-y divide-[var(--color-border)]">
            <PrefRow
              label="Enable SMS Notifications"
              description="Receive urgent updates via text message"
              prefKey="sms_enabled"
              prefs={prefs}
              onToggle={handleToggle}
            />
            <PrefRow
              label="Game Updates via SMS"
              description="Last-minute schedule changes and cancellations"
              prefKey="sms_game_updates"
              prefs={prefs}
              disabled={smsDisabled}
              onToggle={handleToggle}
            />
          </div>
        </div>

        {/* Push */}
        <div className="glass-card-strong overflow-hidden rounded-[24px]">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-[var(--league-primary)]" />
            <span className="font-medium text-[var(--color-text-primary)]">Push Notifications</span>
          </div>
          <div className="px-5">
            <PushNotificationSettingsRow
              initialPreferenceEnabled={prefs.push_enabled}
              onPreferenceChange={(enabled) => {
                setPrefs((current) => current ? { ...current, push_enabled: enabled } : current);
              }}
            />
          </div>
        </div>

        {/* Unsubscribe note */}
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          You can also unsubscribe from individual email types using the link at the bottom of any email we send you.
        </p>
      </div>
    </div>
  );
}
