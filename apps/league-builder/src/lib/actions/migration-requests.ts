'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import { analyzeMigrationAssetBlob, buildNormalizationProfile } from '@/lib/migration/asset-analysis';
import {
  ACTIVE_MIGRATION_REQUEST_STATUSES,
  EDITABLE_MIGRATION_REQUEST_STATUSES,
  MIGRATION_REQUEST_STATUS_OPTIONS,
  MIGRATION_SCOPE_OPTIONS,
  normalizeLeagueMigrationRequest,
  type LeagueMigrationRequest,
  type LeagueMigrationRequestStatus,
  type LeagueMigrationScope,
  type MigrationUploadedAsset,
} from '@/lib/migration/requests';

const isDevelopment = process.env.NODE_ENV !== 'production';
const MIGRATION_ASSET_BUCKET = 'league-migration-assets';
const MAX_MIGRATION_ASSET_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIGRATION_EXTENSIONS = new Set([
  'sql',
  'csv',
  'tsv',
  'json',
  'xlsx',
  'xls',
  'zip',
  'pdf',
  'txt',
  'md',
  'xml',
]);

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

type MigrationUploadPreparationInput = {
  leagueId: string;
  locale: string;
  requestId?: string;
  fileName: string;
  fileSize: number;
  fileType?: string | null;
};

type MigrationUploadPreparationResult = {
  requestId: string;
  path: string;
  token: string;
};

type FinalizeMigrationAssetInput = {
  leagueId: string;
  locale: string;
  requestId: string;
  path: string;
  fileName: string;
  fileSize: number;
  fileType?: string | null;
};

type DeleteMigrationAssetInput = {
  leagueId: string;
  locale: string;
  requestId: string;
  assetId: string;
};

type MigrationAssetDownloadInput = {
  leagueId: string;
  requestId: string;
  assetId: string;
};

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

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.trim().toLowerCase() ?? '';
}

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'migration-file';
}

function sanitizeFileBaseName(fileName: string) {
  const extension = getFileExtension(fileName);
  const suffix = extension ? `.${extension}` : '';
  const baseName = suffix && fileName.toLowerCase().endsWith(suffix)
    ? fileName.slice(0, -suffix.length)
    : fileName;
  return sanitizeFileName(baseName);
}

function validateMigrationUploadInput(input: MigrationUploadPreparationInput): ActionResult<void> {
  const trimmedName = input.fileName.trim();
  if (!trimmedName) {
    return { success: false, error: 'File name is required.' };
  }

  const extension = getFileExtension(trimmedName);
  if (!ALLOWED_MIGRATION_EXTENSIONS.has(extension)) {
    return {
      success: false,
      error: 'Unsupported file type. Upload SQL, CSV, TSV, JSON, Excel, ZIP, PDF, XML, or text files.',
    };
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return { success: false, error: 'File size is invalid.' };
  }

  if (input.fileSize > MAX_MIGRATION_ASSET_BYTES) {
    return {
      success: false,
      error: 'Files larger than 50MB should be shared with a drive link instead of direct upload.',
    };
  }

  return { success: true, data: undefined };
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

    return { success: true, data: normalizeLeagueMigrationRequest(data as Record<string, unknown>) };
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

  return {
    success: true,
    data: data ? normalizeLeagueMigrationRequest(data as Record<string, unknown>) : null,
  };
}

async function getOrCreateEditableDraftRequest(
  input: Pick<MigrationUploadPreparationInput, 'leagueId' | 'locale' | 'requestId'>
): Promise<ActionResult<LeagueMigrationRequest>> {
  const authClient = await createClient();
  const db = createServiceRoleClient() as any;
  const { data: authData } = await authClient.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const existingResult = await getEditableRequest(db, input.leagueId, input.requestId);
  if (!existingResult.success) {
    return existingResult as ActionResult<LeagueMigrationRequest>;
  }

  const existing = existingResult.data;
  if (existing) {
    if (!EDITABLE_MIGRATION_REQUEST_STATUSES.includes(existing.status)) {
      return {
        success: false,
        error: 'This migration request is already being processed and cannot accept new uploads here.',
      };
    }

    return { success: true, data: existing };
  }

  const now = new Date().toISOString();
  const insertPayload = {
    league_id: input.leagueId,
    requested_by: user.id,
    status: 'draft' as const,
    scope: [],
    source_system: null,
    source_url: null,
    asset_links: [],
    notes: null,
    desired_launch_date: null,
    estimated_item_count: null,
    uploaded_assets: [],
    normalization_profile: {},
    submitted_at: null,
    reviewed_at: null,
    scheduled_for: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await db
    .from('league_migration_requests')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    if (isDevelopment) console.error('Error creating draft migration request for upload:', error);
    return { success: false, error: 'Failed to prepare a migration draft for uploads.' };
  }

  revalidateMigrationPaths(input.locale, input.leagueId);
  return { success: true, data: normalizeLeagueMigrationRequest(data as Record<string, unknown>) };
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

  return {
    success: true,
    data: (data ?? []).map((row: Record<string, unknown>) => normalizeLeagueMigrationRequest(row)),
  };
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
  const currentAssets = existing?.uploaded_assets ?? [];
  const normalizationProfile = buildNormalizationProfile(
    currentAssets,
    normalized.data.assetLinks,
    normalized.data.sourceUrl
  );

  const basePayload = {
    scope: normalized.data.scope,
    source_system: normalized.data.sourceSystem,
    source_url: normalized.data.sourceUrl,
    asset_links: normalized.data.assetLinks,
    notes: normalized.data.notes,
    desired_launch_date: normalized.data.desiredLaunchDate,
    estimated_item_count: normalized.data.estimatedItemCount,
    normalization_profile: normalizationProfile,
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
    return { success: true, data: normalizeLeagueMigrationRequest(data as Record<string, unknown>) };
  }

  const insertPayload = {
    league_id: input.leagueId,
    requested_by: user.id,
    ...basePayload,
    uploaded_assets: [],
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
  return { success: true, data: normalizeLeagueMigrationRequest(data as Record<string, unknown>) };
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
  return { success: true, data: normalizeLeagueMigrationRequest(data as Record<string, unknown>) };
}

export async function prepareMigrationAssetUpload(
  input: MigrationUploadPreparationInput
): Promise<ActionResult<MigrationUploadPreparationResult>> {
  const access = await verifyLeagueOwnerAccess(input.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const validation = validateMigrationUploadInput(input);
  if (!validation.success) {
    return validation;
  }

  const draftResult = await getOrCreateEditableDraftRequest(input);
  if (!draftResult.success) {
    return draftResult as ActionResult<MigrationUploadPreparationResult>;
  }

  const draftRequest = draftResult.data;
  const extension = getFileExtension(input.fileName);
  const normalizedFileName = extension
    ? `${sanitizeFileBaseName(input.fileName)}.${extension}`
    : sanitizeFileBaseName(input.fileName);
  const path = `${input.leagueId}/${draftRequest.id}/${Date.now()}-${normalizedFileName}`;
  const serviceSupabase = createServiceRoleClient() as any;

  const { data, error } = await serviceSupabase.storage
    .from(MIGRATION_ASSET_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    if (isDevelopment) console.error('Error creating signed upload URL for migration asset:', error);
    return { success: false, error: 'Failed to prepare the upload. Try again.' };
  }

  return {
    success: true,
    data: {
      requestId: draftRequest.id,
      path,
      token: data.token,
    },
  };
}

export async function finalizeMigrationAssetUpload(
  input: FinalizeMigrationAssetInput
): Promise<ActionResult<LeagueMigrationRequest>> {
  const access = await verifyLeagueOwnerAccess(input.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const validation = validateMigrationUploadInput(input);
  if (!validation.success) {
    return validation as ActionResult<LeagueMigrationRequest>;
  }

  const draftResult = await getOrCreateEditableDraftRequest(input);
  if (!draftResult.success) {
    return draftResult;
  }

  const draftRequest = draftResult.data;
  if (draftRequest.id !== input.requestId) {
    return { success: false, error: 'Upload target no longer matches the active migration request.' };
  }

  const serviceSupabase = createServiceRoleClient() as any;
  const { data: downloadData, error: downloadError } = await serviceSupabase.storage
    .from(MIGRATION_ASSET_BUCKET)
    .download(input.path);

  if (downloadError || !downloadData) {
    if (isDevelopment) console.error('Error downloading uploaded migration asset:', downloadError);
    return { success: false, error: 'The uploaded file could not be verified.' };
  }

  const analysis = await analyzeMigrationAssetBlob(downloadData as Blob, input.fileName);
  const assetId = randomUUID();
  const authClient = await createClient();
  const { data: authData } = await authClient.auth.getUser();
  const userId = authData.user?.id ?? null;

  const currentAssets = draftRequest.uploaded_assets.filter((asset) => asset.path !== input.path);
  const nextAssets: MigrationUploadedAsset[] = [
    ...currentAssets,
    {
      id: assetId,
      name: input.fileName,
      path: input.path,
      size_bytes: input.fileSize,
      mime_type: input.fileType?.trim() || null,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userId,
      analysis,
    },
  ];

  const normalizationProfile = buildNormalizationProfile(
    nextAssets,
    draftRequest.asset_links,
    draftRequest.source_url
  );

  const { data, error } = await serviceSupabase
    .from('league_migration_requests')
    .update({
      uploaded_assets: nextAssets,
      normalization_profile: normalizationProfile,
    })
    .eq('id', draftRequest.id)
    .eq('league_id', input.leagueId)
    .select('*')
    .single();

  if (error || !data) {
    if (isDevelopment) console.error('Error finalizing migration asset upload:', error);
    return { success: false, error: 'The uploaded file was saved, but the migration request could not be updated.' };
  }

  revalidateMigrationPaths(input.locale, input.leagueId);
  return { success: true, data: normalizeLeagueMigrationRequest(data as Record<string, unknown>) };
}

export async function deleteMigrationAsset(
  input: DeleteMigrationAssetInput
): Promise<ActionResult<LeagueMigrationRequest>> {
  const access = await verifyLeagueOwnerAccess(input.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const serviceSupabase = createServiceRoleClient() as any;
  const requestResult = await getEditableRequest(serviceSupabase, input.leagueId, input.requestId);
  if (!requestResult.success || !requestResult.data) {
    return { success: false, error: requestResult.success ? 'Migration request not found.' : requestResult.error };
  }

  const request = requestResult.data;
  if (!EDITABLE_MIGRATION_REQUEST_STATUSES.includes(request.status)) {
    return { success: false, error: 'This migration request is already being processed and files can no longer be removed here.' };
  }

  const assetToDelete = request.uploaded_assets.find((asset) => asset.id === input.assetId);
  if (!assetToDelete) {
    return { success: false, error: 'Uploaded file not found.' };
  }

  const nextAssets = request.uploaded_assets.filter((asset) => asset.id !== input.assetId);
  const normalizationProfile = buildNormalizationProfile(
    nextAssets,
    request.asset_links,
    request.source_url
  );

  const [{ data, error }, removeResult] = await Promise.all([
    serviceSupabase
      .from('league_migration_requests')
      .update({
        uploaded_assets: nextAssets,
        normalization_profile: normalizationProfile,
      })
      .eq('id', request.id)
      .eq('league_id', input.leagueId)
      .select('*')
      .single(),
    serviceSupabase.storage.from(MIGRATION_ASSET_BUCKET).remove([assetToDelete.path]),
  ]);

  if (removeResult.error && isDevelopment) {
    console.error('Error removing migration asset from storage:', removeResult.error);
  }

  if (error || !data) {
    if (isDevelopment) console.error('Error deleting migration asset from request:', error);
    return { success: false, error: 'Failed to remove the uploaded file.' };
  }

  revalidateMigrationPaths(input.locale, input.leagueId);
  return { success: true, data: normalizeLeagueMigrationRequest(data as Record<string, unknown>) };
}

export async function getMigrationAssetDownloadUrl(
  input: MigrationAssetDownloadInput
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const access = await verifyLeagueOwnerAccess(input.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const serviceSupabase = createServiceRoleClient() as any;
  const requestResult = await getEditableRequest(serviceSupabase, input.leagueId, input.requestId);
  if (!requestResult.success || !requestResult.data) {
    return { success: false, error: requestResult.success ? 'Migration request not found.' : requestResult.error };
  }

  const asset = requestResult.data.uploaded_assets.find((item) => item.id === input.assetId);
  if (!asset) {
    return { success: false, error: 'Uploaded file not found.' };
  }

  const { data, error } = await serviceSupabase.storage
    .from(MIGRATION_ASSET_BUCKET)
    .createSignedUrl(asset.path, 60 * 5, {
      download: asset.name,
    });

  if (error || !data?.signedUrl) {
    if (isDevelopment) console.error('Error creating signed URL for migration asset:', error);
    return { success: false, error: 'Failed to open the uploaded file.' };
  }

  return { success: true, data: { url: data.signedUrl, fileName: asset.name } };
}
