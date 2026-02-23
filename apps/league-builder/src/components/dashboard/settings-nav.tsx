'use client';

import { Link } from '@/i18n/navigation';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import {
  User,
  Users,
  CreditCard,
  Palette,
  Shield,
  Bell,
  Globe,
  type LucideIcon,
} from 'lucide-react';

const settingsNavItems: { key: string; href: string; icon: LucideIcon }[] = [
  { key: 'profile', href: '/dashboard/settings', icon: User },
  { key: 'members', href: '/dashboard/settings/members', icon: Users },
  { key: 'domains', href: '/dashboard/settings/domains', icon: Globe },
  { key: 'billing', href: '/dashboard/settings/billing', icon: CreditCard },
  { key: 'branding', href: '/dashboard/settings/branding', icon: Palette },
  { key: 'privacy', href: '/dashboard/settings/privacy', icon: Shield },
  { key: 'notifications', href: '/dashboard/settings/notifications', icon: Bell },
];

export function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations('settingsNav');

  const isPathActive = (href: string) => {
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/)/, '');
    return pathWithoutLocale === href;
  };

  return (
    <nav className="space-y-1" aria-label={t('ariaLabel')}>
      {settingsNavItems.map((item) => {
        const isActive = isPathActive(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-200',
              'border',
              isActive
                ? 'bg-rink-500/10 border-rink-500/30 text-rink-500'
                : 'border-transparent hover:bg-white/[0.04] hover:border-white/10 text-neutral-400 hover:text-white'
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 mt-0.5 flex-shrink-0',
                isActive ? 'text-rink-500' : 'text-neutral-500'
              )}
            />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'font-medium text-sm',
                  isActive ? 'text-rink-500' : 'text-white'
                )}
              >
                {t(`${item.key}.name`)}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5 truncate">
                {t(`${item.key}.description`)}
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
