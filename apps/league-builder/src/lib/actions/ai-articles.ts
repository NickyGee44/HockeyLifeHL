'use server';

import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

interface AiGenerationLogEntry {
  id: string;
  league_id: string;
  article_type: string;
  status: string;
  game_id: string | null;
  division_id: string | null;
  article_id: string | null;
  tokens_used: number | null;
  model_used: string | null;
  generation_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Regenerate a game recap article
 */
export async function regenerateGameRecap(
  gameId: string,
  leagueId: string
): Promise<ActionResult> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    // Delete existing recap article and tags
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id')
      .eq('game_id', gameId)
      .eq('type', 'game_recap')
      .maybeSingle();

    if (existingArticle) {
      await supabase.from('article_player_tags').delete().eq('article_id', existingArticle.id);
      await supabase.from('articles').delete().eq('id', existingArticle.id);
    }

    // Delete existing log entry
    await supabase
      .from('ai_generation_log')
      .delete()
      .eq('game_id', gameId)
      .eq('article_type', 'game_recap');

    // Invoke edge function
    const { error } = await supabase.functions.invoke('generate-ai-article', {
      body: { action: 'game_recap', game_id: gameId },
    });

    if (error) {
      if (isDevelopment) console.error('Regenerate recap error:', error);
      return { success: false, error: 'Failed to regenerate recap' };
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (isDevelopment) console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update article image
 */
export async function updateArticleImage(
  articleId: string,
  imageUrl: string
): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    // Get article to verify league ownership
    const { data: article } = await supabase
      .from('articles')
      .select('league_id')
      .eq('id', articleId)
      .single();

    if (!article) {
      return { success: false, error: 'Article not found' };
    }

    const access = await verifyLeagueOwnerAccess(article.league_id);
    if (!access.authorized) {
      return { success: false, error: access.error || 'Not authorized' };
    }

    const { error } = await supabase
      .from('articles')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', articleId);

    if (error) {
      return { success: false, error: 'Failed to update image' };
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (isDevelopment) console.error('Update image error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get AI generation history for a league
 */
export async function getAiGenerationHistory(
  leagueId: string
): Promise<ActionResult<AiGenerationLogEntry[]>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('ai_generation_log')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return { success: false, error: 'Failed to fetch generation history' };
    }

    return { success: true, data: (data || []) as AiGenerationLogEntry[] };
  } catch (error) {
    if (isDevelopment) console.error('Fetch history error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
