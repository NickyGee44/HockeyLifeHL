import type { ReactNode } from 'react';

interface SectionHeadingProps {
  title: string;
  icon: ReactNode;
}

/**
 * Shared section heading used across all public league-sites pages.
 * Renders an icon + title on the page background, meant to sit *above*
 * any card/panel — never inside one.
 */
export function SectionHeading({ title, icon }: SectionHeadingProps) {
  return (
    <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
      {icon}
      {title}
    </h2>
  );
}
