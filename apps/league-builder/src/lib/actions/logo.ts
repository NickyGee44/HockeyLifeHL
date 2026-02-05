'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const isDevelopment = process.env.NODE_ENV !== 'production';

export type LogoActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==============================================================================
// WIZARD LOGO UPLOAD (Before League Creation)
// ==============================================================================

/**
 * Upload a logo during the league creation wizard.
 * This stores the logo in a temporary location and returns a URL.
 * The logo path will be stored in the wizard form data and moved/associated
 * with the league after creation.
 */
export async function uploadWizardLogo(
  file: File
): Promise<LogoActionResult<{ url: string; path: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' };
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 2MB' };
    }

    // Generate unique filename using user ID and timestamp
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const timestamp = Date.now();
    const filename = `wizard-${user.id}-${timestamp}.${ext}`;
    const path = filename;

    // Upload to league-logos bucket
    const { error: uploadError } = await supabase.storage
      .from('league-logos')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      if (isDevelopment) {
        console.error('[uploadWizardLogo] Upload error:', uploadError);
      }
      return { success: false, error: `Failed to upload logo: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('league-logos')
      .getPublicUrl(path);

    if (isDevelopment) {
      console.log('[uploadWizardLogo] Logo uploaded:', urlData.publicUrl);
    }

    return {
      success: true,
      data: { url: urlData.publicUrl, path },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('[uploadWizardLogo] Error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a wizard logo (before league creation)
 */
export async function deleteWizardLogo(url: string): Promise<LogoActionResult<void>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Extract path from URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/league-logos/[path]
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/league-logos\/(.+)$/);

    if (!pathMatch || !pathMatch[1]) {
      // If URL doesn't match expected format, just return success
      // The URL might be from a different source or already deleted
      return { success: true, data: undefined };
    }

    const path = decodeURIComponent(pathMatch[1]);

    // Verify the path belongs to current user (wizard uploads are prefixed with wizard-{userId})
    if (!path.startsWith(`wizard-${user.id}-`)) {
      return { success: false, error: 'Not authorized to delete this logo' };
    }

    const { error: deleteError } = await supabase.storage
      .from('league-logos')
      .remove([path]);

    if (deleteError) {
      if (isDevelopment) {
        console.error('[deleteWizardLogo] Delete error:', deleteError);
      }
      // Don't fail if file doesn't exist
      if (!deleteError.message.includes('not found')) {
        return { success: false, error: 'Failed to delete logo' };
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (isDevelopment) {
      console.error('[deleteWizardLogo] Error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

// ==============================================================================
// LEAGUE LOGO MANAGEMENT (After League Creation)
// ==============================================================================

/**
 * Upload a logo for an existing league
 */
export async function uploadLeagueLogo(
  leagueId: string,
  file: File
): Promise<LogoActionResult<{ url: string; path: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user owns this league (through organization)
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, logo_url, organization_id, organizations!inner(owner_user_id)')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return { success: false, error: 'League not found' };
    }

    const orgOwner = (league.organizations as any)?.owner_user_id;
    if (orgOwner !== user.id) {
      return { success: false, error: 'Not authorized to update this league' };
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' };
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 2MB' };
    }

    // Delete old logo if exists
    if (league.logo_url) {
      try {
        const oldUrlObj = new URL(league.logo_url);
        const oldPathMatch = oldUrlObj.pathname.match(/\/storage\/v1\/object\/public\/league-logos\/(.+)$/);
        if (oldPathMatch && oldPathMatch[1]) {
          await supabase.storage.from('league-logos').remove([decodeURIComponent(oldPathMatch[1])]);
        }
      } catch {
        // Ignore errors deleting old logo
      }
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const timestamp = Date.now();
    const filename = `${leagueId}-${timestamp}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('league-logos')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      if (isDevelopment) {
        console.error('[uploadLeagueLogo] Upload error:', uploadError);
      }
      return { success: false, error: 'Failed to upload logo' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('league-logos')
      .getPublicUrl(filename);

    // Update league with new logo URL
    const { error: updateError } = await supabase
      .from('leagues')
      .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', leagueId);

    if (updateError) {
      // Try to clean up uploaded file
      await supabase.storage.from('league-logos').remove([filename]);
      return { success: false, error: 'Failed to update league with logo URL' };
    }

    revalidatePath('/dashboard/settings/branding');
    revalidatePath(`/dashboard/leagues/${leagueId}`);
    revalidatePath(`/dashboard/leagues/${leagueId}/settings`);

    return {
      success: true,
      data: { url: urlData.publicUrl, path: filename },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('[uploadLeagueLogo] Error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete a league's logo
 */
export async function deleteLeagueLogo(leagueId: string): Promise<LogoActionResult<void>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user owns this league (through organization)
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, logo_url, organization_id, organizations!inner(owner_user_id)')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      return { success: false, error: 'League not found' };
    }

    const orgOwner = (league.organizations as any)?.owner_user_id;
    if (orgOwner !== user.id) {
      return { success: false, error: 'Not authorized to update this league' };
    }

    // Delete logo from storage if exists
    if (league.logo_url) {
      try {
        const urlObj = new URL(league.logo_url);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/league-logos\/(.+)$/);
        if (pathMatch && pathMatch[1]) {
          await supabase.storage.from('league-logos').remove([decodeURIComponent(pathMatch[1])]);
        }
      } catch {
        // Ignore errors deleting from storage
      }
    }

    // Update league to remove logo URL
    const { error: updateError } = await supabase
      .from('leagues')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', leagueId);

    if (updateError) {
      return { success: false, error: 'Failed to update league' };
    }

    revalidatePath('/dashboard/settings/branding');
    revalidatePath(`/dashboard/leagues/${leagueId}`);
    revalidatePath(`/dashboard/leagues/${leagueId}/settings`);

    return { success: true, data: undefined };
  } catch (error) {
    if (isDevelopment) {
      console.error('[deleteLeagueLogo] Error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get the public URL for a league's logo
 */
export async function getLeagueLogoUrl(leagueId: string): Promise<LogoActionResult<string | null>> {
  const supabase = await createClient();

  try {
    const { data: league, error } = await supabase
      .from('leagues')
      .select('logo_url')
      .eq('id', leagueId)
      .single();

    if (error || !league) {
      return { success: false, error: 'League not found' };
    }

    return { success: true, data: league.logo_url };
  } catch (error) {
    if (isDevelopment) {
      console.error('[getLeagueLogoUrl] Error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get logo URL',
    };
  }
}
