'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import {
  Calendar,
  Trophy,
  BarChart3,
  MoreHorizontal,
  Users,
  Newspaper,
  Shield,
  Crown,
  Camera,
  Mail,
  Info,
  MapPin,
  UserPlus,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

interface FloatingDockProps {
  leagueId: string;
  leagueSlug: string;
  seasonId: string | null;
  visiblePages?: Record<string, boolean>;
}

interface MoreMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  pageKey: string;
}

const MORE_ITEMS: MoreMenuItem[] = [
  { href: '/teams', label: 'Teams', icon: Users, pageKey: 'teams' },
  { href: '/news', label: 'News', icon: Newspaper, pageKey: 'news' },
  { href: '/suspensions', label: 'Suspensions', icon: Shield, pageKey: 'suspensions' },
  { href: '/history', label: 'History', icon: Crown, pageKey: 'history' },
  { href: '/gallery', label: 'Gallery', icon: Camera, pageKey: 'gallery' },
  { href: '/players', label: 'Players', icon: Users, pageKey: 'players' },
  { href: '/events', label: 'Events', icon: Calendar, pageKey: 'events' },
  { href: '/venues', label: 'Venues', icon: MapPin, pageKey: 'venues' },
  { href: '/about', label: 'About', icon: Info, pageKey: 'about' },
  { href: '/contact', label: 'Contact', icon: Mail, pageKey: 'contact' },
  { href: '/goalies/register', label: 'Goalie Register', icon: UserPlus, pageKey: 'goalies/register' },
];

function shouldShowPage(pageKey: string, visiblePages?: Record<string, boolean>): boolean {
  if (!visiblePages) return true;
  const key = pageKey.replace('/', '');
  return visiblePages[key] !== false;
}

export function FloatingDock({ leagueId, leagueSlug, seasonId, visiblePages }: FloatingDockProps) {
  const pathname = usePathname() ?? '';
  const { currentTeam } = usePlayerProfile(leagueId, seasonId);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "more" menu when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (moreRef.current && e.target instanceof Node && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [moreOpen]);

  // Close on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    const full = `/${leagueSlug}${href}`;
    return pathname === full || pathname.startsWith(`${full}/`);
  };

  const teamLogoUrl = currentTeam?.team?.logo ?? null;
  const teamSlug = currentTeam?.team?.slug;
  const teamHref = teamSlug ? `/${leagueSlug}/teams/${teamSlug}` : `/${leagueSlug}/teams`;
  const isTeamActive = teamSlug
    ? pathname.startsWith(`/${leagueSlug}/teams/${teamSlug}`)
    : pathname === `/${leagueSlug}/teams`;

  const filteredMoreItems = MORE_ITEMS.filter((item) => shouldShowPage(item.pageKey, visiblePages));

  // Check if any "more" item is active
  const isMoreActive = filteredMoreItems.some((item) => isActive(item.href));

  const dockItems: Array<{
    key: string;
    href: string;
    label: string;
    active: boolean;
    render: () => React.ReactNode;
  }> = [
    {
      key: 'standings',
      href: `/${leagueSlug}/standings`,
      label: 'Standings',
      active: isActive('/standings'),
      render: () => <Trophy className="h-5 w-5" />,
    },
    {
      key: 'schedule',
      href: `/${leagueSlug}/schedule`,
      label: 'Schedule',
      active: isActive('/schedule'),
      render: () => <Calendar className="h-5 w-5" />,
    },
    {
      key: 'team',
      href: teamHref,
      label: 'My Team',
      active: isTeamActive,
      render: () =>
        teamLogoUrl ? (
          <Image
            src={teamLogoUrl}
            alt="My Team"
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-contain"
          />
        ) : (
          <Users className="h-5 w-5" />
        ),
    },
    {
      key: 'stats',
      href: `/${leagueSlug}/stats`,
      label: 'Stats',
      active: isActive('/stats'),
      render: () => <BarChart3 className="h-5 w-5" />,
    },
  ];

  return (
    <>
      {/* Spacer so content isn't hidden behind dock */}
      <div className="h-20 lg:hidden" />

      {/* Dock */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden" ref={moreRef}>
        {/* "More" popup menu */}
        {moreOpen && (
          <div className="absolute inset-x-3 bottom-[calc(100%+8px)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                More
              </span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {filteredMoreItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.pageKey}
                    href={`/${leagueSlug}${item.href}`}
                    className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition-colors ${
                      active
                        ? 'bg-[var(--league-primary-soft)] text-[var(--league-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Dock bar */}
        <div className="border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-2 pb-[env(safe-area-inset-bottom,8px)] pt-1 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-md items-center justify-around">
            {dockItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
                  item.active
                    ? 'text-[var(--league-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                {item.render()}
                <span className={`text-[10px] font-semibold ${item.active ? 'text-[var(--league-primary)]' : ''}`}>
                  {item.label}
                </span>
              </Link>
            ))}

            {/* More button */}
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
                moreOpen || isMoreActive
                  ? 'text-[var(--league-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className={`text-[10px] font-semibold ${moreOpen || isMoreActive ? 'text-[var(--league-primary)]' : ''}`}>
                More
              </span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
