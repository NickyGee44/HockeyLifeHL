'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createNewsArticle } from '@/lib/actions/news';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Save, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { LogoUploader } from '@/components/ui/logo-uploader';
import { uploadNewsImage, deleteNewsImage } from '@/lib/actions/image-upload';

type ArticleType = 'news' | 'game_recap' | 'weekly_wrap';

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

  // AI generation state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiArticleType, setAiArticleType] = useState<ArticleType>('news');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) {
      setAiError('Please describe what you want to write about.');
      return;
    }

    setAiGenerating(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          prompt: aiPrompt.trim(),
          articleType: aiArticleType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAiError(data.error || 'Failed to generate article.');
        return;
      }

      // Populate the form fields with generated content
      if (data.title) {
        setTitle(data.title);
        setSlug(generateSlug(data.title));
      }
      if (data.content) {
        setContent(data.content);
      }
      if (data.excerpt) {
        setExcerpt(data.excerpt);
      }

      // Collapse the AI panel after successful generation
      setAiOpen(false);
    } catch {
      setAiError('Network error. Please check your connection and try again.');
    } finally {
      setAiGenerating(false);
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

        {/* AI Generate Section */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setAiOpen(!aiOpen)}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl font-semibold text-sm transition-all',
              'bg-gradient-to-r from-purple-500/10 to-rink-500/10',
              'border border-purple-500/20 hover:border-purple-500/40',
              'text-purple-300 hover:text-purple-200'
            )}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate with AI
            </span>
            {aiOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {aiOpen && (
            <div className="mt-3 bg-white/[0.04] border border-purple-500/20 backdrop-blur-xl rounded-2xl p-6 space-y-4">
              <p className="text-sm text-neutral-400">
                Describe what you want to write about in a few sentences. The AI will generate a title, content, and excerpt that you can edit before saving.
              </p>

              {aiError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {aiError}
                </div>
              )}

              {/* Article Type Select */}
              <div>
                <label htmlFor="ai-type" className="block text-sm font-medium text-neutral-300 mb-2">
                  Article Type
                </label>
                <select
                  id="ai-type"
                  value={aiArticleType}
                  onChange={(e) => setAiArticleType(e.target.value as ArticleType)}
                  disabled={aiGenerating}
                  className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 appearance-none"
                >
                  <option value="news">General News</option>
                  <option value="game_recap">Game Recap</option>
                  <option value="weekly_wrap">Weekly Wrap-Up</option>
                </select>
              </div>

              {/* Prompt */}
              <div>
                <label htmlFor="ai-prompt" className="block text-sm font-medium text-neutral-300 mb-2">
                  What should the article be about?
                </label>
                <textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={
                    aiArticleType === 'game_recap'
                      ? 'e.g., The Wolves beat the Bears 5-3 in a back-and-forth game. Jake scored a hat trick and the goalie made 30 saves...'
                      : aiArticleType === 'weekly_wrap'
                        ? 'e.g., This week saw some exciting matchups. The top team lost their first game of the season...'
                        : 'e.g., Registration for the spring season opens next Monday. We have 3 new teams joining...'
                  }
                  rows={4}
                  maxLength={2000}
                  disabled={aiGenerating}
                  className="w-full px-4 py-3 bg-neutral-900 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-y"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {aiPrompt.length}/2000 characters
                </p>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
                  'bg-gradient-to-r from-purple-500 to-rink-500 text-white',
                  'hover:shadow-lg hover:shadow-purple-500/20 transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Article
                  </>
                )}
              </button>
            </div>
          )}
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

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Featured Image
              </label>
              <LogoUploader
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
                onUpload={async (file) => {
                  const result = await uploadNewsImage(leagueId, file);
                  if (!result.success) throw new Error(result.error);
                  return result.data;
                }}
                onRemove={async () => {
                  if (imageUrl) {
                    await deleteNewsImage(leagueId, imageUrl);
                    setImageUrl('');
                  }
                }}
                aspectRatio={16 / 9}
                outputSize={1200}
                maxSizeBytes={5 * 1024 * 1024}
                placeholder="Upload Featured Image"
                shape="square"
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
