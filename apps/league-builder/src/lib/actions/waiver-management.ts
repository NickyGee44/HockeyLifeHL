'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import { revalidatePath } from 'next/cache';

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = void> = Promise<
  | { success: true; data?: T }
  | { success: false; error: string }
>;

interface WaiverTemplate {
  id: string;
  title: string;
  content: string;
  version: string;
  content_hash: string;
  document_url: string | null;
  document_name: string | null;
  document_mime_type: string | null;
  is_active: boolean | null;
  updated_at: string | null;
}

interface SignedWaiverRow {
  id: string;
  player_name: string;
  player_email: string;
  agreed_at: string | null;
  season_name: string | null;
  waiver_version: string;
  signature_type: string;
}

// ============================================================================
// Helpers
// ============================================================================

async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildStoredWaiverContent(content: string, documentName?: string | null): string {
  const trimmed = content.trim();
  if (trimmed) {
    return trimmed;
  }

  const safeName = documentName?.trim() || 'the attached waiver document';
  return [
    '# Liability Waiver',
    '',
    `Please review ${safeName} in full before accepting this waiver.`,
    '',
    'By accepting below, you acknowledge that you have read the uploaded waiver document and agree to its terms.',
  ].join('\n');
}

async function computeWaiverTemplateHash(params: {
  content: string;
  documentUrl?: string | null;
  documentName?: string | null;
  documentMimeType?: string | null;
}): Promise<string> {
  if (!params.documentUrl && !params.documentName && !params.documentMimeType) {
    return computeContentHash(params.content);
  }

  return computeContentHash(
    JSON.stringify({
      content: params.content,
      documentUrl: params.documentUrl || '',
      documentName: params.documentName || '',
      documentMimeType: params.documentMimeType || '',
    })
  );
}

function extractStoragePath(bucketName: string, url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(
      new RegExp(`/storage/v1/object/public/${bucketName}/(.+)$`)
    );

    if (!pathMatch?.[1]) {
      return null;
    }

    return decodeURIComponent(pathMatch[1]);
  } catch {
    return null;
  }
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Get the active waiver template for admin editing
 */
export async function getWaiverTemplate(
  leagueId: string
): ActionResult<WaiverTemplate | null> {
  try {
    const access = await verifyLeagueOwnerAccess(leagueId);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Access denied' };
    }

    const supabase = await createClient();

    const { data: waiver, error } = await supabase
      .from('league_waiver_templates')
      .select('id, title, content, version, content_hash, document_url, document_name, document_mime_type, is_active, updated_at')
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      console.error('Get waiver template error:', error);
      return { success: false, error: 'Failed to load waiver template.' };
    }

    return { success: true, data: waiver };
  } catch (error) {
    console.error('Get waiver template error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Save (upsert) waiver template — deactivates old, creates new version
 */
export async function saveWaiverTemplate(
  leagueId: string,
  params: {
    title: string;
    content: string;
    documentUrl?: string | null;
    documentName?: string | null;
    documentMimeType?: string | null;
  }
): ActionResult<{ templateId: string; version: string }> {
  try {
    const access = await verifyLeagueOwnerAccess(leagueId);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Access denied' };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    const storedContent = buildStoredWaiverContent(params.content, params.documentName);
    const contentHash = await computeWaiverTemplateHash({
      content: storedContent,
      documentUrl: params.documentUrl,
      documentName: params.documentName,
      documentMimeType: params.documentMimeType,
    });

    // Get current active template to determine next version
    const { data: existing } = await supabase
      .from('league_waiver_templates')
      .select('id, version, content_hash')
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .single();

    // If content hasn't changed, just update the title
    if (existing && existing.content_hash === contentHash) {
      const { error: updateError } = await supabase
        .from('league_waiver_templates')
        .update({
          title: params.title,
          content: storedContent,
          document_url: params.documentUrl || null,
          document_name: params.documentName || null,
          document_mime_type: params.documentMimeType || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Update waiver title error:', updateError);
        return { success: false, error: 'Failed to update waiver.' };
      }

      revalidatePath('/dashboard');
      return {
        success: true,
        data: { templateId: existing.id, version: existing.version },
      };
    }

    // Content changed — deactivate old, create new version
    const nextVersion = existing
      ? String((parseInt(existing.version.replace(/^\D+/, ''), 10) || 1) + 1)
      : '1';

    if (existing) {
      await supabase
        .from('league_waiver_templates')
        .update({ is_active: false })
        .eq('id', existing.id);
    }

    const { data: newTemplate, error: insertError } = await supabase
      .from('league_waiver_templates')
      .insert({
        league_id: leagueId,
        title: params.title,
        content: storedContent,
        content_hash: contentHash,
        document_url: params.documentUrl || null,
        document_name: params.documentName || null,
        document_mime_type: params.documentMimeType || null,
        version: nextVersion,
        is_active: true,
        created_by: user.id,
      })
      .select('id, version')
      .single();

    if (insertError || !newTemplate) {
      console.error('Insert waiver template error:', insertError);
      return { success: false, error: 'Failed to save waiver template.' };
    }

    revalidatePath('/dashboard');
    return {
      success: true,
      data: { templateId: newTemplate.id, version: newTemplate.version },
    };
  } catch (error) {
    console.error('Save waiver template error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function uploadWaiverDocument(
  leagueId: string,
  file: File
): ActionResult<{ url: string; path: string; name: string; mimeType: string }> {
  try {
    const access = await verifyLeagueOwnerAccess(leagueId);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Access denied' };
    }

    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Allowed: PDF, PNG, JPG, WebP.' };
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 10MB.' };
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `${leagueId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await serviceSupabase.storage
      .from('league-waivers')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Waiver document upload error:', uploadError);
      return { success: false, error: 'Failed to upload waiver document.' };
    }

    const { data: urlData } = serviceSupabase.storage.from('league-waivers').getPublicUrl(path);

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        path,
        name: file.name,
        mimeType: file.type,
      },
    };
  } catch (error) {
    console.error('Waiver document upload error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function deleteWaiverDocument(
  leagueId: string,
  documentUrl: string
): ActionResult {
  try {
    const access = await verifyLeagueOwnerAccess(leagueId);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Access denied' };
    }

    const serviceSupabase = createServiceRoleClient();
    const path = extractStoragePath('league-waivers', documentUrl);

    if (!path) {
      return { success: true };
    }

    const { error } = await serviceSupabase.storage.from('league-waivers').remove([path]);
    if (error && !error.message.includes('not found')) {
      console.error('Waiver document delete error:', error);
      return { success: false, error: 'Failed to remove waiver document.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Waiver document delete error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Get signed waivers for a league with player details
 */
export async function getSignedWaivers(
  leagueId: string,
  opts: { search?: string; limit?: number; offset?: number } = {}
): ActionResult<{ waivers: SignedWaiverRow[]; total: number }> {
  try {
    const access = await verifyLeagueOwnerAccess(leagueId);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Access denied' };
    }

    const supabase = await createClient();
    const { search, limit = 20, offset = 0 } = opts;

    let query = supabase
      .from('player_waivers')
      .select(
        `
        id,
        agreed_at,
        waiver_version,
        signature_type,
        signed_name,
        player:profiles!player_id (full_name, email),
        season:seasons!season_id (name)
      `,
        { count: 'exact' }
      )
      .eq('league_id', leagueId)
      .order('agreed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('signed_name', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Get signed waivers error:', error);
      return { success: false, error: 'Failed to load signed waivers.' };
    }

    const waivers: SignedWaiverRow[] = (data || []).map((row: any) => ({
      id: row.id,
      player_name: row.player?.full_name || row.signed_name,
      player_email: row.player?.email || '',
      agreed_at: row.agreed_at,
      season_name: row.season?.name || null,
      waiver_version: row.waiver_version,
      signature_type: row.signature_type,
    }));

    return {
      success: true,
      data: { waivers, total: count || 0 },
    };
  } catch (error) {
    console.error('Get signed waivers error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
