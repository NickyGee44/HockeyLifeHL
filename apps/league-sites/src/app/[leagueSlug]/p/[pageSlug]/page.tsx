import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { getLeagueBySlug, getCustomPage } from '@/lib/data';

interface CustomPageRouteProps {
  params: Promise<{ leagueSlug: string; pageSlug: string }>;
}

type HeadingBlock = {
  type: 'heading';
  level?: 1 | 2 | 3;
  text?: string;
};

type TextBlock = {
  type: 'text';
  content?: string;
};

type ImageBlock = {
  type: 'image';
  url?: string;
  alt?: string;
  caption?: string;
};

type DividerBlock = {
  type: 'divider';
};

type CalloutBlock = {
  type: 'callout';
  text?: string;
  style?: 'info' | 'warning' | 'success';
};

type ExternalLinkBlock = {
  type: 'external_link';
  label?: string;
  url?: string;
};

type ContentBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | DividerBlock
  | CalloutBlock
  | ExternalLinkBlock;

type CustomPage = {
  title?: string;
  content?: ContentBlock[];
};

function sanitizeContent(content: string | undefined): string {
  if (!content) return '';

  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'hr', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}

function renderHeading(block: HeadingBlock, key: string) {
  const text = block.text?.trim();
  if (!text) return null;

  if (block.level === 2) {
    return (
      <h2 key={key} className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] leading-tight">
        {text}
      </h2>
    );
  }

  if (block.level === 3) {
    return (
      <h3 key={key} className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
        {text}
      </h3>
    );
  }

  return (
    <h1 key={key} className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-primary)] leading-tight">
      {text}
    </h1>
  );
}

function renderCallout(block: CalloutBlock, key: string) {
  const text = block.text?.trim();
  if (!text) return null;

  const styleClass =
    block.style === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : block.style === 'success'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
        : 'border-blue-500/30 bg-blue-500/10 text-blue-200';

  return (
    <div key={key} className={`rounded-xl border p-4 ${styleClass}`}>
      <p className="leading-relaxed">{text}</p>
    </div>
  );
}

function renderBlock(block: ContentBlock, index: number) {
  const key = `${block.type}-${index}`;

  if (block.type === 'heading') {
    return renderHeading(block, key);
  }

  if (block.type === 'text') {
    const html = sanitizeContent(block.content);
    if (!html) return null;

    return (
      <div
        key={key}
        className="prose max-w-none prose-headings:text-[var(--color-text-primary)] prose-p:text-[var(--color-text-secondary)] prose-li:text-[var(--color-text-secondary)] prose-strong:text-[var(--color-text-primary)] prose-a:text-[var(--league-primary)]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (block.type === 'image') {
    if (!block.url) return null;

    return (
      <figure key={key} className="space-y-3">
        <img src={block.url} alt={block.alt || ''} className="w-full rounded-xl border border-[var(--color-border)]" />
        {block.caption ? (
          <figcaption className="text-sm text-[var(--color-text-muted)]">{block.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === 'divider') {
    return <hr key={key} className="border-[var(--color-border)]" />;
  }

  if (block.type === 'callout') {
    return renderCallout(block, key);
  }

  if (block.type === 'external_link') {
    if (!block.url || !block.label) return null;

    return (
      <a
        key={key}
        href={block.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-[var(--league-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        {block.label}
      </a>
    );
  }

  return null;
}

export async function generateMetadata({ params }: CustomPageRouteProps): Promise<Metadata> {
  const { leagueSlug, pageSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Page Not Found' };
  }

  const page = (await getCustomPage(league.id, pageSlug)) as CustomPage | null;

  if (!page?.title) {
    return { title: `Page Not Found | ${league.name}` };
  }

  return {
    title: `${page.title} | ${league.name}`,
  };
}

export default async function CustomPageRoute({ params }: CustomPageRouteProps) {
  const { leagueSlug, pageSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const page = (await getCustomPage(league.id, pageSlug)) as CustomPage | null;

  if (!page) notFound();

  const blocks = Array.isArray(page.content) ? page.content : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <article className="space-y-6">
        {page.title ? (
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-primary)] leading-tight">
            {page.title}
          </h1>
        ) : null}

        {blocks.length > 0 ? (
          <div className="space-y-6">
            {blocks.map((block, index) => renderBlock(block, index))}
          </div>
        ) : (
          <p className="text-[var(--color-text-muted)] italic">No content available.</p>
        )}
      </article>
    </div>
  );
}
