'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, BarChart3, Users, User } from 'lucide-react';
import { cn } from '@hockey-life/ui';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-neutral-900/95 backdrop-blur-lg border-t border-gold-500/20 bottom-nav">
      <div className="flex items-center justify-around h-16 max-w-[428px] mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-16 h-full rounded-lg transition-all duration-150 active:scale-95 touch-action-manipulation',
                isActive && 'relative'
              )}
            >
              {isActive && (
                <div className="absolute inset-x-2 inset-y-1 bg-gold-500/15 rounded-lg" />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 relative z-10 transition-colors duration-150',
                  isActive ? 'text-gold-500' : 'text-neutral-500'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium tracking-wide relative z-10 transition-colors duration-150',
                  isActive ? 'text-gold-500' : 'text-neutral-500'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
