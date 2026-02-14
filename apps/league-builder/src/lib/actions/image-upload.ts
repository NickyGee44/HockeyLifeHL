'use server';

import { createClient } from '@/lib/supabase/server';

const isDevelopment = process.env.NODE_ENV !== 'production';

export type ImageActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==============================================================================
// GENERIC HELPERS
// ==============================================================================

async function uploadImage(
  bucketName: string,
  leagueId: string,
  file: File,
  options: {
    maxSize: number;
    allowedTypes: string[];
    label: string;
  }
): Promise<ImageActionResult<{ url: string; path: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    if (!options.allowedTypes.includes(file.type)) {
      return { success: false, error: `Invalid file type for ${options.label}` };
    }

    if (file.size > options.maxSize) {
      const sizeMB = Math.round(options.maxSize / 1024 / 1024);
      return { success: false, error: `File too large. Maximum size is ${sizeMB}MB` };
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const timestamp = Date.now();
    const path = `${leagueId}/${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      if (isDevelopment) {
        console.error(`[upload ${options.label}] Upload error:`, uploadError);
      }
      return { success: false, error: `Failed to upload ${options.label}: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    return {
      success: true,
      data: { url: urlData.publicUrl, path },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error(`[upload ${options.label}] Error:`, error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

async function deleteImage(
  bucketName: string,
  url: string
): Promise<ImageActionResult<void>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(
      new RegExp(`/storage/v1/object/public/${bucketName}/(.+)$`)
    );

    if (!pathMatch || !pathMatch[1]) {
      // URL is from an external source, nothing to delete from storage
      return { success: true, data: undefined };
    }

    const path = decodeURIComponent(pathMatch[1]);

    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (deleteError) {
      if (isDevelopment) {
        console.error(`[delete ${bucketName}] Delete error:`, deleteError);
      }
      if (!deleteError.message.includes('not found')) {
        return { success: false, error: 'Failed to delete image' };
      }
    }

    return { success: true, data: undefined };
  } catch {
    // If URL parsing fails, it's likely an external URL — nothing to clean up
    return { success: true, data: undefined };
  }
}

// ==============================================================================
// SPONSOR LOGOS
// ==============================================================================

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const TWO_MB = 2 * 1024 * 1024;
const FIVE_MB = 5 * 1024 * 1024;

export async function uploadSponsorLogo(
  leagueId: string,
  file: File
): Promise<ImageActionResult<{ url: string; path: string }>> {
  return uploadImage('sponsor-logos', leagueId, file, {
    maxSize: TWO_MB,
    allowedTypes: LOGO_TYPES,
    label: 'sponsor logo',
  });
}

export async function deleteSponsorLogo(
  leagueId: string,
  url: string
): Promise<ImageActionResult<void>> {
  return deleteImage('sponsor-logos', url);
}

// ==============================================================================
// NEWS IMAGES
// ==============================================================================

export async function uploadNewsImage(
  leagueId: string,
  file: File
): Promise<ImageActionResult<{ url: string; path: string }>> {
  return uploadImage('news-images', leagueId, file, {
    maxSize: FIVE_MB,
    allowedTypes: IMAGE_TYPES,
    label: 'news image',
  });
}

export async function deleteNewsImage(
  leagueId: string,
  url: string
): Promise<ImageActionResult<void>> {
  return deleteImage('news-images', url);
}

// ==============================================================================
// GALLERY COVER PHOTOS
// ==============================================================================

export async function uploadGalleryCover(
  leagueId: string,
  file: File
): Promise<ImageActionResult<{ url: string; path: string }>> {
  return uploadImage('gallery-images', leagueId, file, {
    maxSize: FIVE_MB,
    allowedTypes: IMAGE_TYPES,
    label: 'gallery cover',
  });
}

export async function deleteGalleryCover(
  leagueId: string,
  url: string
): Promise<ImageActionResult<void>> {
  return deleteImage('gallery-images', url);
}

// ==============================================================================
// STAFF PHOTOS
// ==============================================================================

export async function uploadStaffPhoto(
  leagueId: string,
  file: File
): Promise<ImageActionResult<{ url: string; path: string }>> {
  return uploadImage('staff-photos', leagueId, file, {
    maxSize: TWO_MB,
    allowedTypes: IMAGE_TYPES,
    label: 'staff photo',
  });
}

export async function deleteStaffPhoto(
  leagueId: string,
  url: string
): Promise<ImageActionResult<void>> {
  return deleteImage('staff-photos', url);
}
