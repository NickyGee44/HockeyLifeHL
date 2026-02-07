'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Calendar,
  Trophy,
  Users,
  BarChart3,
  Info,
  Newspaper,
  CalendarDays,
  Camera,
  Menu,
  X,
  MapPin,
} from 'lucide-react';
import type { League } from '@/lib/types';
import { AuthButton } from './auth/AuthButton';
import { usePreviewMode } from './PreviewModeProvider';
import { ThemeToggle } from './ThemeToggle';
import { useDivisionFilter } from './DivisionFilterProvider';

interface LeagueHeaderProps {
  league: League;
  leagueSlug: string;
}

const navItems = [
  { href: '/scores', label: 'Scores', icon: Activity },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/gallery', label: 'Gallery', icon: Camera },
  { href: '/about', label: 'About', icon: Info },
];

export function LeagueHeader({ league, leagueSlug }: LeagueHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isPreviewMode, theme } = usePreviewMode();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();

  const logoUrl = isPreviewMode && theme?.logoUrl !== undefined ? theme.logoUrl : league.logo_url;
  const displayName = league.short_name || league.name;
  const initials = league.name
    .split(' ')
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
  const location = [league.city, league.state].filter(Boolean).join(', ');

  const isItemActive = (href: string) => {
    const path = `/${leagueSlug}${href}`;
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
          background: 'linear-gradient(90deg, transparent, var(--league-primary), transparent)',
        }}
      />

      <div className="mx-auto max-w-[1400px] px-6">
        <div className="flex h-[72px] items-center justify-between">
          <Link href={`/${leagueSlug}`} className="group flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${league.name} logo`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--league-primary)] text-xl font-black text-[var(--color-accent-text)]">
                {initials.slice(0, 3)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--header-text-muted)]">
                Official League Site
              </p>
              <p className="truncate text-lg font-black tracking-wide text-[var(--header-text)] group-hover:text-[var(--league-primary)]">
                {displayName}
              </p>
              {location && (
                <p className="hidden items-center gap-1 text-xs text-[var(--header-text-secondary)] sm:inline-flex">
                  <MapPin className="h-3 w-3 text-[var(--league-primary)]" />
                  {location}
                </p>
              )}
            </div>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <AuthButton leagueSlug={leagueSlug} leagueId={league.id} />
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--header-border)] text-[var(--header-text)] lg:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            data-testid="mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="hidden items-center justify-end gap-1 pb-3 lg:flex" data-testid="desktop-nav">
          {navItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={`/${leagueSlug}${item.href}`}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--league-primary)]/16 text-[var(--header-text)]'
                    : 'text-[var(--header-text-secondary)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? 'text-[var(--league-primary)]' : 'text-[var(--league-primary)]/80'}`} />
                {item.label}
              </Link>
            );
          })}

          {/* Division Filter - right side of nav */}
          {divisions.length > 1 && (
            <div className="ml-2 pl-2 border-l border-[var(--header-border)]">
              <select
                value={selectedDivisionId || ''}
                onChange={(e) => setDivision(e.target.value || null)}
                className="appearance-none rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
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
            </div>
          )}
        </nav>

        {isMobileMenuOpen && (
          <nav className="border-t border-[var(--header-border)] pb-4 pt-3 lg:hidden" data-testid="mobile-nav">
            {/* Mobile Division Filter */}
            {divisions.length > 1 && (
              <div className="mb-3 px-1">
                <select
                  value={selectedDivisionId || ''}
                  onChange={(e) => setDivision(e.target.value || null)}
                  className="w-full appearance-none rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50"
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

            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {navItems.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={`/${leagueSlug}${item.href}`}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[var(--league-primary)]/16 text-[var(--header-text)]'
                        : 'text-[var(--header-text-secondary)] hover:bg-[var(--header-surface-hover)] hover:text-[var(--header-text)]'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4 text-[var(--league-primary)]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--header-border)] pt-3">
              <AuthButton leagueSlug={leagueSlug} leagueId={league.id} />
              <ThemeToggle />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
