'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createNewsArticle } from '@/lib/actions/news';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewNewsArticlePage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const leagueId = params.id as string;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await createNewsArticle({
      leagueId,
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

          <h1 className="text-3xl font-black text-white tracking-tight">New Article</h1>
          <p className="text-neutral-400 mt-1">Create a new news article</p>
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
                onChange={(e) => handleTitleChange(e.target.value)}
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
                placeholder="auto-generated-from-title"
                className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50 focus:border-rink-500"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Auto-generated from title. Used in the article URL.
              </p>
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
              {saving ? 'Creating...' : 'Create Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
