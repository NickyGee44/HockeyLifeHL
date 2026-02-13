'use client';

import * as React from 'react';
import { cn } from '../utils';

/**
 * ResponsiveTable
 *
 * Renders a table on md+ screens and a mobile card layout on smaller screens.
 * Uses pure CSS (hidden/md:block) — no JS media queries.
 *
 * Usage:
 *   <ResponsiveTable
 *     mobileCards={items.map(item => <MyCard key={item.id} item={item} />)}
 *     className="rounded-xl border border-neutral-700"
 *   >
 *     <table>...</table>
 *   </ResponsiveTable>
 */

export interface ResponsiveTableProps {
  /** The table element to show on desktop (md+) */
  children: React.ReactNode;
  /** Card elements to render on mobile (<md) */
  mobileCards: React.ReactNode;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Optional className for the desktop table wrapper */
  tableClassName?: string;
  /** Optional className for the mobile cards wrapper */
  cardsClassName?: string;
}

export function ResponsiveTable({
  children,
  mobileCards,
  className,
  tableClassName,
  cardsClassName,
}: ResponsiveTableProps) {
  return (
    <div className={className}>
      {/* Desktop: table with horizontal scroll */}
      <div className={cn('hidden md:block overflow-x-auto', tableClassName)}>
        {children}
      </div>

      {/* Mobile: card layout */}
      <div className={cn('md:hidden space-y-3', cardsClassName)}>
        {mobileCards}
      </div>
    </div>
  );
}
