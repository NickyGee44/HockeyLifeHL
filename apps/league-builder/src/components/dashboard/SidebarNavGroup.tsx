'use client';

import * as React from 'react';
import { cn } from '@hockey-life/ui';
import { ChevronRight } from 'lucide-react';
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
  const isExpanded = expandedGroups.has(groupId) || defaultExpanded;

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleGroup(groupId)}
        className={cn(
          'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all duration-150 group text-[13px]',
          'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0 text-neutral-500 group-hover:text-neutral-300" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-neutral-600 transition-transform duration-150',
            isExpanded && 'rotate-90'
          )}
        />
      </button>
      {isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Section header label for the sidebar (e.g., "SEASON", "LEAGUE", "ORGANIZATION")
 */
export function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1.5 first:pt-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500">
        {children}
      </span>
    </div>
  );
}
