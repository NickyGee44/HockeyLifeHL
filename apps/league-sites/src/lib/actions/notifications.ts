'use server';

import { createClient } from '@/lib/supabase/server';

export interface NotificationPreferences {
  email_enabled: boolean;
  email_game_updates: boolean;
  email_registration: boolean;
  email_draft: boolean;
  email_billing: boolean;
  email_marketing: boolean;
  sms_enabled: boolean;
  sms_game_updates: boolean;
  push_enabled: boolean;
}

const DEFAULTS: NotificationPreferences = {
  email_enabled: true,
  email_game_updates: true,
  email_registration: true,
  email_draft: true,
  email_billing: true,
  email_marketing: false,
  sms_enabled: false,
  sms_game_updates: false,
  push_enabled: true,
};

export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('user_notification_preferences')
    .select(
      'email_enabled, email_game_updates, email_registration, email_draft, email_billing, email_marketing, sms_enabled, sms_game_updates, push_enabled'
    )
    .eq('user_id', user.id)
    .single();

  if (!data) return DEFAULTS;

  return data as NotificationPreferences;
}

export async function updateNotificationPreferences(
  updates: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('user_notification_preferences')
    .upsert(
      { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}
