import Link from 'next/link';
import { Fragment } from 'react';
import { splitArticleParagraphIntoSegments, type ArticleMention } from '@/lib/articles/linkify';

interface RichArticleContentProps {
  content: string | null | undefined;
  maxParagraphs?: number;
  paragraphClassName?: string;
  mentions?: ArticleMention[];
}

type Segment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

function parseInlineLinks(text: string): Segment[] {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    segments.push({
      type: 'link',
      label: match[1],
      href: match[2],
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

export function RichArticleContent({
  content,
  maxParagraphs,
  paragraphClassName = 'mb-5 max-w-3xl text-base leading-8 text-[var(--color-text-secondary)] md:text-[1.0625rem]',
  mentions = [],
}: RichArticleContentProps) {
  const paragraphs = (content
    ? content
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
        .filter(Boolean)
    : [])
    .slice(0, maxParagraphs ?? Number.POSITIVE_INFINITY);

  if (paragraphs.length === 0) {
    return <p className="text-[var(--color-text-muted)] italic">No content available.</p>;
  }

  return (
    <>
      {paragraphs.map((paragraph, index) => {
        const segments = parseInlineLinks(paragraph);
        return (
          <p
            key={index}
            className={paragraphClassName}
          >
            {segments.map((segment, segmentIndex) => {
              if (segment.type === 'text') {
                if (mentions.length === 0) {
                  return <Fragment key={segmentIndex}>{segment.value}</Fragment>;
                }

                const mentionSegments = splitArticleParagraphIntoSegments(segment.value, mentions);
                return (
                  <Fragment key={segmentIndex}>
                    {mentionSegments.map((mentionSegment, mentionSegmentIndex) => {
                      if (!mentionSegment.href) {
                        return (
                          <Fragment key={`${segmentIndex}-${mentionSegmentIndex}`}>
                            {mentionSegment.text}
                          </Fragment>
                        );
                      }

                      return (
                        <Link
                          key={`${segmentIndex}-${mentionSegmentIndex}-${mentionSegment.href}`}
                          href={mentionSegment.href}
                          className="font-semibold text-[var(--league-primary)] underline decoration-[var(--league-primary)]/35 underline-offset-4 transition-colors hover:text-[var(--color-text-primary)]"
                        >
                          {mentionSegment.text}
                        </Link>
                      );
                    })}
                  </Fragment>
                );
              }

              return (
                <Link
                  key={segmentIndex}
                  href={segment.href}
                  className="font-semibold text-[var(--league-primary)] underline decoration-[var(--league-primary)]/35 underline-offset-4 transition-colors hover:text-[var(--color-text-primary)]"
                >
                  {segment.label}
                </Link>
              );
            })}
          </p>
        );
      })}
    </>
  );
}
