'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import { Lock } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  type DashboardNavigationItem,
  isDashboardNavigationItemActive,
} from '@/lib/dashboard/navigation';

interface SidebarNavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  locked?: boolean;
  badge?: number;
  indent?: boolean;
  onClick?: () => void;
  active?: boolean;
  matchPrefixes?: string[];
}

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  locked = false,
  badge,
  indent = false,
  onClick,
  active,
  matchPrefixes,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();

  const isActive = React.useMemo(() => {
    if (typeof active === 'boolean') {
      return active;
    }

    const item: DashboardNavigationItem = {
      kind: 'item',
      id: href,
      label,
      href,
      icon: Icon,
      scope: 'organization',
      matchPrefixes: matchPrefixes ?? [href],
    };

    return isDashboardNavigationItemActive(item, pathname, locale);
  }, [active, href, Icon, label, locale, matchPrefixes, pathname]);

  const resolvedHref = locked ? '/dashboard/settings/billing' : href;

  return (
    <Link
      href={resolvedHref}
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2 text-[13px] transition-[color,border-color,background-color]',
        indent && 'ml-3',
        locked
          ? 'cursor-not-allowed border border-transparent text-neutral-600 hover:text-neutral-500'
          : isActive
            ? 'border border-rink-400/15 text-rink-100'
            : 'border border-transparent text-neutral-400 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-neutral-200'
      )}
    >
      {isActive ? (
        <motion.span
          layoutId="sidebar-nav-indicator"
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
          className="absolute inset-0 rounded-xl bg-[linear-gradient(90deg,rgba(34,211,238,0.16),rgba(59,130,246,0.08))]"
        />
      ) : null}
      <Icon
        className={cn(
          'relative h-4 w-4 shrink-0',
          locked
            ? 'text-neutral-600'
            : isActive
              ? 'text-rink-300'
              : 'text-neutral-500 transition-colors group-hover:text-neutral-300'
        )}
      />
      <span className="relative flex-1 truncate font-medium">{label}</span>
      {locked ? <Lock className="relative h-3 w-3 shrink-0 text-neutral-600" /> : null}
      {badge !== undefined && badge > 0 ? (
        <span className="relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-rink-400/20 bg-rink-500/15 px-1 text-[10px] font-bold text-rink-200">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}
