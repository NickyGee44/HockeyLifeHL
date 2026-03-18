'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import { Lock } from 'lucide-react';

interface SidebarNavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  locked?: boolean;
  badge?: number;
  indent?: boolean;
  onClick?: () => void;
}

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  locked = false,
  badge,
  indent = false,
  onClick,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const locale = useLocale();

  const isActive = React.useMemo(() => {
    const hrefPath = href.split('?')[0];
    const localizedPath = `/${locale}${hrefPath}`;
    if (hrefPath === '/dashboard') {
      return pathname === localizedPath || pathname === `/${locale}/tableau-de-bord`;
    }
    return pathname.startsWith(localizedPath);
  }, [href, pathname, locale]);

  const resolvedHref = locked ? '/dashboard/settings/billing' : href;

  return (
    <Link
      href={resolvedHref}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 group text-[13px]',
        indent && 'ml-3',
        locked
          ? 'text-neutral-600 hover:text-neutral-500 cursor-not-allowed'
          : isActive
          ? 'bg-rink-500/10 text-rink-400 font-medium'
          : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
      )}
    >
      <Icon
        className={cn(
          'w-4 h-4 flex-shrink-0',
          locked
            ? 'text-neutral-600'
            : isActive
            ? 'text-rink-400'
            : 'text-neutral-500 group-hover:text-neutral-300'
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {locked && <Lock className="w-3 h-3 text-neutral-600 flex-shrink-0" />}
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rink-500/20 text-rink-400 text-[10px] font-bold px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
