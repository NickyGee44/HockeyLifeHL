'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import {
  User,
  Users,
  CreditCard,
  Palette,
  Shield,
  Bell,
  Sparkles,
} from 'lucide-react';

const settingsNav = [
  {
    name: 'Profile',
    href: '/dashboard/settings',
    description: 'Organization name, slug, and logo',
    icon: User,
  },
  {
    name: 'Team Members',
    href: '/dashboard/settings/members',
    description: 'Invite and manage team members',
    icon: Users,
  },
  {
    name: 'Subscription',
    href: '/dashboard/settings/subscription',
    description: 'Plan, usage, and upgrades',
    icon: Sparkles,
  },
  {
    name: 'Billing',
    href: '/dashboard/settings/billing',
    description: 'Payment methods and invoices',
    icon: CreditCard,
  },
  {
    name: 'Branding',
    href: '/dashboard/settings/branding',
    description: 'Colors, logos, and visual identity',
    icon: Palette,
  },
  {
    name: 'Privacy',
    href: '/dashboard/settings/privacy',
    description: 'Data export and account deletion',
    icon: Shield,
  },
  {
    name: 'Notifications',
    href: '/dashboard/settings/notifications',
    description: 'Email and notification preferences',
    icon: Bell,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {settingsNav.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-200',
              'border',
              isActive
                ? 'bg-gold-500/10 border-gold-500/30 text-gold-500'
                : 'border-transparent hover:bg-neutral-800 hover:border-gold-500/20 text-neutral-400 hover:text-white'
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 mt-0.5 flex-shrink-0',
                isActive ? 'text-gold-500' : 'text-neutral-500'
              )}
            />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'font-medium text-sm',
                  isActive ? 'text-gold-500' : 'text-white'
                )}
              >
                {item.name}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5 truncate">
                {item.description}
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
