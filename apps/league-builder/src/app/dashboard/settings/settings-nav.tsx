'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@hockey-life/ui/lib/utils';

const settingsNav = [
  {
    name: 'Profile',
    href: '/dashboard/settings',
    description: 'Organization name, slug, and logo',
  },
  {
    name: 'Team Members',
    href: '/dashboard/settings/members',
    description: 'Invite and manage team members',
  },
  {
    name: 'Billing',
    href: '/dashboard/settings/billing',
    description: 'Subscription and payment methods',
  },
  {
    name: 'Branding',
    href: '/dashboard/settings/branding',
    description: 'Colors, logos, and visual identity',
  },
  {
    name: 'Notifications',
    href: '/dashboard/settings/notifications',
    description: 'Email and notification preferences',
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {settingsNav.map((item) => {
        const isActive = pathname === item.href;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'block px-4 py-3 rounded-lg transition-colors border',
                isActive
                  ? 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800'
                  : 'border-transparent hover:bg-white dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
              )}
            >
              <div
                className={cn(
                  'font-medium',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-900 dark:text-white'
                )}
              >
                {item.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {item.description}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
