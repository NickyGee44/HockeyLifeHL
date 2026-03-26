'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
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
  isPlayoffSeason?: boolean;
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
  // Suspensions hidden from public nav — visible to captains/admins in their dashboards only
  { href: '/venues', label: 'Venues', icon: MapPin },
  { href: '/about', label: 'About', icon: Info },
  { href: '/contact', label: 'Contact', icon: Mail },
];

const PRIMARY_DESKTOP_HREFS = new Set(['/schedule', '/standings', '/teams', '/stats']);

export function LeagueHeader({ league, leagueSlug, registrationOpen, visiblePages, isPlayoffSeason }: LeagueHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const { isPreviewMode, theme } = usePreviewMode();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();
  const [moreMenuState, setMoreMenuState] = useState<{ open: boolean; pathname: string }>({
    open: false,
    pathname: pathname ?? '',
  });
  const customNavItems = (league as any).settings?.website?.navItems;
  const hasCustomNav = Array.isArray(customNavItems) && customNavItems.length > 0;
  const currentPathname = pathname ?? '';
  const isMoreMenuOpen = moreMenuState.open && moreMenuState.pathname === currentPathname;

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

  // Filter nav items: respect visiblePages settings and season-phase gates.
  // The playoffs tab is hidden unless the active season is in 'playoffs' status.
  const filteredNavItems: NavItem[] = hasCustomNav
    ? normalizedCustomNavItems
    : navItems.filter((item) => {
        const pageKey = item.href.replace('/', '');
        if (pageKey === 'playoffs' && !isPlayoffSeason) return false;
        return visiblePages ? visiblePages[pageKey] !== false : true;
      });

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

  const desktopPrimaryItems = hasCustomNav
    ? filteredNavItems.slice(0, 4)
    : filteredNavItems.filter((item) => PRIMARY_DESKTOP_HREFS.has(item.href));

  const desktopMoreItems = hasCustomNav
    ? filteredNavItems.slice(4)
    : filteredNavItems.filter((item) => !PRIMARY_DESKTOP_HREFS.has(item.href));

  const isMoreActive = desktopMoreItems.some((item) => isItemActive(item));

  const closeMoreMenu = () => {
    setMoreMenuState({ open: false, pathname: currentPathname });
  };

  const toggleMoreMenu = () => {
    setMoreMenuState((current) =>
      current.open && current.pathname === currentPathname
        ? { open: false, pathname: currentPathname }
        : { open: true, pathname: currentPathname }
    );
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!moreMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && !moreMenuRef.current.contains(target)) {
        closeMoreMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [currentPathname]);

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
          <Link href={`/${leagueSlug}`} className="group relative z-10 flex shrink-0 items-center gap-2 py-1">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${league.name} logo`}
                width={120}
                height={120}
                className="h-12 w-12 rounded-xl object-contain drop-shadow-lg sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-[72px] lg:w-[72px]"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--league-primary-strong)] text-lg font-black text-[var(--league-on-primary)] drop-shadow-lg sm:h-14 sm:w-14 sm:text-xl md:h-16 md:w-16 md:text-2xl lg:h-[72px] lg:w-[72px]">
                {initials.slice(0, 3)}
              </div>
            )}
            <span className="hidden truncate text-base font-black tracking-wide text-[var(--header-text)] group-hover:text-[var(--color-accent)] sm:block lg:hidden">
              {displayName}
            </span>
          </Link>

          <span className="hidden xl:inline-flex shrink-0 rounded-full border border-[var(--header-border)] bg-[var(--header-surface)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--header-text-secondary)]">
            Official League Site
          </span>

          {/* Nav — centered, scrollable overflow, icons hidden on desktop for density */}
          <div className="hidden flex-1 min-w-0 lg:block" data-testid="desktop-nav">
            <nav
              className="flex items-center justify-center gap-0.5 overflow-x-visible"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {desktopPrimaryItems.map((item) => {
                const active = isItemActive(item);
                const href = getItemHref(item);
                const baseClasses = `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'border border-[var(--league-primary-border)] bg-[var(--league-primary-soft)] text-[var(--header-text)]'
                    : 'text-[var(--header-text-secondary)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
                }`;

                const content = (
                  <>
                    {item.icon && (
                      <item.icon className={`h-3.5 w-3.5 hidden xl:block ${active ? 'text-[var(--color-accent)]' : 'text-[var(--header-text-muted)]'}`} />
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

              {desktopMoreItems.length > 0 && (
                <div className="relative shrink-0" ref={moreMenuRef}>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                      isMoreActive || isMoreMenuOpen
                        ? 'border border-[var(--league-primary-border)] bg-[var(--league-primary-soft)] text-[var(--header-text)]'
                        : 'text-[var(--header-text-secondary)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
                    }`}
                    aria-expanded={isMoreMenuOpen}
                    aria-haspopup="menu"
                    onClick={toggleMoreMenu}
                  >
                    More
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMoreMenuOpen && (
                    <div
                      className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[180px] rounded-lg border border-[var(--header-border)] bg-[var(--header-bg)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                      role="menu"
                    >
                      {desktopMoreItems.map((item) => {
                        const active = isItemActive(item);
                        const href = getItemHref(item);
                        const itemClasses = `flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                          active
                            ? 'bg-[var(--league-primary-soft)] text-[var(--header-text)]'
                            : 'text-[var(--header-text-secondary)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
                        }`;

                        const content = (
                          <>
                            {item.icon && <item.icon className="h-4 w-4 text-[var(--color-accent)]" />}
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
                              className={itemClasses}
                              role="menuitem"
                              onClick={closeMoreMenu}
                            >
                              {content}
                            </a>
                          );
                        }

                        return (
                          <Link
                            key={`${item.label}-${item.href}`}
                            href={href}
                            className={itemClasses}
                            role="menuitem"
                            onClick={closeMoreMenu}
                          >
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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
                  className="appearance-none rounded-lg px-2.5 py-1.5 pr-6 text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--league-primary-border)]"
                  style={{
                    background: selectedDivisionId ? 'var(--league-primary-strong)' : 'var(--header-surface)',
                    color: selectedDivisionId ? 'var(--league-on-primary)' : 'var(--header-text-secondary)',
                    border: selectedDivisionId ? '1px solid var(--league-primary-border)' : '1px solid var(--header-border)',
                  }}
                  aria-label="Filter by division"
                  data-testid="division-filter"
                >
                  <option value="">All Divisions</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" style={{ color: selectedDivisionId ? 'var(--league-on-primary)' : 'var(--header-text-secondary)' }} />
              </div>
            )}
            {registrationOpen && (
              <Link
                href={`/${leagueSlug}/register`}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--league-primary-border)] bg-[var(--league-primary-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--league-on-primary)] transition-colors hover:bg-[var(--league-primary-hover)]"
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
                  className="w-full appearance-none rounded-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--league-primary-border)]"
                  style={{
                    background: selectedDivisionId ? 'var(--league-primary-strong)' : 'var(--header-surface)',
                    color: selectedDivisionId ? 'var(--league-on-primary)' : 'var(--header-text-secondary)',
                    border: selectedDivisionId ? '1px solid var(--league-primary-border)' : '1px solid var(--header-border)',
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
                    ? 'border border-[var(--league-primary-border)] bg-[var(--league-primary-soft)] text-[var(--header-text)]'
                    : 'text-[var(--header-text-secondary)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
                }`;

                const content = (
                  <>
                    {item.icon && <item.icon className="h-4 w-4 text-[var(--color-accent)]" />}
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
                className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[var(--league-primary-border)] bg-[var(--league-primary-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--league-on-primary)] transition-colors hover:bg-[var(--league-primary-hover)]"
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
