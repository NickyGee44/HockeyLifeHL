'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Save,
  Trash2,
  Eye,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createCustomPage,
  getCustomPageForEditor,
  getLeaguePreviewData,
  updateCustomPage,
} from '../actions';

type BlockType = 'heading' | 'text' | 'image' | 'divider' | 'callout' | 'link';
type HeadingLevel = 'h1' | 'h2' | 'h3';
type CalloutStyle = 'info' | 'warning' | 'success';

type ContentBlock =
  | { id: string; type: 'heading'; level: HeadingLevel; text: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'image'; url: string; alt: string; caption: string }
  | { id: string; type: 'divider' }
  | { id: string; type: 'callout'; text: string; style: CalloutStyle }
  | { id: string; type: 'link'; label: string; url: string };

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function createBlock(type: BlockType): ContentBlock {
  const id = createId();
  switch (type) {
    case 'heading':
      return { id, type, level: 'h2', text: '' };
    case 'text':
      return { id, type, text: '' };
    case 'image':
      return { id, type, url: '', alt: '', caption: '' };
    case 'divider':
      return { id, type };
    case 'callout':
      return { id, type, text: '', style: 'info' };
    case 'link':
      return { id, type, label: '', url: '' };
    default:
      return { id, type: 'text', text: '' };
  }
}

function normalizeBlocks(content: unknown): ContentBlock[] {
  if (!Array.isArray(content)) {
    return [];
  }

  const normalized = content
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const obj = raw as Record<string, unknown>;
      const type = obj.type;
      const id = typeof obj.id === 'string' && obj.id ? obj.id : createId();

      if (type === 'heading') {
        return {
          id,
          type: 'heading' as const,
          level: obj.level === 'h1' || obj.level === 'h3' ? obj.level : 'h2',
          text: typeof obj.text === 'string' ? obj.text : '',
        };
      }

      if (type === 'text') {
        return {
          id,
          type: 'text' as const,
          text: typeof obj.text === 'string' ? obj.text : '',
        };
      }

      if (type === 'image') {
        return {
          id,
          type: 'image' as const,
          url: typeof obj.url === 'string' ? obj.url : '',
          alt: typeof obj.alt === 'string' ? obj.alt : '',
          caption: typeof obj.caption === 'string' ? obj.caption : '',
        };
      }

      if (type === 'divider') {
        return { id, type: 'divider' as const };
      }

      if (type === 'callout') {
        return {
          id,
          type: 'callout' as const,
          text: typeof obj.text === 'string' ? obj.text : '',
          style: obj.style === 'warning' || obj.style === 'success' ? obj.style : 'info',
        };
      }

      if (type === 'link') {
        return {
          id,
          type: 'link' as const,
          label: typeof obj.label === 'string' ? obj.label : '',
          url: typeof obj.url === 'string' ? obj.url : '',
        };
      }

      return null;
    })
    .filter((block): block is ContentBlock => block !== null);

  return normalized;
}

export default function CustomPageEditorPage() {
  const router = useRouter();
  const params = useParams();

  const locale = params.locale as string;
  const leagueId = params.id as string;
  const pageId = params.pageId as string;
  const isNewPage = pageId === 'new';

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  const [leagueSlug, setLeagueSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      const leagueResult = await getLeaguePreviewData(leagueId);
      if (!active) return;

      if (leagueResult.success) {
        setLeagueSlug(leagueResult.data.slug);
      } else {
        setError(leagueResult.error);
      }

      if (!isNewPage) {
        const pageResult = await getCustomPageForEditor(pageId, leagueId);
        if (!active) return;

        if (!pageResult.success) {
          setError(pageResult.error);
          setLoading(false);
          return;
        }

        const page = pageResult.data;
        setTitle(page.title || '');
        setSlug(page.slug || '');
        setIsPublished(Boolean(page.is_published));
        setBlocks(normalizeBlocks(page.content));
        setSlugManuallyEdited(Boolean(page.slug));
      }

      setLoading(false);
    }

    loadData();

    return () => {
      active = false;
    };
  }, [isNewPage, pageId, leagueId]);

  function updateBlock(index: number, updated: ContentBlock) {
    setBlocks((prev) => prev.map((block, i) => (i === index ? updated : block)));
  }

  function deleteBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  }

  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, createBlock(type)]);
  }

  function onTitleChange(nextTitle: string) {
    setTitle(nextTitle);
    if (!slugManuallyEdited) {
      setSlug(slugify(nextTitle));
    }
  }

  async function handleSave() {
    const cleanedTitle = title.trim();
    const derivedSlug = slugify(slug || title);

    if (!cleanedTitle) {
      setError('Title is required.');
      return;
    }

    if (!derivedSlug) {
      setError('Slug is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: cleanedTitle,
        slug: derivedSlug,
        content: blocks,
        is_published: isPublished,
      };

      if (isNewPage) {
        const result = await createCustomPage(leagueId, {
          ...payload,
          sort_order: Date.now(),
        });

        if (!result.success) {
          setError(result.error);
          setSaving(false);
          return;
        }

        router.replace(`/${locale}/dashboard/leagues/${leagueId}/pages/${result.data.id}`);
        router.refresh();
      } else {
        const result = await updateCustomPage(pageId, leagueId, payload);

        if (!result.success) {
          setError(result.error);
          setSaving(false);
          return;
        }

        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function openPreview() {
    if (!leagueSlug || !slugify(slug || title)) {
      return;
    }

    const url = `/${leagueSlug}/p/${slugify(slug || title)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const editorTitle = useMemo(() => (isNewPage ? 'New Custom Page' : 'Edit Custom Page'), [isNewPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-5xl px-4 py-8 text-neutral-300 sm:px-6 lg:px-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/pages`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Custom Pages
          </Link>

          <h1 className="text-3xl font-black tracking-tight text-white">{editorTitle}</h1>
          <p className="mt-1 text-neutral-400">Build and publish custom league website pages.</p>
        </div>

        {error && (
          <Card className="mb-4 border-red-500/30 bg-red-500/10 text-red-200">
            <CardContent className="pt-6">{error}</CardContent>
          </Card>
        )}

        <Card className="mb-6 border-white/10 bg-white/[0.04] text-white">
          <CardHeader>
            <CardTitle>Page Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="page-title" className="text-sm text-neutral-300">Title</label>
              <Input
                id="page-title"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="About Our League"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="page-slug" className="text-sm text-neutral-300">Slug</label>
              <Input
                id="page-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="about-our-league"
              />
              <p className="text-xs text-neutral-500">Public URL: /p/{slugify(slug || title) || 'your-slug'}</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-neutral-900/50 px-3 py-2">
              <span className="text-sm text-neutral-300">Published</span>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-white/10 bg-white/[0.04] text-white">
          <CardHeader>
            <CardTitle>Add Block</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock('heading')}>Heading</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock('text')}>Text</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock('image')}>Image</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock('divider')}>Divider</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock('callout')}>Callout</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock('link')}>Link</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {blocks.map((block, index) => (
            <Card key={block.id} className="border-white/10 bg-white/[0.04] text-white">
              <CardContent className="pt-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium uppercase tracking-wide text-neutral-400">{block.type}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteBlock(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {block.type === 'heading' && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Select
                      value={block.level}
                      onValueChange={(value: HeadingLevel) =>
                        updateBlock(index, { ...block, level: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Heading level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h1">H1</SelectItem>
                        <SelectItem value="h2">H2</SelectItem>
                        <SelectItem value="h3">H3</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="md:col-span-2">
                      <Input
                        value={block.text}
                        onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                        placeholder="Heading text"
                      />
                    </div>
                  </div>
                )}

                {block.type === 'text' && (
                  <Textarea
                    value={block.text}
                    onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                    placeholder="Write your text"
                    rows={5}
                  />
                )}

                {block.type === 'image' && (
                  <div className="space-y-3">
                    <Input
                      value={block.url}
                      onChange={(e) => updateBlock(index, { ...block, url: e.target.value })}
                      placeholder="Image URL"
                    />
                    <Input
                      value={block.alt}
                      onChange={(e) => updateBlock(index, { ...block, alt: e.target.value })}
                      placeholder="Alt text"
                    />
                    <Input
                      value={block.caption}
                      onChange={(e) => updateBlock(index, { ...block, caption: e.target.value })}
                      placeholder="Caption"
                    />
                  </div>
                )}

                {block.type === 'divider' && (
                  <div className="rounded-md border border-dashed border-white/20 py-3 text-center text-sm text-neutral-400">
                    Divider
                  </div>
                )}

                {block.type === 'callout' && (
                  <div className="space-y-3">
                    <Select
                      value={block.style}
                      onValueChange={(value: CalloutStyle) =>
                        updateBlock(index, { ...block, style: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Callout style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={block.text}
                      onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                      placeholder="Callout text"
                      rows={4}
                    />
                  </div>
                )}

                {block.type === 'link' && (
                  <div className="space-y-3">
                    <Input
                      value={block.label}
                      onChange={(e) => updateBlock(index, { ...block, label: e.target.value })}
                      placeholder="Link label"
                    />
                    <Input
                      value={block.url}
                      onChange={(e) => updateBlock(index, { ...block, url: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {blocks.length === 0 && (
            <Card className="border-white/10 bg-white/[0.04] text-white">
              <CardContent className="py-10 text-center text-neutral-400">
                No blocks yet. Add your first content block.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={openPreview}
            disabled={!leagueSlug || !slugify(slug || title)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
