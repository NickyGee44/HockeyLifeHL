'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getNewsArticle, updateNewsArticle, deleteNewsArticle } from '@/lib/actions/news';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

export default function EditNewsArticlePage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const leagueId = params.id as string;
  const articleId = params.articleId as string;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArticle() {
      const result = await getNewsArticle(articleId);
      if (result.success) {
        setTitle(result.data.title);
        setSlug(result.data.slug || '');
        setContent(result.data.content || '');
        setExcerpt(result.data.excerpt || '');
        setImageUrl(result.data.image_url || '');
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    loadArticle();
  }, [articleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await updateNewsArticle(articleId, {
      title: title.trim(),
      content: content.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      slug: slug.trim() || undefined,
    });

    if (result.success) {
      router.push(`/${locale}/dashboard/leagues/${leagueId}/news`);
    } else {
      setError(result.error);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    const result = await deleteNewsArticle(articleId);
    if (result.success) {
      router.push(`/${locale}/dashboard/leagues/${leagueId}/news`);
    } else {
      setError(result.error);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Loading article...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/news`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Edit Article</h1>
              <p className="text-neutral-400 mt-1">Update your news article</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-neutral-300 mb-2">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-rink-500"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-neutral-300 mb-2">
                URL Slug
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-slug"
                className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-rink-500"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label htmlFor="excerpt" className="block text-sm font-medium text-neutral-300 mb-2">
                Excerpt
              </label>
              <textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary for article cards..."
                rows={2}
                className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-rink-500 resize-y"
              />
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-neutral-300 mb-2">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article content here..."
                rows={12}
                className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-rink-500 resize-y"
              />
            </div>

            {/* Image URL */}
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-neutral-300 mb-2">
                Image URL
              </label>
              <input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-rink-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/${locale}/dashboard/leagues/${leagueId}/news`}
              className="px-5 py-2.5 rounded-xl font-medium text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
                'hover:shadow-lg hover:shadow-rink-500/20 transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
