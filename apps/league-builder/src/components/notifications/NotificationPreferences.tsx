'use client';

/**
 * NotificationPreferences Component
 *
 * UI for managing user notification preferences
 */

import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Moon, Loader2, Check } from 'lucide-react';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/notifications/actions';

interface PreferenceSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  preferences: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

const PREFERENCE_SECTIONS: PreferenceSection[] = [
  {
    title: 'Email Notifications',
    description: 'Control which emails you receive',
    icon: <Mail className="h-5 w-5" />,
    preferences: [
      {
        key: 'email_enabled',
        label: 'Enable Email Notifications',
        description: 'Master toggle for all email notifications',
      },
      {
        key: 'email_game_updates',
        label: 'Game Updates',
        description: 'Reminders, schedule changes, cancellations',
      },
      {
        key: 'email_registration',
        label: 'Registration',
        description: 'Confirmation, roster changes, team assignments',
      },
      {
        key: 'email_draft',
        label: 'Draft',
        description: 'Draft picks, team assignments',
      },
      {
        key: 'email_billing',
        label: 'Billing',
        description: 'Invoices, payment confirmations, receipts',
      },
      {
        key: 'email_marketing',
        label: 'Marketing',
        description: 'Promotions, league news, updates',
      },
    ],
  },
  {
    title: 'SMS Notifications',
    description: 'Get urgent updates via text message',
    icon: <MessageSquare className="h-5 w-5" />,
    preferences: [
      {
        key: 'sms_enabled',
        label: 'Enable SMS Notifications',
        description: 'Master toggle for all SMS notifications',
      },
      {
        key: 'sms_game_updates',
        label: 'Game Updates via SMS',
        description: 'Last-minute schedule changes',
      },
      {
        key: 'sms_urgent_only',
        label: 'Urgent Only',
        description: 'Only receive critical notifications',
      },
    ],
  },
  {
    title: 'Push Notifications',
    description: 'Browser and mobile push notifications',
    icon: <Smartphone className="h-5 w-5" />,
    preferences: [
      {
        key: 'push_enabled',
        label: 'Enable Push Notifications',
        description: 'Receive notifications on your device',
      },
    ],
  },
];

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00',
  });
  const [timezone, setTimezone] = useState('America/Toronto');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load preferences
  useEffect(() => {
    async function loadPreferences() {
      const prefs = await getNotificationPreferences();
      if (prefs) {
        const boolPrefs: Record<string, boolean> = {};
        for (const section of PREFERENCE_SECTIONS) {
          for (const pref of section.preferences) {
            boolPrefs[pref.key] = prefs[pref.key as keyof typeof prefs] as boolean;
          }
        }
        setPreferences(boolPrefs);
        setQuietHours({
          enabled: prefs.quiet_hours_enabled,
          start: prefs.quiet_hours_start || '22:00',
          end: prefs.quiet_hours_end || '08:00',
        });
        setTimezone(prefs.timezone);
      }
      setLoading(false);
    }
    loadPreferences();
  }, []);

  // Handle preference toggle
  const handleToggle = async (key: string) => {
    const newValue = !preferences[key];
    setPreferences(prev => ({ ...prev, [key]: newValue }));

    // If disabling master toggle, disable all in that section
    if (key === 'email_enabled' && !newValue) {
      const emailKeys = PREFERENCE_SECTIONS[0].preferences.map(p => p.key);
      const updates: Record<string, boolean> = {};
      for (const k of emailKeys) {
        updates[k] = false;
      }
      setPreferences(prev => ({ ...prev, ...updates }));
    }

    await savePreferences({ [key]: newValue });
  };

  // Save preferences
  const savePreferences = async (updates: Record<string, any>) => {
    setSaving(true);
    await updateNotificationPreferences(updates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Handle quiet hours toggle
  const handleQuietHoursToggle = async () => {
    const newEnabled = !quietHours.enabled;
    setQuietHours(prev => ({ ...prev, enabled: newEnabled }));
    await savePreferences({
      quiet_hours_enabled: newEnabled,
      quiet_hours_start: quietHours.start,
      quiet_hours_end: quietHours.end,
    });
  };

  // Handle quiet hours time change
  const handleQuietHoursChange = async (field: 'start' | 'end', value: string) => {
    setQuietHours(prev => ({ ...prev, [field]: value }));
    await savePreferences({
      [`quiet_hours_${field}`]: value,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#22D3EE]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status indicator */}
      <div className="flex items-center justify-end h-6">
        {saving && (
          <div className="flex items-center gap-2 text-sm text-[#a3a3a3]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-sm text-[#22c55e]">
            <Check className="h-4 w-4" />
            Saved
          </div>
        )}
      </div>

      {/* Preference sections */}
      {PREFERENCE_SECTIONS.map((section) => (
        <div
          key={section.title}
          className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.2)] rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[rgba(212,175,55,0.1)] rounded-lg text-[#22D3EE]">
              {section.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{section.title}</h3>
              <p className="text-sm text-[#a3a3a3]">{section.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            {section.preferences.map((pref, index) => {
              const isDisabled =
                pref.key !== 'email_enabled' &&
                pref.key.startsWith('email_') &&
                !preferences.email_enabled;

              return (
                <div
                  key={pref.key}
                  className={`flex items-center justify-between py-3 ${
                    index > 0 ? 'border-t border-[rgba(255,255,255,0.1)]' : ''
                  } ${isDisabled ? 'opacity-50' : ''}`}
                >
                  <div>
                    <p className="font-medium text-white">{pref.label}</p>
                    <p className="text-sm text-[#737373]">{pref.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(pref.key)}
                    disabled={isDisabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences[pref.key]
                        ? 'bg-[#22D3EE]'
                        : 'bg-[#404040]'
                    } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    role="switch"
                    aria-checked={preferences[pref.key]}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences[pref.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quiet Hours */}
      <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.2)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[rgba(212,175,55,0.1)] rounded-lg text-[#22D3EE]">
            <Moon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Quiet Hours</h3>
            <p className="text-sm text-[#a3a3a3]">Pause notifications during specific hours</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-white">Enable Quiet Hours</p>
              <p className="text-sm text-[#737373]">No notifications during this time window</p>
            </div>
            <button
              onClick={handleQuietHoursToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                quietHours.enabled ? 'bg-[#22D3EE]' : 'bg-[#404040]'
              }`}
              role="switch"
              aria-checked={quietHours.enabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {quietHours.enabled && (
            <div className="flex items-center gap-4 pt-2">
              <div>
                <label className="block text-sm text-[#a3a3a3] mb-1">Start</label>
                <input
                  type="time"
                  value={quietHours.start}
                  onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                  className="bg-[#0a0a0a] border border-[rgba(212,175,55,0.3)] rounded-lg px-3 py-2 text-white focus:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
              <div className="text-[#737373] pt-6">to</div>
              <div>
                <label className="block text-sm text-[#a3a3a3] mb-1">End</label>
                <input
                  type="time"
                  value={quietHours.end}
                  onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                  className="bg-[#0a0a0a] border border-[rgba(212,175,55,0.3)] rounded-lg px-3 py-2 text-white focus:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.2)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[rgba(212,175,55,0.1)] rounded-lg text-[#22D3EE]">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Timezone</h3>
            <p className="text-sm text-[#a3a3a3]">All times are shown in this timezone</p>
          </div>
        </div>

        <select
          value={timezone}
          onChange={async (e) => {
            setTimezone(e.target.value);
            await savePreferences({ timezone: e.target.value });
          }}
          className="w-full bg-[#0a0a0a] border border-[rgba(212,175,55,0.3)] rounded-lg px-4 py-3 text-white focus:border-[#22D3EE] focus:outline-none focus:ring-2 focus:ring-[#22D3EE]/20"
        >
          <option value="America/Toronto">Eastern Time (Toronto)</option>
          <option value="America/Chicago">Central Time (Chicago)</option>
          <option value="America/Denver">Mountain Time (Denver)</option>
          <option value="America/Los_Angeles">Pacific Time (Los Angeles)</option>
          <option value="America/Vancouver">Pacific Time (Vancouver)</option>
          <option value="America/Edmonton">Mountain Time (Edmonton)</option>
          <option value="America/Winnipeg">Central Time (Winnipeg)</option>
          <option value="America/Halifax">Atlantic Time (Halifax)</option>
        </select>
      </div>
    </div>
  );
}
