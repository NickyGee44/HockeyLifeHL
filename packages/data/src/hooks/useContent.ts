import { useQuery } from '@tanstack/react-query';
import type { SupabaseClientArg } from '../types';
import * as queries from '../queries';

export function useNewsArticle(
  supabase: SupabaseClientArg,
  leagueId: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ['news-article', leagueId, slug],
    queryFn: () => queries.getNewsArticleBySlug(supabase, leagueId!, slug!),
    enabled: !!leagueId && !!slug,
  });
}

export function useNewsArticleById(
  supabase: SupabaseClientArg,
  articleId: string | undefined,
) {
  return useQuery({
    queryKey: ['news-article-by-id', articleId],
    queryFn: () => queries.getNewsArticleById(supabase, articleId!),
    enabled: !!articleId,
  });
}

export function useAlbumWithPhotos(
  supabase: SupabaseClientArg,
  albumId: string | undefined,
) {
  return useQuery({
    queryKey: ['album-with-photos', albumId],
    queryFn: () => queries.getAlbumWithPhotos(supabase, albumId!),
    enabled: !!albumId,
  });
}
