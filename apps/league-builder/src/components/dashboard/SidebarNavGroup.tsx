'use client';

import * as React from 'react';
import { cn } from '@hockey-life/ui';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppSidebar } from './AppSidebarContext';

interface SidebarNavGroupProps {
  groupId: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function SidebarNavGroup({
  groupId,
  label,
  icon: Icon,
  children,
  defaultExpanded = false,
}: SidebarNavGroupProps) {
  const { expandedGroups, toggleGroup } = useAppSidebar();
  const reduceMotion = useReducedMotion();
  const isExpanded = expandedGroups.has(groupId) || defaultExpanded;

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleGroup(groupId)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-[background-color,color,border-color]',
          'border border-transparent text-neutral-400 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-neutral-200'
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-neutral-500 transition-colors group-hover:text-neutral-300" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 text-neutral-600 transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key={groupId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { height: 'auto', opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { height: 0, opacity: 1 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-0.5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SidebarSectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="px-3 pb-1.5 pt-4 first:pt-1">
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500',
          className
        )}
      >
        {children}
      </span>
    </div>
  );
}
