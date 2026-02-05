'use server';

/**
 * Storage Server Actions
 *
 * Handles file uploads to Supabase storage buckets.
 * Security:
 * - Validates file types and sizes
 * - Uses authenticated user context
 * - Generates unique file names to prevent overwrites
 */

import { createClient } from '@/lib/supabase/server';

type ActionResult<T = void> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>;

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload a league logo to storage
 */
export async function uploadLeagueLogo(
  formData: FormData
): ActionResult<{ url: string; path: string }> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to upload files' };
    }

    // Get file from form data
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed: PNG, JPG, WebP, SVG`,
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    // Generate unique file name
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to storage
    const { data, error: uploadError } = await supabase.storage
      .from('league-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Storage] Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file. Please try again.' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('league-logos')
      .getPublicUrl(data.path);

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        path: data.path,
      },
    };
  } catch (error) {
    console.error('[Storage] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a league logo from storage
 */
export async function deleteLeagueLogo(path: string): ActionResult<void> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to delete files' };
    }

    // Security: Only allow deleting files in user's folder
    if (!path.startsWith(`${user.id}/`)) {
      return { success: false, error: 'You can only delete your own files' };
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('league-logos')
      .remove([path]);

    if (deleteError) {
      console.error('[Storage] Delete error:', deleteError);
      return { success: false, error: 'Failed to delete file' };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[Storage] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Upload a team logo to storage
 */
export async function uploadTeamLogo(
  formData: FormData
): ActionResult<{ url: string; path: string }> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to upload files' };
    }

    // Get file from form data
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed: PNG, JPG, WebP, SVG`,
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    // Generate unique file name
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to storage
    const { data, error: uploadError } = await supabase.storage
      .from('team-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Storage] Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file. Please try again.' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('team-logos')
      .getPublicUrl(data.path);

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        path: data.path,
      },
    };
  } catch (error) {
    console.error('[Storage] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
