'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import { analyzeMigrationAssetBlob, buildNormalizationProfile } from '@/lib/migration/asset-analysis';
import {
  EDITABLE_MIGRATION_REQUEST_STATUSES,
  normalizeLeagueMigrationRequest,
  type LeagueMigrationRequest,
  type MigrationUploadedAsset,
} from '@/lib/migration/requests';

const MIGRATION_ASSET_BUCKET = 'league-migration-assets';
const MAX_URL_IMPORT_BYTES = 50 * 1024 * 1024;
const URL_FETCH_TIMEOUT_MS = 30_000;

const ALLOWED_EXTENSIONS = new Set([
  'sql', 'csv', 'tsv', 'json', 'xlsx', 'xls', 'zip', 'pdf', 'txt', 'md', 'xml',
]);

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ImportFromUrlInput = {
  leagueId: string;
  locale: string;
  requestId: string;
  url: string;
};

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // Block private/internal IPs
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === '[::1]' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function inferFileName(url: string, contentType?: string | null): string {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split('/').pop()?.split('?')[0] ?? '';
    if (lastSegment && lastSegment.includes('.')) return lastSegment.slice(0, 120);
  } catch { /* ignore */ }

  const ext = contentType?.includes('csv') ? 'csv'
    : contentType?.includes('json') ? 'json'
    : contentType?.includes('xml') ? 'xml'
    : contentType?.includes('sql') ? 'sql'
    : contentType?.includes('pdf') ? 'pdf'
    : contentType?.includes('zip') ? 'zip'
    : contentType?.includes('excel') || contentType?.includes('spreadsheet') ? 'xlsx'
    : 'txt';

  return `url-import-${Date.now()}.${ext}`;
}

function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function sanitizePath(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'url-import';
}

export async function importMigrationAssetFromUrl(
  input: ImportFromUrlInput
): Promise<ActionResult<LeagueMigrationRequest>> {
  const access = await verifyLeagueOwnerAccess(input.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const trimmedUrl = input.url.trim();
  if (!trimmedUrl) {
    return { success: false, error: 'URL is required.' };
  }

  if (!isAllowedUrl(trimmedUrl)) {
    return { success: false, error: 'This URL cannot be used. Only public http/https URLs are accepted.' };
  }

  const authClient = await createClient();
  const { data: authData } = await authClient.auth.getUser();
  if (!authData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const db = createServiceRoleClient() as any;
  const { data: request, error: reqError } = await db
    .from('league_migration_requests')
    .select('*')
    .eq('id', input.requestId)
    .eq('league_id', input.leagueId)
    .maybeSingle();

  if (reqError || !request) {
    return { success: false, error: 'Migration request not found.' };
  }

  const normalized = normalizeLeagueMigrationRequest(request as Record<string, unknown>);
  if (!EDITABLE_MIGRATION_REQUEST_STATUSES.includes(normalized.status)) {
    return { success: false, error: 'This request is already being processed.' };
  }

  // Fetch the URL
  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);
    response = await fetch(trimmedUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'BLH-Migration-Import/1.0' },
    });
    clearTimeout(timeout);
  } catch (err) {
    return { success: false, error: 'Could not fetch the URL. Check that it is reachable and try again.' };
  }

  if (!response.ok) {
    return { success: false, error: `URL returned an error (${response.status}). Check that the link is public and try again.` };
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > MAX_URL_IMPORT_BYTES) {
    return { success: false, error: 'File is too large (max 50MB). Share it as a drive link instead.' };
  }

  const blob = await response.blob();
  if (blob.size > MAX_URL_IMPORT_BYTES) {
    return { success: false, error: 'File is too large (max 50MB). Share it as a drive link instead.' };
  }

  const contentType = response.headers.get('content-type');
  const fileName = inferFileName(trimmedUrl, contentType);
  const ext = getExtension(fileName);

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { success: false, error: `File type .${ext} is not supported. Upload SQL, CSV, JSON, Excel, ZIP, PDF, XML, or text files.` };
  }

  // Upload to storage
  const storagePath = `${input.leagueId}/${input.requestId}/${Date.now()}-${sanitizePath(fileName)}`;
  const buffer = Buffer.from(await blob.arrayBuffer());

  const { error: uploadError } = await db.storage
    .from(MIGRATION_ASSET_BUCKET)
    .upload(storagePath, buffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: 'Failed to store the fetched file. Try again.' };
  }

  // Analyze
  const analysis = await analyzeMigrationAssetBlob(blob, fileName);
  const assetId = randomUUID();
  const currentAssets = normalized.uploaded_assets;

  const nextAssets: MigrationUploadedAsset[] = [
    ...currentAssets,
    {
      id: assetId,
      name: fileName,
      path: storagePath,
      size_bytes: blob.size,
      mime_type: contentType || null,
      uploaded_at: new Date().toISOString(),
      uploaded_by: authData.user.id,
      note: null,
      analysis,
    },
  ];

  const normalizationProfile = buildNormalizationProfile(
    nextAssets,
    normalized.asset_links,
    normalized.source_url,
    normalized.normalization_profile
  );

  const { data: updated, error: updateError } = await db
    .from('league_migration_requests')
    .update({
      uploaded_assets: nextAssets,
      normalization_profile: normalizationProfile,
    })
    .eq('id', input.requestId)
    .eq('league_id', input.leagueId)
    .select('*')
    .single();

  if (updateError || !updated) {
    return { success: false, error: 'File was fetched but the request could not be updated.' };
  }

  revalidatePath(`/${input.locale}/dashboard/leagues/${input.leagueId}/migration-center`);
  return { success: true, data: normalizeLeagueMigrationRequest(updated as Record<string, unknown>) };
}
