'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Bell, LogOut, Shield, Info } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { createClient } from '@/lib/supabase/client';
import {
  getProfile,
  getNotificationSettings,
  saveProfile,
  saveNotificationSettings,
  clearAllCache,
  type PlayerProfile,
  type NotificationSettings,
} from '@/lib/offline/db';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    id: 'default',
    player_id: '',
    game_reminders: true,
    score_updates: true,
    schedule_changes: true,
    updated_at: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Check cache first
      const [cachedProfile, cachedSettings] = await Promise.all([
        getProfile(),
        getNotificationSettings(),
      ]);

      if (cachedProfile) setProfile(cachedProfile);
      if (cachedSettings) setSettings(cachedSettings);

      // Fetch fresh data
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        // Get team info
        const { data: rosterData } = await supabase
          .from('team_rosters')
          .select(`
            jersey_number,
            position,
            teams(id, name)
          `)
          .eq('player_id', user.id)
          .eq('status', 'active')
          .single();

        const team = rosterData?.teams as any;

        const playerProfile: PlayerProfile = {
          id: profileData.id,
          email: profileData.email || user.email || '',
          full_name: profileData.full_name || '',
          avatar_url: profileData.avatar_url,
          jersey_number: rosterData?.jersey_number,
          position: rosterData?.position,
          team_id: team?.id,
          team_name: team?.name,
          updated_at: new Date().toISOString(),
        };

        await saveProfile(playerProfile);
        setProfile(playerProfile);
      }

      // Check push notification support
      if ('Notification' in window && 'serviceWorker' in navigator) {
        setIsPushSupported(true);
        setIsPushEnabled(Notification.permission === 'granted');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value, updated_at: new Date().toISOString() };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const handleEnablePush = async () => {
    if (!isPushSupported) return;

    try {
      const permission = await Notification.requestPermission();
      setIsPushEnabled(permission === 'granted');

      if (permission === 'granted') {
        // Register service worker push subscription
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

        // Save subscription to database
        const supabase = createClient();
        await supabase.from('push_subscriptions').upsert({
          user_id: profile?.id,
          subscription: JSON.stringify(subscription),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error enabling push:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await clearAllCache();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'P';

  return (
    <div className="px-4 pt-safe pb-8">
      {/* Header */}
      <header className="py-4">
        <h1 className="text-xl font-bold text-white">Profile</h1>
      </header>

      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Profile Card */}
          <div className="flex flex-col items-center text-center py-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-gold-500 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-neutral-500">{initials}</span>
                )}
              </div>
              <button
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Edit avatar"
              >
                <Pencil className="w-4 h-4 text-black" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-white mt-4">
              {profile?.full_name || 'Player'}
              {profile?.jersey_number && (
                <span className="text-gold-500"> #{profile.jersey_number}</span>
              )}
            </h2>

            <p className="text-sm text-neutral-400 mt-1">
              {profile?.team_name || 'No team'} | {profile?.position || 'Player'}
            </p>
          </div>

          {/* Notifications Section */}
          <section className="mt-6">
            <h3 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
              Notifications
            </h3>

            <div className="rounded-xl bg-neutral-850 border border-gold-500/20 divide-y divide-gold-500/10">
              <SettingRow
                title="Game Reminders"
                description="24h and 2h before"
                checked={settings.game_reminders}
                onChange={(v) => handleSettingChange('game_reminders', v)}
              />
              <SettingRow
                title="Score Updates"
                description="When game ends"
                checked={settings.score_updates}
                onChange={(v) => handleSettingChange('score_updates', v)}
              />
              <SettingRow
                title="Schedule Changes"
                description="Rescheduled or cancelled"
                checked={settings.schedule_changes}
                onChange={(v) => handleSettingChange('schedule_changes', v)}
              />
            </div>

            {/* Push Notification CTA */}
            {isPushSupported && !isPushEnabled && (
              <button
                onClick={handleEnablePush}
                className={cn(
                  'w-full mt-4 p-4 rounded-xl',
                  'bg-gold-500/10 border border-gold-500/30',
                  'flex items-center gap-3',
                  'active:scale-[0.98] transition-transform'
                )}
              >
                <div className="p-2 rounded-lg bg-gold-500/20">
                  <Bell className="w-5 h-5 text-gold-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">Enable Push Notifications</p>
                  <p className="text-xs text-neutral-400">
                    Get notified about games even when the app is closed
                  </p>
                </div>
              </button>
            )}
          </section>

          {/* App Section */}
          <section className="mt-6">
            <h3 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
              App
            </h3>

            <div className="rounded-xl bg-neutral-850 border border-gold-500/20 divide-y divide-gold-500/10">
              <LinkRow
                title="Privacy Policy"
                icon={<Shield className="w-5 h-5 text-neutral-400" />}
                href="/privacy"
              />
              <LinkRow
                title="About"
                icon={<Info className="w-5 h-5 text-neutral-400" />}
                href="/about"
              />
            </div>
          </section>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className={cn(
              'w-full mt-6 p-4 rounded-xl',
              'bg-neutral-850 border border-gold-500/20',
              'text-red-500 font-medium text-center',
              'active:bg-neutral-800 transition-colors flex items-center justify-center gap-2'
            )}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>

          {/* Version */}
          <p className="text-center text-xs text-neutral-600 mt-8 pb-4">
            HockeyLifeHL Player v1.0.0
          </p>
        </>
      )}
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div>
        <p className="text-base font-medium text-white">{title}</p>
        <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-gold-500' : 'bg-neutral-700'
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </div>
  );
}

function LinkRow({
  title,
  icon,
  href,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 active:bg-neutral-800 transition-colors"
    >
      {icon}
      <span className="flex-1 text-base font-medium text-white">{title}</span>
      <svg
        className="w-5 h-5 text-neutral-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 rounded-full bg-neutral-800" />
        <div className="h-6 w-32 bg-neutral-800 rounded mt-4" />
        <div className="h-4 w-40 bg-neutral-800 rounded mt-2" />
      </div>
      <div className="h-48 bg-neutral-800 rounded-xl" />
      <div className="h-24 bg-neutral-800 rounded-xl" />
    </div>
  );
}
