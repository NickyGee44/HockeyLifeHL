'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  Trophy,
  Users,
  BarChart3,
  Info,
  Newspaper,
  Crown,
  Camera,
  Mail,
  Shield,
  Ban,
  MapPin,
  Menu,
  X,
  UserPlus,
  ChevronDown } from 'lucide-react';
import type { League } from '@/lib/types';
import { AuthButton } from './auth/AuthButton';
import { usePreviewMode } from './PreviewModeProvider';
import { ThemeToggle } from './ThemeToggle';
import { useDivisionFilter } from './DivisionFilterProvider';

interface LeagueHeaderProps {
  league: League;
  leagueSlug: string;
  registrationOpen?: boolean;
  visiblePages?: Record<string, boolean>;
}

type DefaultNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavItem = {
  label: string;
  href: string;
  isExternal?: boolean;
  isCustomPage?: boolean;
  pageSlug?: string;
  icon?: LucideIcon;
};

const navItems: DefaultNavItem[] = [
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/playoffs', label: 'Playoffs', icon: Shield },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/history', label: 'History', icon: Crown },
  { href: '/gallery', label: 'Gallery', icon: Camera },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/suspensions', label: 'Suspensions', icon: Ban },
  { href: '/venues', label: 'Venues', icon: MapPin },
  { href: '/about', label: 'About', icon: Info },
  { href: '/contact', label: 'Contact', icon: Mail },
];

export function LeagueHeader({ league, leagueSlug, registrationOpen, visiblePages }: LeagueHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isPreviewMode, theme } = usePreviewMode();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();
  const customNavItems = (league as any).settings?.website?.navItems;
  const hasCustomNav = Array.isArray(customNavItems) && customNavItems.length > 0;

  const normalizedCustomNavItems: NavItem[] = hasCustomNav
    ? customNavItems
        .filter(
          (item: unknown): item is NavItem =>
            typeof item === 'object' &&
            item !== null &&
            typeof (item as NavItem).label === 'string' &&
            typeof (item as NavItem).href === 'string'
        )
        .map((item) => ({
          label: item.label,
          href: item.href,
          isExternal: item.isExternal,
          isCustomPage: item.isCustomPage,
          pageSlug: item.pageSlug,
        }))
    : [];

  // Filter nav items based on visiblePages setting
  const filteredNavItems: NavItem[] = hasCustomNav
    ? normalizedCustomNavItems
    : visiblePages
      ? navItems.filter((item) => {
          const pageKey = item.href.replace('/', '');
          return visiblePages[pageKey] !== false;
        })
      : navItems;

  const logoUrl = isPreviewMode && theme?.logoUrl !== undefined ? theme.logoUrl : league.logo_url;
  const displayName = league.short_name || league.name;
  const initials = league.name
    .split(' ')
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
  const _location = [league.city, league.state].filter(Boolean).join(', ');

  const getInternalPath = (item: NavItem) => {
    if (item.isCustomPage) {
      const slugOrHref = item.pageSlug || item.href;
      const normalizedSlug = slugOrHref.replace(/^\/+/, '');
      return `/${leagueSlug}/p/${normalizedSlug}`;
    }

    const normalizedHref = item.href.startsWith('/') ? item.href : `/${item.href}`;
    return `/${leagueSlug}${normalizedHref}`;
  };

  const getItemHref = (item: NavItem) => {
    if (item.isExternal) {
      return item.href;
    }

    return getInternalPath(item);
  };

  const isItemActive = (item: NavItem) => {
    if (item.isExternal) {
      return false;
    }

    const path = getInternalPath(item);
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header
      className="league-header sticky top-0 z-50 border-b border-[var(--header-border)] bg-[color-mix(in_srgb,var(--header-bg)_92%,transparent)] text-[var(--header-text)] backdrop-blur-xl"
      data-testid="league-header"
    >
      <div
        className="h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--league-primary), transparent)' }}
      />

      <div className="mx-auto w-full px-4 sm:px-6">
        <div className="flex h-[64px] items-center gap-3">
          {/* Logo — fixed left */}
          <Link href={`/${leagueSlug}`} className="group relative z-10 flex shrink-0 items-center gap-3 -my-2 md:-my-7">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${league.name} logo`}
                width={120}
                height={120}
                className="h-[80px] w-[80px] md:h-[120px] md:w-[120px] rounded-xl object-contain drop-shadow-lg"
              />
            ) : (
              <div className="flex h-[80px] w-[80px] md:h-[120px] md:w-[120px] items-center justify-center rounded-xl bg-[var(--league-primary)] text-2xl md:text-3xl font-black text-[var(--color-accent-text)] drop-shadow-lg">
                {initials.slice(0, 3)}
              </div>
            )}
            <span className="hidden truncate text-base font-black tracking-wide text-[var(--header-text)] group-hover:text-[var(--league-primary)] sm:block lg:hidden">
              {displayName}
            </span>
          </Link>

          {/* Nav — centered, scrollable overflow, icons hidden on desktop for density */}
          <div className="hidden flex-1 min-w-0 lg:block" data-testid="desktop-nav">
            <nav
              className="flex items-center justify-center gap-0.5 overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredNavItems.map((item) => {
                const active = isItemActive(item);
                const href = getItemHref(item);
                const baseClasses = `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[var(--league-primary)]/16 text-[var(--header-text)]'
                    : 'text-[var(--header-text-secondary)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
                }`;

                const content = (
                  <>
                    {item.icon && (
                      <item.icon className={`h-3.5 w-3.5 hidden xl:block ${active ? 'text-[var(--league-primary)]' : 'text-[var(--league-primary)]/80'}`} />
                    )}
                    {item.label}
                  </>
                );

                if (item.isExternal) {
                  return (
                    <a
                      key={`${item.label}-${item.href}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={baseClasses}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={href}
                    className={baseClasses}
                  >
                    {content}
                  </Link>
                );
              })}
            </nav>
            {/* Hide webkit scrollbar */}
            <style jsx>{`nav::-webkit-scrollbar { display: none; }`}</style>
          </div>

          {/* Auth — anchored right */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {divisions.length > 1 && (
              <div className="relative">
                <select
                  value={selectedDivisionId || ''}
                  onChange={(e) => setDivision(e.target.value || null)}
                  className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 transition-colors"
                  style={{
                    background: selectedDivisionId ? 'var(--league-primary)' : 'var(--header-surface)',
                    color: selectedDivisionId ? 'var(--color-accent-text)' : 'var(--header-text-secondary)',
                    border: selectedDivisionId ? 'none' : '1px solid var(--header-border)',
                  }}
                  aria-label="Filter by division"
                  data-testid="division-filter"
                >
                  <option value="">All Divisions</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-60" style={{ color: selectedDivisionId ? 'var(--color-accent-text)' : 'var(--header-text-secondary)' }} />
              </div>
            )}
            {registrationOpen && (
              <Link
                href={`/${leagueSlug}/register`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--league-primary)] text-[var(--color-accent-text)] hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-4 h-4" />
                Register
              </Link>
            )}
            <ThemeToggle />
            <AuthButton leagueSlug={leagueSlug} leagueId={league.id} />
          </div>

          {/* Mobile controls — anchored right */}
          <div className="flex items-center gap-2 lg:hidden ml-auto">
            <AuthButton leagueSlug={leagueSlug} leagueId={league.id} />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--header-border)] text-[var(--header-text)]"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="border-t border-[var(--header-border)] pb-4 pt-3 lg:hidden max-h-[calc(100dvh-80px)] overflow-y-auto overflow-x-visible" data-testid="mobile-nav">
            {divisions.length > 1 && (
              <div className="mb-3 pb-3 border-b border-[var(--header-border)]">
                <select
                  value={selectedDivisionId || ''}
                  onChange={(e) => setDivision(e.target.value || null)}
                  className="w-full appearance-none rounded-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
                  style={{
                    background: selectedDivisionId ? 'var(--league-primary)' : 'var(--header-surface)',
                    color: selectedDivisionId ? 'var(--color-accent-text)' : 'var(--header-text-secondary)',
                    border: selectedDivisionId ? 'none' : '1px solid var(--header-border)',
                  }}
                  aria-label="Filter by division"
                  data-testid="division-filter-mobile"
                >
                  <option value="">All Divisions</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1">
              {filteredNavItems.map((item) => {
                const active = isItemActive(item);
                const href = getItemHref(item);
                const baseClasses = `inline-flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--league-primary)]/16 text-[var(--header-text)]'
                    : 'text-[var(--header-text-secondary)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
                }`;

                const content = (
                  <>
                    {item.icon && <item.icon className="h-4 w-4 text-[var(--league-primary)]" />}
                    {item.label}
                  </>
                );

                if (item.isExternal) {
                  return (
                    <a
                      key={`${item.label}-${item.href}`}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={baseClasses}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={href}
                    className={baseClasses}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
            {registrationOpen && (
              <Link
                href={`/${leagueSlug}/register`}
                className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--league-primary)] text-[var(--color-accent-text)] hover:opacity-90 transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserPlus className="w-4 h-4" />
                Register Now
              </Link>
            )}
            <div className="mt-3 flex items-center justify-end border-t border-[var(--header-border)] pt-3">
              <ThemeToggle />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
