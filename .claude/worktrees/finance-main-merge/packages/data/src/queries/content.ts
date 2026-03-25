import type { SupabaseClientArg, NewsArticle, GalleryAlbum, GalleryPhoto } from '../types';

export async function getNewsArticles(
  supabase: SupabaseClientArg,
  leagueId: string,
  limit = 20,
): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*, author:profiles(full_name, avatar_url)')
    .eq('league_id', leagueId)
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as NewsArticle[];
}

export async function getNewsArticleBySlug(
  supabase: SupabaseClientArg,
  leagueId: string,
  slug: string,
): Promise<NewsArticle | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*, author:profiles(full_name, avatar_url)')
    .eq('league_id', leagueId)
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error || !data) return null;
  return data as NewsArticle;
}

export async function getNewsArticleById(
  supabase: SupabaseClientArg,
  articleId: string,
): Promise<NewsArticle | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*, author:profiles(full_name, avatar_url)')
    .eq('id', articleId)
    .eq('published', true)
    .single();

  if (error || !data) return null;
  return data as NewsArticle;
}

export async function getGalleryAlbums(
  supabase: SupabaseClientArg,
  leagueId: string,
): Promise<GalleryAlbum[]> {
  const { data, error } = await supabase
    .from('gallery_albums')
    .select('*')
    .eq('league_id', leagueId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as GalleryAlbum[];
}

export async function getAlbumWithPhotos(
  supabase: SupabaseClientArg,
  albumId: string,
): Promise<{ album: GalleryAlbum; photos: GalleryPhoto[] } | null> {
  const { data: album, error: albumError } = await supabase
    .from('gallery_albums')
    .select('*')
    .eq('id', albumId)
    .single();

  if (albumError || !album) return null;

  const { data: photos } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('gallery_id', albumId)
    .order('display_order', { ascending: true });

  return {
    album: album as GalleryAlbum,
    photos: (photos || []) as GalleryPhoto[],
  };
}
