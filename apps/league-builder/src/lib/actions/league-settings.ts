'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

export interface UpdateLeagueSettingsData {
  name: string;
  description?: string | null;
  city?: string | null;
  state_province?: string | null;
  country?: string | null;
  timezone?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export async function updateLeagueSettings(
  leagueId: string,
  data: UpdateLeagueSettingsData
): Promise<{ success: boolean; error?: string }> {
  // Verify the user has owner/admin access
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  // Validate required fields
  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'League name is required' };
  }

  if (data.name.trim().length > 100) {
    return { success: false, error: 'League name must be 100 characters or less' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('leagues')
    .update({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      city: data.city?.trim() || null,
      state_province: data.state_province?.trim() || null,
      country: data.country?.trim() || null,
      timezone: data.timezone || null,
      contact_email: data.contact_email?.trim() || null,
      contact_phone: data.contact_phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (error) {
    console.error('[updateLeagueSettings] Error:', error.message);
    return { success: false, error: 'Failed to update settings' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}`);
  revalidatePath(`/dashboard/leagues/${leagueId}/settings`);
  revalidatePath(`/dashboard/leagues/${leagueId}/settings/general`);

  return { success: true };
}

// =============================================================================
// Game Rules — Penalty configuration
// =============================================================================

export interface PenaltyRuleConfig {
  type: string;
  minutes: number;
}

export async function updatePenaltyRules(
  leagueId: string,
  rules: PenaltyRuleConfig[]
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  // Validate rules
  for (const rule of rules) {
    if (!rule.type || rule.type.trim().length === 0) {
      return { success: false, error: 'All penalties must have a name' };
    }
    if (!rule.minutes || rule.minutes < 1 || rule.minutes > 60) {
      return { success: false, error: `Invalid duration for "${rule.type}": must be 1–60 minutes` };
    }
  }

  if (rules.length > 50) {
    return { success: false, error: 'Maximum 50 penalty types allowed' };
  }

  const supabase = await createClient();

  // Fetch current settings, merge penalty_rules into it
  const { data: league } = await supabase
    .from('leagues')
    .select('settings')
    .eq('id', leagueId)
    .single();

  const currentSettings = (league?.settings as Record<string, unknown>) || {};
  const newSettings = {
    ...currentSettings,
    penalty_rules: rules.map(r => ({ type: r.type.trim(), minutes: r.minutes })),
  };

  const { error } = await supabase
    .from('leagues')
    .update({
      settings: newSettings as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (error) {
    console.error('[updatePenaltyRules] Error:', error.message);
    return { success: false, error: 'Failed to save penalty rules' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/settings`);
  revalidatePath(`/dashboard/leagues/${leagueId}/settings/game-rules`);

  return { success: true };
}

// ============================================================================
// Update Scorekeeper Mode (self-scorekeeper toggle)
// ============================================================================

export async function updateScorekeeperMode(
  leagueId: string,
  selfScorekeeperEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  // Read current settings and merge
  const { data: current } = await supabase
    .from('leagues')
    .select('settings')
    .eq('id', leagueId)
    .single();

  const currentSettings = (current?.settings as Record<string, unknown>) ?? {};
  const merged = {
    ...currentSettings,
    self_scorekeeper_enabled: selfScorekeeperEnabled,
    scorekeepingMode: selfScorekeeperEnabled ? 'self_scorekeeping' : 'standard',
    statEntryMode: selfScorekeeperEnabled ? 'captain' : 'scorekeeper',
  };

  const { error } = await supabase
    .from('leagues')
    .update({ settings: merged, updated_at: new Date().toISOString() })
    .eq('id', leagueId);

  if (error) {
    console.error('[updateScorekeeperMode] Error:', error.message);
    return { success: false, error: 'Failed to update scorekeeper mode' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/settings/scorekeepers`);
  return { success: true };
}

// ============================================================================
// Recap Tone
// ============================================================================

export type RecapTone = 'friendly' | 'competitive' | 'savage';

const VALID_RECAP_TONES: RecapTone[] = ['friendly', 'competitive', 'savage'];

export async function updateRecapTone(
  leagueId: string,
  tone: RecapTone
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  if (!VALID_RECAP_TONES.includes(tone)) {
    return { success: false, error: 'Invalid recap tone' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('leagues')
    .update({
      recap_tone: tone,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', leagueId);

  if (error) {
    console.error('[updateRecapTone] Error:', error.message);
    return { success: false, error: 'Failed to update recap tone' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/settings`);
  revalidatePath(`/dashboard/leagues/${leagueId}/settings/general`);

  return { success: true };
}

// ============================================================================
// Registration Form Config
// ============================================================================

export interface RegistrationFormConfig {
  levels: string[];
  locations: string[];
  nights: string[];
  auto_approve: boolean;
  enabled_fields: {
    played_last_season: boolean;
    level: boolean;
    location_preference: boolean;
    preferred_night: boolean;
    referral_source: boolean;
    paid_team_rep: boolean;
  };
}

export async function updateRegistrationFormConfig(
  leagueId: string,
  config: RegistrationFormConfig
): Promise<{ success: boolean; error?: string }> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  // Sanitize: strip empty strings from arrays
  const sanitized: RegistrationFormConfig = {
    levels: config.levels.map((l) => l.trim()).filter(Boolean),
    locations: config.locations.map((l) => l.trim()).filter(Boolean),
    nights: config.nights.map((n) => n.trim()).filter(Boolean),
    auto_approve: config.auto_approve ?? false,
    enabled_fields: config.enabled_fields,
  };

  const supabase = await createClient();

  const { error } = await supabase
    .from('leagues')
    .update({
      registration_form_config: sanitized as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (error) {
    console.error('[updateRegistrationFormConfig] Error:', error.message);
    return { success: false, error: 'Failed to save registration form configuration' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/settings/registration`);
  return { success: true };
}
