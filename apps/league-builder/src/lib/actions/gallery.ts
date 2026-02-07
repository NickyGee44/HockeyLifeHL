'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

export interface GalleryAlbum {
  id: string;
  league_id: string;
  season_id: string | null;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  photo_count?: number;
}

export interface GalleryPhoto {
  id: string;
  gallery_id: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  display_order: number;
  created_at: string;
}

/**
 * Get all gallery albums for a league
 */
export async function getGalleryAlbums(leagueId: string): Promise<{
  success: boolean;
  data?: GalleryAlbum[];
  error?: string;
}> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  const { data: albums, error } = await (supabase
    .from('league_gallery') as any)
    .select('*, gallery_photos(count)')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isDevelopment) console.error('Error fetching albums:', error);
    return { success: false, error: 'Failed to fetch albums' };
  }

  const albumsWithCount = (albums || []).map((album: any) => ({
    ...album,
    photo_count: album.gallery_photos?.[0]?.count || 0,
  }));

  return { success: true, data: albumsWithCount };
}

/**
 * Create a new gallery album
 */
export async function createAlbum(params: {
  leagueId: string;
  title: string;
  description?: string;
  seasonId?: string;
  coverPhotoUrl?: string;
}): Promise<{ success: boolean; data?: GalleryAlbum; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('league_gallery') as any)
    .insert({
      league_id: params.leagueId,
      title: params.title,
      description: params.description || null,
      season_id: params.seasonId || null,
      cover_photo_url: params.coverPhotoUrl || null,
      is_published: false,
    })
    .select()
    .single();

  if (error) {
    if (isDevelopment) console.error('Error creating album:', error);
    return { success: false, error: 'Failed to create album' };
  }

  revalidatePath(`/dashboard/leagues/${params.leagueId}/gallery`);
  return { success: true, data };
}

/**
 * Update an existing gallery album
 */
export async function updateAlbum(
  albumId: string,
  updates: {
    title?: string;
    description?: string;
    seasonId?: string;
    coverPhotoUrl?: string;
    isPublished?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Fetch album to get league_id
  const { data: album } = await (supabase
    .from('league_gallery') as any)
    .select('league_id')
    .eq('id', albumId)
    .single();

  if (!album) return { success: false, error: 'Album not found' };

  const access = await verifyLeagueOwnerAccess(album.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.seasonId !== undefined) updateData.season_id = updates.seasonId;
  if (updates.coverPhotoUrl !== undefined) updateData.cover_photo_url = updates.coverPhotoUrl;
  if (updates.isPublished !== undefined) updateData.is_published = updates.isPublished;

  const { error } = await (supabase
    .from('league_gallery') as any)
    .update(updateData)
    .eq('id', albumId);

  if (error) {
    if (isDevelopment) console.error('Error updating album:', error);
    return { success: false, error: 'Failed to update album' };
  }

  revalidatePath(`/dashboard/leagues/${album.league_id}/gallery`);
  return { success: true };
}

/**
 * Delete a gallery album and all its photos
 */
export async function deleteAlbum(albumId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: album } = await (supabase
    .from('league_gallery') as any)
    .select('league_id')
    .eq('id', albumId)
    .single();

  if (!album) return { success: false, error: 'Album not found' };

  const access = await verifyLeagueOwnerAccess(album.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  // Delete photos first (cascade should handle this, but be safe)
  await (supabase.from('gallery_photos') as any).delete().eq('gallery_id', albumId);

  const { error } = await (supabase
    .from('league_gallery') as any)
    .delete()
    .eq('id', albumId);

  if (error) {
    if (isDevelopment) console.error('Error deleting album:', error);
    return { success: false, error: 'Failed to delete album' };
  }

  revalidatePath(`/dashboard/leagues/${album.league_id}/gallery`);
  return { success: true };
}

/**
 * Get all photos in an album
 */
export async function getAlbumPhotos(albumId: string): Promise<{
  success: boolean;
  data?: GalleryPhoto[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data: album } = await (supabase
    .from('league_gallery') as any)
    .select('league_id')
    .eq('id', albumId)
    .single();

  if (!album) return { success: false, error: 'Album not found' };

  const access = await verifyLeagueOwnerAccess(album.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const { data: photos, error } = await (supabase
    .from('gallery_photos') as any)
    .select('*')
    .eq('gallery_id', albumId)
    .order('display_order', { ascending: true });

  if (error) {
    if (isDevelopment) console.error('Error fetching photos:', error);
    return { success: false, error: 'Failed to fetch photos' };
  }

  return { success: true, data: photos || [] };
}

/**
 * Add photos to an album (bulk)
 */
export async function addPhotos(
  albumId: string,
  photos: { url: string; thumbnailUrl?: string; caption?: string }[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: album } = await (supabase
    .from('league_gallery') as any)
    .select('league_id')
    .eq('id', albumId)
    .single();

  if (!album) return { success: false, error: 'Album not found' };

  const access = await verifyLeagueOwnerAccess(album.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  // Get current max display_order
  const { data: existing } = await (supabase
    .from('gallery_photos') as any)
    .select('display_order')
    .eq('gallery_id', albumId)
    .order('display_order', { ascending: false })
    .limit(1);

  const startOrder = (existing?.[0]?.display_order || 0) + 1;

  const photoRecords = photos.map((photo, index) => ({
    gallery_id: albumId,
    url: photo.url,
    thumbnail_url: photo.thumbnailUrl || null,
    caption: photo.caption || null,
    display_order: startOrder + index,
  }));

  const { error } = await (supabase
    .from('gallery_photos') as any)
    .insert(photoRecords);

  if (error) {
    if (isDevelopment) console.error('Error adding photos:', error);
    return { success: false, error: 'Failed to add photos' };
  }

  revalidatePath(`/dashboard/leagues/${album.league_id}/gallery`);
  return { success: true };
}

/**
 * Update a photo's caption or display order
 */
export async function updatePhoto(
  photoId: string,
  updates: { caption?: string; displayOrder?: number }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get photo -> album -> league
  const { data: photo } = await (supabase
    .from('gallery_photos') as any)
    .select('gallery_id, league_gallery(league_id)')
    .eq('id', photoId)
    .single();

  if (!photo) return { success: false, error: 'Photo not found' };

  const leagueId = (photo as any).league_gallery?.league_id;
  if (!leagueId) return { success: false, error: 'Album not found' };

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const updateData: Record<string, unknown> = {};
  if (updates.caption !== undefined) updateData.caption = updates.caption;
  if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;

  const { error } = await (supabase
    .from('gallery_photos') as any)
    .update(updateData)
    .eq('id', photoId);

  if (error) {
    if (isDevelopment) console.error('Error updating photo:', error);
    return { success: false, error: 'Failed to update photo' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/gallery`);
  return { success: true };
}

/**
 * Delete a photo from an album
 */
export async function deletePhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: photo } = await (supabase
    .from('gallery_photos') as any)
    .select('gallery_id, league_gallery(league_id)')
    .eq('id', photoId)
    .single();

  if (!photo) return { success: false, error: 'Photo not found' };

  const leagueId = (photo as any).league_gallery?.league_id;
  if (!leagueId) return { success: false, error: 'Album not found' };

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const { error } = await (supabase
    .from('gallery_photos') as any)
    .delete()
    .eq('id', photoId);

  if (error) {
    if (isDevelopment) console.error('Error deleting photo:', error);
    return { success: false, error: 'Failed to delete photo' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/gallery`);
  return { success: true };
}
