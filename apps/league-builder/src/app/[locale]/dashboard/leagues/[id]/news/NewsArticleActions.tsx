'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { publishNewsArticle, unpublishNewsArticle, deleteNewsArticle } from '@/lib/actions/news';
import { cn } from '@hockey-life/ui';
import { Trash2, Eye, EyeOff } from 'lucide-react';

interface NewsArticleActionsProps {
  articleId: string;
  published: boolean;
}

export function NewsArticleActions({ articleId, published }: NewsArticleActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
