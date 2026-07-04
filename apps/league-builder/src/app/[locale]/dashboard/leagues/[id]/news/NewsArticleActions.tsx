'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { publishNewsArticle, unpublishNewsArticle, deleteNewsArticle } from '@/lib/actions/news';
import { regenerateGameRecap } from '@/lib/actions/ai-articles';
import { cn } from '@hockey-life/ui';
import { Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface NewsArticleActionsProps {
  articleId: string;
  published: boolean;
  /** Present only for AI game-recap articles — enables the Regenerate action. */
  gameId?: string | null;
  leagueId?: string;
}

export function NewsArticleActions({ articleId, published, gameId, leagueId }: NewsArticleActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    if (!gameId || !leagueId) return;
    if (!confirm('Regenerate this recap? The current article will be replaced.')) return;
    setRegenerating(true);
    try {
      const result = await regenerateGameRecap(gameId, leagueId);
      if (!result.success) {
        alert(result.error || 'Failed to regenerate recap.');
      }
      router.refresh();
    } catch {
      alert('Failed to regenerate recap.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleTogglePublish() {
    setLoading(true);
    try {
      if (published) {
        await unpublishNewsArticle(articleId);
      } else {
        await publishNewsArticle(articleId);
      }
      router.refresh();
    } catch {
      // Error handled by server action
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this article?')) return;
    setLoading(true);
    try {
      await deleteNewsArticle(articleId);
      router.refresh();
    } catch {
      // Error handled by server action
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {gameId && leagueId ? (
        <button
          onClick={handleRegenerate}
          disabled={loading || regenerating}
          className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
          title="Regenerate recap"
        >
          <RefreshCw className={cn('w-4 h-4', regenerating && 'animate-spin')} />
        </button>
      ) : null}
      <button
        onClick={handleTogglePublish}
        disabled={loading}
        className={cn(
          'p-2 rounded-lg text-sm transition-colors disabled:opacity-50',
          published
            ? 'text-yellow-500 hover:bg-yellow-500/10'
            : 'text-green-500 hover:bg-green-500/10'
        )}
        title={published ? 'Unpublish' : 'Publish'}
      >
        {published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
