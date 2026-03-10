'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import {
  ACTIVE_MIGRATION_REQUEST_STATUSES,
  EDITABLE_MIGRATION_REQUEST_STATUSES,
  MIGRATION_REQUEST_STATUS_OPTIONS,
  MIGRATION_SCOPE_OPTIONS,
  type LeagueMigrationRequest,
  type LeagueMigrationRequestStatus,
  type LeagueMigrationScope,
} from '@/lib/migration/requests';

const isDevelopment = process.env.NODE_ENV !== 'production';

export type UpsertLeagueMigrationRequestInput = {
  leagueId: string;
  locale: string;
  requestId?: string;
  mode: 'draft' | 'submit';
  scope: LeagueMigrationScope[];
  sourceSystem?: string;
  sourceUrl?: string;
  assetLinks?: string[];
  notes?: string;
  desiredLaunchDate?: string;
  estimatedItemCount?: number | null;
};

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

type NormalizedPayload = {
  scope: LeagueMigrationScope[];
  sourceSystem: string | null;
  sourceUrl: string | null;
  assetLinks: string[];
  notes: string | null;
  desiredLaunchDate: string | null;
  estimatedItemCount: number | null;
};

type DateNormalizationResult =
  | { value: string | null; error?: never }
  | { value?: never; error: string };

type CountNormalizationResult =
  | { value: number | null; error?: never }
  | { value?: never; error: string };

function normalizeScope(scope: LeagueMigrationScope[]) {
  return Array.from(new Set(scope)).filter((value): value is LeagueMigrationScope =>
    (MIGRATION_SCOPE_OPTIONS as readonly string[]).includes(value)
  );
}

function normalizeAssetLinks(assetLinks?: string[]) {
  return Array.from(
    new Set(
      (assetLinks ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 20)
    )
  );
}

function normalizeDesiredLaunchDate(value?: string): DateNormalizationResult {
  const trimmed = value?.trim();
  if (!trimmed) return { value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { error: 'Launch date must use YYYY-MM-DD format.' };
  }
  return { value: trimmed };
}

function normalizeEstimatedItemCount(value?: number | null): CountNormalizationResult {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { value: null };
  }

  const normalized = Math.trunc(value);
  if (normalized < 0) {
    return { error: 'Estimated volume cannot be negative.' };
  }

  return { value: normalized };
}

function normalizePayload(input: UpsertLeagueMigrationRequestInput): ActionResult<NormalizedPayload> {
  const scope = normalizeScope(input.scope);
  const sourceSystem = input.sourceSystem?.trim() || null;
  const sourceUrl = input.sourceUrl?.trim() || null;
  const notes = input.notes?.trim() || null;
  const assetLinks = normalizeAssetLinks(input.assetLinks);
  const desiredLaunchDate = normalizeDesiredLaunchDate(input.desiredLaunchDate);
  const estimatedItemCount = normalizeEstimatedItemCount(input.estimatedItemCount);

  if (desiredLaunchDate.error) {
    return { success: false, error: desiredLaunchDate.error };
  }

  if (estimatedItemCount.error) {
    return { success: false, error: estimatedItemCount.error };
  }

  if (input.mode === 'submit' && scope.length === 0) {
    return { success: false, error: 'Select at least one migration track before submitting.' };
  }

  return {
    success: true,
    data: {
      scope,
      sourceSystem,
      sourceUrl,
      assetLinks,
      notes,
      desiredLaunchDate: desiredLaunchDate.value ?? null,
      estimatedItemCount: estimatedItemCount.value ?? null,
    },
  };
}

function revalidateMigrationPaths(locale: string, leagueId: string) {
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}`);
  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}/migration-center`);
}

async function getEditableRequest(
  supabase: { from: (...args: any[]) => any },
  leagueId: string,
  requestId?: string
): Promise<ActionResult<LeagueMigrationRequest | null>> {
  const db = supabase as any;
  const trimmedRequestId = requestId?.trim();

  if (trimmedRequestId) {
    const { data, error } = await db
      .from('league_migration_requests')
      .select('*')
      .eq('id', trimmedRequestId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (error) {
      if (isDevelopment) console.error('Error loading migration request:', error);
      return { success: false, error: 'Failed to load the migration request.' };
    }

    if (!data) {
      return { success: false, error: 'Migration request not found.' };
    }

    return { success: true, data };
  }

  const { data, error } = await db
    .from('league_migration_requests')
    .select('*')
    .eq('league_id', leagueId)
    .in('status', [...ACTIVE_MIGRATION_REQUEST_STATUSES])
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) {
    if (isDevelopment) console.error('Error loading active migration request:', error);
    return { success: false, error: 'Failed to load the migration request.' };
  }

  return { success: true, data: data ?? null };
}

export async function getLeagueMigrationRequests(
  leagueId: string
): Promise<ActionResult<LeagueMigrationRequest[]>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = createServiceRoleClient();
  const db = supabase as any;
  const { data, error } = await db
    .from('league_migration_requests')
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isDevelopment) console.error('Error loading migration requests:', error);
    return { success: false, error: 'Failed to load migration requests.' };
  }

  return { success: true, data: (data ?? []) as LeagueMigrationRequest[] };
}

export async function upsertLeagueMigrationRequest(
  input: UpsertLeagueMigrationRequestInput
): Promise<ActionResult<LeagueMigrationRequest>> {
  const access = await verifyLeagueOwnerAccess(input.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const normalized = normalizePayload(input);
  if (!normalized.success) {
    return normalized;
  }

  const authClient = await createClient();
  const db = createServiceRoleClient() as any;
  const { data: authData } = await authClient.auth.getUser();
  const user = authData.user;
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const existingResult = await getEditableRequest(db, input.leagueId, input.requestId);
  if (!existingResult.success) {
    return existingResult;
  }

  const existing = existingResult.data;
  if (existing && !EDITABLE_MIGRATION_REQUEST_STATUSES.includes(existing.status)) {
    return {
      success: false,
      error: 'This migration request is already being processed and can no longer be edited here.',
    };
  }

  const now = new Date().toISOString();
  const targetStatus: LeagueMigrationRequestStatus =
    input.mode === 'submit'
      ? 'submitted'
      : existing?.status === 'submitted'
        ? 'submitted'
        : 'draft';

  const basePayload = {
    scope: normalized.data.scope,
    source_system: normalized.data.sourceSystem,
    source_url: normalized.data.sourceUrl,
    asset_links: normalized.data.assetLinks,
    notes: normalized.data.notes,
    desired_launch_date: normalized.data.desiredLaunchDate,
    estimated_item_count: normalized.data.estimatedItemCount,
    status: targetStatus,
  };

  if (existing) {
    const updatePayload = {
      ...basePayload,
      submitted_at: targetStatus === 'submitted' ? existing.submitted_at ?? now : existing.submitted_at,
    };

    const { data, error } = await db
      .from('league_migration_requests')
      .update(updatePayload)
      .eq('id', existing.id)
      .eq('league_id', input.leagueId)
      .select('*')
      .single();

    if (error || !data) {
      if (isDevelopment) console.error('Error updating migration request:', error);
      return { success: false, error: 'Failed to save the migration request.' };
    }

    revalidateMigrationPaths(input.locale, input.leagueId);
    return { success: true, data: data as LeagueMigrationRequest };
  }

  const insertPayload = {
    league_id: input.leagueId,
    requested_by: user.id,
    ...basePayload,
    submitted_at: targetStatus === 'submitted' ? now : null,
  };

  const { data, error } = await db
    .from('league_migration_requests')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    if (isDevelopment) console.error('Error creating migration request:', error);

    if ((error as { code?: string } | null)?.code === '23505') {
      return {
        success: false,
        error: 'There is already an active migration request for this league. Refresh and update that request instead.',
      };
    }

    return { success: false, error: 'Failed to save the migration request.' };
  }

  revalidateMigrationPaths(input.locale, input.leagueId);
  return { success: true, data: data as LeagueMigrationRequest };
}

export async function updateLeagueMigrationRequestStatus(
  requestId: string,
  leagueId: string,
  locale: string,
  status: LeagueMigrationRequestStatus
): Promise<ActionResult<LeagueMigrationRequest>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  if (!(MIGRATION_REQUEST_STATUS_OPTIONS as readonly string[]).includes(status)) {
    return { success: false, error: 'Invalid migration request status.' };
  }

  const db = createServiceRoleClient() as any;
  const timestamps: Record<string, string | null> = {};
  const now = new Date().toISOString();

  if (status === 'submitted') timestamps.submitted_at = now;
  if (status === 'reviewing') timestamps.reviewed_at = now;
  if (status === 'completed') timestamps.completed_at = now;

  const { data, error } = await db
    .from('league_migration_requests')
    .update({ status, ...timestamps })
    .eq('id', requestId)
    .eq('league_id', leagueId)
    .select('*')
    .single();

  if (error || !data) {
    if (isDevelopment) console.error('Error updating migration request status:', error);
    return { success: false, error: 'Failed to update migration request status.' };
  }

  revalidateMigrationPaths(locale, leagueId);
  return { success: true, data: data as LeagueMigrationRequest };
}
