'use client';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlignLeft,
  AlertCircle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Minus,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  type LeaguePreviewData,
} from '../actions';
import { uploadPageImage, deletePageImage } from '@/lib/actions/image-upload';

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
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

function getLeagueSiteUrl(leagueSlug: string, pageSlug: string): string {
  const explicitBase = process.env.NEXT_PUBLIC_LEAGUE_SITES_URL;
  if (explicitBase) {
    const base = explicitBase.endsWith('/') ? explicitBase.slice(0, -1) : explicitBase;
    return `${base}/${leagueSlug}/p/${pageSlug}`;
  }

  const sitesBaseDomain = process.env.NEXT_PUBLIC_SITES_BASE_DOMAIN || 'beerleaguehockey.ca';
  return `https://${leagueSlug}.${sitesBaseDomain}/p/${pageSlug}`;
}

function createBlock(type: BlockType): ContentBlock {
  const id = createId();
  switch (type) {
    case 'heading': return { id, type, level: 'h2', text: '' };
    case 'text': return { id, type, text: '' };
    case 'image': return { id, type, url: '', alt: '', caption: '' };
    case 'divider': return { id, type };
    case 'callout': return { id, type, text: '', style: 'info' };
    case 'link': return { id, type, label: '', url: '' };
    default: return { id, type: 'text', text: '' };
  }
}

function normalizeBlocks(content: unknown): ContentBlock[] {
  if (!Array.isArray(content)) return [];
  return content.map((raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const type = obj.type;
    const id = typeof obj.id === 'string' && obj.id ? obj.id : createId();
    if (type === 'heading') return { id, type: 'heading' as const, level: obj.level === 'h1' || obj.level === 'h3' ? obj.level : 'h2', text: typeof obj.text === 'string' ? obj.text : '' };
    if (type === 'text') return { id, type: 'text' as const, text: typeof obj.text === 'string' ? obj.text : '' };
    if (type === 'image') return { id, type: 'image' as const, url: typeof obj.url === 'string' ? obj.url : '', alt: typeof obj.alt === 'string' ? obj.alt : '', caption: typeof obj.caption === 'string' ? obj.caption : '' };
    if (type === 'divider') return { id, type: 'divider' as const };
    if (type === 'callout') return { id, type: 'callout' as const, text: typeof obj.text === 'string' ? obj.text : '', style: obj.style === 'warning' || obj.style === 'success' ? obj.style : 'info' };
    if (type === 'link') return { id, type: 'link' as const, label: typeof obj.label === 'string' ? obj.label : '', url: typeof obj.url === 'string' ? obj.url : '' };
    return null;
  }).filter((b): b is ContentBlock => b !== null);
}

// ─── Block type metadata ───────────────────────────────────────────────────

const BLOCK_TYPES: { type: BlockType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'heading', label: 'Heading', Icon: Type },
  { type: 'text', label: 'Text', Icon: AlignLeft },
  { type: 'image', label: 'Image', Icon: ImageIcon },
  { type: 'divider', label: 'Divider', Icon: Minus },
  { type: 'callout', label: 'Callout', Icon: AlertCircle },
  { type: 'link', label: 'Link', Icon: LinkIcon },
];

function blockIcon(type: BlockType) {
  return BLOCK_TYPES.find((b) => b.type === type)?.Icon ?? AlignLeft;
}

function blockContentPreview(block: ContentBlock): string {
  switch (block.type) {
    case 'heading': return block.text ? `${block.level.toUpperCase()}: ${block.text.slice(0, 55)}` : `${block.level.toUpperCase()}: (empty)`;
    case 'text': return block.text ? block.text.slice(0, 60) : '(empty text)';
    case 'image': return block.url ? 'Image uploaded' : 'No image yet';
    case 'divider': return '──────────────';
    case 'callout': return block.text ? `[${block.style}] ${block.text.slice(0, 50)}` : `[${block.style}] (empty)`;
    case 'link': return block.label ? `${block.label} → ${block.url.slice(0, 30)}` : '(empty link)';
    default: return '';
  }
}

// ─── Inline image uploader ─────────────────────────────────────────────────

function InlineImageUploader({ leagueId, value, onChange }: { leagueId: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5MB.'); return; }
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadPageImage(leagueId, file);
      if (result.success) onChange(result.data.url);
      else setUploadError(result.error);
    } finally { setUploading(false); }
  }

  async function handleRemove() {
    if (value) await deletePageImage(leagueId, value);
    onChange('');
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full max-h-56 object-cover" />
          <button type="button" onClick={handleRemove} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed border-neutral-700 text-neutral-400 hover:border-rink-500 hover:text-rink-400 transition-colors disabled:opacity-50">
          {uploading
            ? <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Uploading...</span></>
            : <><Upload className="w-6 h-6" /><span className="text-sm">Click to upload image</span><span className="text-xs text-neutral-600">PNG, JPG, WebP — max 5MB</span></>}
        </button>
      )}
      {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ─── Add block picker ──────────────────────────────────────────────────────

function AddBlockRow({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-center py-1 group">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-neutral-700 text-neutral-500 text-xs hover:border-rink-500 hover:text-rink-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
          <Plus className="w-3 h-3" /> Add block
        </button>
      ) : (
        <div className="flex flex-wrap gap-1.5 items-center p-2 bg-neutral-900 border border-white/10 rounded-xl shadow-lg">
          {BLOCK_TYPES.map(({ type, label, Icon }) => (
            <button key={type} type="button" onClick={() => { onAdd(type); setOpen(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors">
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="p-1.5 text-neutral-500 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Block card ────────────────────────────────────────────────────────────

function BlockCard({ block, index, total, leagueId, onUpdate, onDelete, onMoveUp, onMoveDown }: {
  block: ContentBlock; index: number; total: number; leagueId: string;
  onUpdate: (b: ContentBlock) => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none hover:bg-white/[0.03] transition-colors" onClick={() => setExpanded((v) => !v)}>
        <div className="p-1.5 rounded-md bg-neutral-800 text-neutral-400 flex-shrink-0">
          {createElement(blockIcon(block.type), { className: 'w-3.5 h-3.5' })}
        </div>
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide w-14 flex-shrink-0">
          {block.type === 'heading' ? block.level : block.type}
        </span>
        <span className="flex-1 text-sm text-neutral-300 truncate min-w-0">{blockContentPreview(block)}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button type="button" disabled={index === 0} onClick={onMoveUp} className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30 transition-colors rounded">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" disabled={index === total - 1} onClick={onMoveDown} className="p-1.5 text-neutral-500 hover:text-white disabled:opacity-30 transition-colors rounded">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onDelete} className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="p-1.5 text-neutral-600">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-4 space-y-3">
          {block.type === 'heading' && (
            <div className="grid gap-3 md:grid-cols-4">
              <Select value={block.level} onValueChange={(v: HeadingLevel) => onUpdate({ ...block, level: v })}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1 — Title</SelectItem>
                  <SelectItem value="h2">H2 — Section</SelectItem>
                  <SelectItem value="h3">H3 — Subsection</SelectItem>
                </SelectContent>
              </Select>
              <div className="md:col-span-3">
                <Input value={block.text} onChange={(e) => onUpdate({ ...block, text: e.target.value })}
                  placeholder="Heading text" className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500" />
              </div>
            </div>
          )}
          {block.type === 'text' && (
            <Textarea value={block.text} onChange={(e) => onUpdate({ ...block, text: e.target.value })}
              placeholder="Write your paragraph text here..." rows={5}
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 resize-y" />
          )}
          {block.type === 'image' && (
            <div className="space-y-3">
              <InlineImageUploader leagueId={leagueId} value={block.url} onChange={(url) => onUpdate({ ...block, url })} />
              <Input value={block.alt} onChange={(e) => onUpdate({ ...block, alt: e.target.value })}
                placeholder="Alt text (for accessibility)" className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500" />
              <Input value={block.caption} onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
                placeholder="Caption (optional)" className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500" />
            </div>
          )}
          {block.type === 'divider' && (
            <div className="rounded-md border border-dashed border-white/20 py-3 text-center text-sm text-neutral-500">
              Visual divider — no settings needed
            </div>
          )}
          {block.type === 'callout' && (
            <div className="space-y-3">
              <Select value={block.style} onValueChange={(v: CalloutStyle) => onUpdate({ ...block, style: v })}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">ℹ Info</SelectItem>
                  <SelectItem value="warning">⚠ Warning</SelectItem>
                  <SelectItem value="success">✓ Success</SelectItem>
                </SelectContent>
              </Select>
              <Textarea value={block.text} onChange={(e) => onUpdate({ ...block, text: e.target.value })}
                placeholder="Callout message..." rows={3}
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500" />
            </div>
          )}
          {block.type === 'link' && (
            <div className="space-y-3">
              <Input value={block.label} onChange={(e) => onUpdate({ ...block, label: e.target.value })}
                placeholder="Button label" className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500" />
              <Input value={block.url} onChange={(e) => onUpdate({ ...block, url: e.target.value })}
                placeholder="https://example.com" className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI Assistant Panel ────────────────────────────────────────────────────

function AiAssistantPanel({
  leagueId,
  onInsert,
  onReplace,
}: {
  leagueId: string;
  onInsert: (title: string, blocks: ContentBlock[]) => void;
  onReplace: (title: string, blocks: ContentBlock[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; blocks: ContentBlock[] } | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/generate-page-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, prompt }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Generation failed'); return; }
      setResult(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-rink-500/30 bg-rink-500/5 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-rink-500/10 transition-colors">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-rink-400" />
          <span className="text-sm font-semibold text-rink-400">AI Page Assistant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rink-500/20 text-rink-300 font-bold">BETA</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-neutral-500" /> : <ChevronRight className="w-4 h-4 text-neutral-500" />}
      </button>

      {open && (
        <div className="border-t border-rink-500/20 px-4 py-4 space-y-3">
          <p className="text-xs text-neutral-400">
            Describe the page you want to create and AI will generate a structured layout for you to edit.
          </p>
          <Textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setResult(null); setError(null); }}
            placeholder='e.g. "About page for our beer league — history of the league, how to join, contact info"'
            rows={3}
            className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 resize-none text-sm"
            maxLength={1000}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-600">{prompt.length}/1000</span>
            <Button type="button" onClick={handleGenerate} disabled={loading || !prompt.trim()}
              className="bg-rink-500/20 text-rink-400 border border-rink-500/30 hover:bg-rink-500/30 text-sm">
              {loading ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-3.5 h-3.5 mr-2" />Generate</>}
            </Button>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          {result && (
            <div className="bg-neutral-900 border border-white/10 rounded-xl p-3 space-y-3">
              <p className="text-xs text-neutral-400">
                Generated <span className="text-white font-medium">{result.blocks.length} blocks</span>
                {result.title && <> with title <span className="text-rink-400 font-medium">&quot;{result.title}&quot;</span></>}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { onInsert(result.title, result.blocks); setResult(null); setPrompt(''); setOpen(false); }}
                  className="flex-1 py-2 rounded-lg bg-rink-500/20 text-rink-400 border border-rink-500/30 text-xs font-medium hover:bg-rink-500/30 transition-colors">
                  Add to page
                </button>
                <button type="button" onClick={() => { onReplace(result.title, result.blocks); setResult(null); setPrompt(''); setOpen(false); }}
                  className="flex-1 py-2 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-medium hover:bg-neutral-700 transition-colors">
                  Replace all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Themed league preview ─────────────────────────────────────────────────

function LeagueMiniNav({ theme }: { theme: LeaguePreviewData }) {
  const isDark = theme.themePreset !== 'light';
  const bg = isDark ? theme.secondaryColor : '#ffffff';
  const textColor = isDark ? '#e5e7eb' : '#111827';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  function hex(color: string): { r: number; g: number; b: number } {
    const m = color.replace('#', '').match(/.{2}/g);
    if (!m) return { r: 34, g: 211, b: 238 };
    return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
  }
  const { r, g, b } = hex(theme.primaryColor);

  return (
    <div style={{ backgroundColor: bg, borderBottom: `1px solid ${borderColor}`, fontFamily: theme.fontFamily }}>
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo + name */}
        <div className="flex items-center gap-3">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt={theme.name} className="h-8 w-8 object-contain rounded" />
          ) : (
            <div className="h-8 w-8 rounded flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: theme.primaryColor, color: `rgb(${r * 0.2 > 128 ? 0 : 255},${g * 0.2 > 128 ? 0 : 255},${b * 0.2 > 128 ? 0 : 255})` }}>
              {theme.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-sm" style={{ color: textColor }}>{theme.name}</span>
        </div>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-5">
          {['Schedule', 'Standings', 'Teams', 'Stats', 'News'].map((label) => (
            <span key={label} className="text-xs font-medium cursor-default" style={{ color: isDark ? 'rgba(229,231,235,0.6)' : 'rgba(17,24,39,0.6)' }}>
              {label}
            </span>
          ))}
        </div>

        {/* Register button */}
        <div className="h-7 px-3 rounded-full flex items-center justify-center text-xs font-semibold"
          style={{ backgroundColor: theme.primaryColor, color: `rgba(${r},${g},${b},0.2)` }}>
          <span style={{ color: r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#000' : '#fff' }}>Register</span>
        </div>
      </div>
    </div>
  );
}

function BlockPreview({ block, theme }: { block: ContentBlock; theme: LeaguePreviewData }) {
  const primaryColor = theme.primaryColor;

  switch (block.type) {
    case 'heading': {
      const sizes: Record<HeadingLevel, string> = { h1: 'text-3xl font-bold', h2: 'text-2xl font-semibold', h3: 'text-xl font-semibold' };
      const text = block.text || '';
      const placeholder = <span className="text-gray-300 italic text-base font-normal">Heading text...</span>;
      const cls = `${sizes[block.level]}`;
      const color = block.level === 'h1' ? primaryColor : undefined;
      if (block.level === 'h1') return <h1 className={cls} style={{ color }}>{text || placeholder}</h1>;
      if (block.level === 'h3') return <h3 className={cls}>{text || placeholder}</h3>;
      return <h2 className={cls}>{text || placeholder}</h2>;
    }
    case 'text':
      return (
        <p className="leading-relaxed whitespace-pre-wrap text-[15px] text-gray-700">
          {block.text || <span className="text-gray-300 italic">Text content...</span>}
        </p>
      );
    case 'image':
      return block.url ? (
        <figure className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt || ''} className="w-full rounded-lg object-cover max-h-72" />
          {block.caption && <figcaption className="text-sm text-gray-500 text-center">{block.caption}</figcaption>}
        </figure>
      ) : (
        <div className="w-full h-40 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 gap-2">
          <ImageIcon className="w-8 h-8" /><span className="text-sm">No image uploaded yet</span>
        </div>
      );
    case 'divider':
      return <hr className="border-gray-200" />;
    case 'callout': {
      const calloutStyles: Record<CalloutStyle, { bg: string; border: string; text: string }> = {
        info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a5f' },
        warning: { bg: '#fffbeb', border: '#fcd34d', text: '#78350f' },
        success: { bg: '#f0fdf4', border: '#86efac', text: '#14532d' },
      };
      const s = calloutStyles[block.style];
      return (
        <div className="px-4 py-3 border-l-4 rounded-r-lg text-sm leading-relaxed"
          style={{ backgroundColor: s.bg, borderLeftColor: s.border, color: s.text }}>
          {block.text || <span className="italic opacity-60">Callout text...</span>}
        </div>
      );
    }
    case 'link':
      return (
        <div>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: primaryColor }}>
            <LinkIcon className="w-3.5 h-3.5" />
            {block.label || <span className="italic opacity-70">Link label</span>}
          </span>
        </div>
      );
    default:
      return null;
  }
}

function PagePreview({ title, blocks, theme }: { title: string; blocks: ContentBlock[]; theme: LeaguePreviewData | null }) {
  const isDark = theme?.themePreset !== 'light';
  const pageBg = isDark ? '#f9fafb' : '#ffffff';

  return (
    <div className="rounded-2xl shadow-xl overflow-hidden border border-white/10">
      {/* Mock browser chrome */}
      <div className="bg-neutral-200 border-b border-neutral-300 px-4 py-2.5 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded border border-neutral-300 px-3 py-1 text-xs text-neutral-500 font-mono truncate ml-2">
          {theme?.slug ? `${theme.slug}.beerleaguehockey.ca/p/${slugify(title) || '…'}` : 'yourleague.com/p/…'}
        </div>
      </div>

      {/* League nav */}
      {theme && <LeagueMiniNav theme={theme} />}

      {/* Page content */}
      <div style={{ backgroundColor: pageBg, fontFamily: theme?.fontFamily || 'Inter, system-ui, sans-serif' }}>
        {!title && blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3 p-8">
            <ImageIcon className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-center">Your page preview will appear here as you add content</p>
          </div>
        ) : (
          <div className="px-8 py-8 space-y-5 max-w-2xl">
            {blocks.map((block) => (
              <BlockPreview key={block.id} block={block} theme={theme ?? { primaryColor: '#22D3EE', secondaryColor: '#0f172a', logoUrl: null, name: '', slug: '', fontFamily: 'Inter', themePreset: 'dark' }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page component ───────────────────────────────────────────────────

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
  const [leagueTheme, setLeagueTheme] = useState<LeaguePreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      const leagueResult = await getLeaguePreviewData(leagueId);
      if (!active) return;
      if (leagueResult.success) setLeagueTheme(leagueResult.data);
      else setError(leagueResult.error);

      if (!isNewPage) {
        const pageResult = await getCustomPageForEditor(pageId, leagueId);
        if (!active) return;
        if (!pageResult.success) { setError(pageResult.error); setLoading(false); return; }
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
    return () => { active = false; };
  }, [isNewPage, pageId, leagueId]);

  function updateBlock(index: number, updated: ContentBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? updated : b)));
  }

  function deleteBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function insertBlockAt(afterIndex: number, type: BlockType) {
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, createBlock(type));
      return next;
    });
  }

  function appendBlock(type: BlockType) {
    setBlocks((prev) => [...prev, createBlock(type)]);
  }

  function onTitleChange(nextTitle: string) {
    setTitle(nextTitle);
    if (!slugManuallyEdited) setSlug(slugify(nextTitle));
  }

  async function handleSave() {
    const cleanedTitle = title.trim();
    const derivedSlug = slugify(slug || title);
    if (!cleanedTitle) { setError('Title is required.'); return; }
    if (!derivedSlug) { setError('Slug is required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = { title: cleanedTitle, slug: derivedSlug, content: blocks, is_published: isPublished };
      if (isNewPage) {
        const result = await createCustomPage(leagueId, { ...payload, sort_order: 0 });
        if (!result.success) { setError(result.error); return; }
        router.replace(`/${locale}/dashboard/leagues/${leagueId}/pages/${result.data.id}`);
        router.refresh();
      } else {
        const result = await updateCustomPage(pageId, leagueId, payload);
        if (!result.success) { setError(result.error); return; }
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const editorTitle = useMemo(() => (isNewPage ? 'New Custom Page' : 'Edit Page'), [isNewPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href={`/${locale}/dashboard/leagues/${leagueId}/pages`}
              className="mb-2 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors">
              <ArrowLeft className="h-4 w-4" />Back to Custom Pages
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-white">{editorTitle}</h1>
          </div>
          <Button type="button" onClick={handleSave} disabled={saving}
            className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-semibold">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Page'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {/* Mobile tabs */}
        <div className="flex lg:hidden mb-4 rounded-xl border border-white/10 bg-neutral-900 p-1 gap-1">
          <button type="button" onClick={() => setMobileTab('edit')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mobileTab === 'edit' ? 'bg-rink-500/20 text-rink-400' : 'text-neutral-400 hover:text-white'}`}>
            Edit
          </button>
          <button type="button" onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mobileTab === 'preview' ? 'bg-rink-500/20 text-rink-400' : 'text-neutral-400 hover:text-white'}`}>
            Preview
          </button>
        </div>

        {/* Split pane */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Left: Editor ── */}
          <div className={`w-full lg:w-[440px] flex-shrink-0 space-y-2 ${mobileTab === 'preview' ? 'hidden lg:block' : ''}`}>

            {/* AI Assistant */}
            <AiAssistantPanel
              leagueId={leagueId}
              onInsert={(newTitle, newBlocks) => {
                if (newTitle && !title) { setTitle(newTitle); if (!slugManuallyEdited) setSlug(slugify(newTitle)); }
                setBlocks((prev) => [...prev, ...newBlocks]);
              }}
              onReplace={(newTitle, newBlocks) => {
                if (newTitle) { setTitle(newTitle); if (!slugManuallyEdited) setSlug(slugify(newTitle)); }
                setBlocks(newBlocks);
              }}
            />

            {/* First add-block row */}
            <AddBlockRow onAdd={appendBlock} />

            {blocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/30 py-14 text-center">
                <ImageIcon className="w-10 h-10 mx-auto text-neutral-700 mb-3" />
                <p className="text-sm text-neutral-500">No blocks yet.</p>
                <p className="text-xs text-neutral-600 mt-1">Use the + button above or try the AI Assistant.</p>
              </div>
            ) : (
              blocks.map((block, index) => (
                <div key={block.id}>
                  <BlockCard
                    block={block} index={index} total={blocks.length} leagueId={leagueId}
                    onUpdate={(updated) => updateBlock(index, updated)}
                    onDelete={() => deleteBlock(index)}
                    onMoveUp={() => moveBlock(index, -1)}
                    onMoveDown={() => moveBlock(index, 1)}
                  />
                  <AddBlockRow onAdd={(type) => insertBlockAt(index, type)} />
                </div>
              ))
            )}

            {/* Page Settings */}
            <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Page Settings</p>
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">Title</label>
                <Input value={title} onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="About Our League"
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-neutral-300">Slug</label>
                <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true); }}
                  placeholder="about-our-league"
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 font-mono text-sm" />
                <p className="text-xs text-neutral-600">
                  Public URL: /p/<span className="text-neutral-400">{slugify(slug || title) || 'your-slug'}</span>
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-neutral-900/50 px-3 py-2.5">
                <div>
                  <p className="text-sm text-neutral-300">Published</p>
                  <p className="text-xs text-neutral-600">{isPublished ? 'Visible on your league site' : 'Draft — only visible to admins'}</p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
              {leagueTheme?.slug && slugify(slug || title) && (
                <a href={getLeagueSiteUrl(leagueTheme.slug, slugify(slug || title))} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-rink-400 hover:text-rink-300 transition-colors">
                  Open live page ↗
                </a>
              )}
            </div>
          </div>

          {/* ── Right: Themed Preview ── */}
          <div className={`flex-1 min-w-0 ${mobileTab === 'edit' ? 'hidden lg:block' : ''}`}>
            <div className="sticky top-6">
              <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">Live Preview</p>
              <PagePreview title={title} blocks={blocks} theme={leagueTheme} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
