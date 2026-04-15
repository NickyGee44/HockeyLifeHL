'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
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
  LogIn,
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  Bug,
  ChevronLeft,
  ChevronRight,
  Goal,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useUser } from '@/hooks/useUser';
import { useAuth } from '@/components/auth/AuthProvider';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import { signOut } from '@/lib/supabase/auth';

interface FloatingDockProps {
  leagueId: string;
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl: string | null;
  seasonId: string | null;
  visiblePages?: Record<string, boolean>;
  customNavItems?: Array<{
    label?: string;
    href?: string;
    isExternal?: boolean;
    isCustomPage?: boolean;
    pageSlug?: string;
  }>;
  isPlayoffSeason?: boolean;
  registrationOpen?: boolean;
  allLeagues?: Array<{ slug: string; name: string; logo_url: string | null }>;
}

interface MoreMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  pageKey: string;
  external?: boolean;
}

const PUBLIC_MORE_ITEMS: MoreMenuItem[] = [
  { href: '/teams', label: 'Teams', icon: Users, pageKey: 'teams' },
  { href: '/players', label: 'Players', icon: Users, pageKey: 'players' },
  { href: '/playoffs', label: 'Playoffs', icon: Trophy, pageKey: 'playoffs' },
  { href: '/news', label: 'News', icon: Newspaper, pageKey: 'news' },
  { href: '/suspensions', label: 'Suspensions', icon: Shield, pageKey: 'suspensions' },
  { href: '/history', label: 'History', icon: Crown, pageKey: 'history' },
  { href: '/gallery', label: 'Gallery', icon: Camera, pageKey: 'gallery' },
  { href: '/events', label: 'Events', icon: Calendar, pageKey: 'events' },
  { href: '/venues', label: 'Venues', icon: MapPin, pageKey: 'venues' },
  { href: '/about', label: 'About', icon: Info, pageKey: 'about' },
  { href: '/contact', label: 'Contact', icon: Mail, pageKey: 'contact' },
];

const AUTH_MORE_ITEMS: MoreMenuItem[] = [
  { href: '/me', label: 'My Dashboard', icon: LayoutDashboard, pageKey: 'me' },
];

function shouldShowPage(pageKey: string, visiblePages?: Record<string, boolean>): boolean {
  if (!visiblePages) return true;
  const key = pageKey.replace('/', '');
  return visiblePages[key] !== false;
}

function getNavItemHref(item: {
  href?: string;
  isExternal?: boolean;
  isCustomPage?: boolean;
  pageSlug?: string;
}): string | null {
  if (item.isCustomPage && item.pageSlug) {
    return `/p/${item.pageSlug}`;
  }

  if (!item.href) return null;
  if (item.isExternal) return item.href;

  return item.href.startsWith('/') ? item.href : `/${item.href}`;
}

export function FloatingDock({
  leagueId,
  leagueSlug,
  leagueName,
  leagueLogoUrl,
  seasonId,
  visiblePages,
  customNavItems,
  isPlayoffSeason = false,
  registrationOpen = false,
  allLeagues,
}: FloatingDockProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { currentTeam } = usePlayerProfile(leagueId, seasonId);
  const { user } = useUser();
  const { openLogin, openSignup } = useAuth();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const isCaptain = Boolean(currentTeam?.is_captain || currentTeam?.is_alternate);

  const captainItems: MoreMenuItem[] = isCaptain
    ? [
        { href: '/captain/goalies', label: 'Goalies', icon: Goal, pageKey: 'captaingoalies' },
      ]
    : [];

  const publicItems = PUBLIC_MORE_ITEMS.filter((item) => {
    if (item.pageKey === 'playoffs' && !isPlayoffSeason) return false;
    if (item.pageKey === 'register' && !registrationOpen) return false;
    return shouldShowPage(item.pageKey, visiblePages);
  });

  const customItems: MoreMenuItem[] = (customNavItems ?? []).flatMap((item) => {
    const href = getNavItemHref(item);
    if (!item.label || !href) return [];

    return [{
      href,
      label: item.label,
      icon: FileText,
      pageKey: `custom-${item.pageSlug ?? item.label}`,
      external: Boolean(item.isExternal),
    } satisfies MoreMenuItem];
  });

  const filteredMoreItems = [...(user ? AUTH_MORE_ITEMS : []), ...captainItems, ...publicItems, ...customItems]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index);

  const isMoreActive = filteredMoreItems.some((item) => !item.external && isActive(item.href));

  // League switcher
  const leagues = allLeagues && allLeagues.length > 1 ? allLeagues : null;
  const currentLeagueIdx = leagues?.findIndex((l) => l.slug === leagueSlug) ?? 0;
  const prevLeague = leagues ? leagues[(currentLeagueIdx - 1 + leagues.length) % leagues.length] : null;
  const nextLeague = leagues ? leagues[(currentLeagueIdx + 1) % leagues.length] : null;

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    router.push(`/${leagueSlug}`);
  };

  const handleLoginClick = () => {
    setMoreOpen(false);
    openLogin();
  };

  const handleSignupClick = () => {
    setMoreOpen(false);
    openSignup();
  };

  const isDark = resolvedTheme === 'dark';

  const dock = (
    <div className="fixed inset-x-0 bottom-0 z-[999] flex justify-center lg:hidden" ref={moreRef}>
      {/* More popup menu */}
      {moreOpen && (
        <div
          className="absolute inset-x-4 bottom-[calc(100%+4px)] mx-auto max-w-sm animate-in slide-in-from-bottom-4 rounded-[20px] border border-white/[0.12] shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl duration-200"
          style={{
            background: `linear-gradient(170deg, color-mix(in srgb, var(--league-primary) 10%, rgba(20,20,28,0.92)) 0%, color-mix(in srgb, var(--league-secondary-safe) 6%, rgba(12,12,18,0.95)) 100%)`,
          }}
        >
            {/* League logo header with optional switcher chevrons */}
            <div className="flex items-center justify-center gap-4 border-b border-white/[0.08] px-4 pt-4 pb-3">
              {leagues && prevLeague && (
                <Link
                  href={`/${prevLeague.slug}`}
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}
              <Link
                href={`/${leagueSlug}`}
                className="flex flex-col items-center gap-2"
                onClick={() => setMoreOpen(false)}
              >
                {leagueLogoUrl ? (
                  <Image
                    src={leagueLogoUrl}
                    alt={leagueName}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-2xl object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--league-primary-soft)] text-[var(--league-primary)]">
                    <Trophy className="h-7 w-7" />
                  </div>
                )}
                <span className="max-w-[140px] truncate text-center text-[11px] font-semibold leading-tight text-white/70">
                  {leagueName}
                </span>
              </Link>
              {leagues && nextLeague && (
                <Link
                  href={`/${nextLeague.slug}`}
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}
            </div>

            {divisions.length > 1 && (
              <div className="border-b border-white/[0.08] px-4 pt-3 pb-1">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Division
                </label>
                <select
                  value={selectedDivisionId ?? ''}
                  onChange={(event) => setDivision(event.target.value || null)}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--league-primary)]"
                >
                  <option value="">All divisions</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Page links grid */}
            <div className="grid grid-cols-3 gap-0.5 p-2">
              {filteredMoreItems.map((item) => {
                const active = item.external ? false : isActive(item.href);
                const href = item.external ? item.href : `/${leagueSlug}${item.href}`;
                const className = `flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors ${
                  active
                    ? 'bg-[var(--league-primary)]/15 text-[var(--league-primary)]'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                }`;

                const content = (
                  <>
                    <item.icon className="h-[22px] w-[22px]" />
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </>
                );

                if (item.external) {
                  return (
                    <a
                      key={item.pageKey}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <Link key={item.pageKey} href={href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </div>

            {!user && (
              <div className="grid grid-cols-2 gap-2 px-4 pt-2">
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.1]"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={handleSignupClick}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[var(--league-primary-border)] bg-[var(--league-primary)] px-3 py-2.5 text-sm font-semibold text-[var(--league-on-primary)] transition-colors hover:bg-[var(--league-primary-hover)]"
                >
                  <UserPlus className="h-4 w-4" />
                  Join
                </button>
              </div>
            )}

            {/* Utility row */}
            <div className="mt-1 flex items-center justify-center gap-1 border-t border-white/[0.08] px-4 pt-2 pb-3">
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/80"
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  window.dispatchEvent(new CustomEvent('open-bug-report'));
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/80"
                aria-label="Report a bug"
              >
                <Bug className="h-[18px] w-[18px]" />
              </button>
              {user && isCaptain && (
                <Link
                  href={`/${leagueSlug}/captain`}
                  onClick={() => setMoreOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-[var(--league-primary)]/15 hover:text-[var(--league-primary)]"
                  aria-label={currentTeam?.is_captain ? 'Captain dashboard' : 'Assistant captain dashboard'}
                >
                  <span className="text-base font-black leading-none tracking-tight">
                    {currentTeam?.is_captain ? 'C' : 'A'}
                  </span>
                </Link>
              )}
              {user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-red-500/[0.12] hover:text-red-400"
                  aria-label="Sign out"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dock bar */}
        <div
          className="relative mx-auto mb-[calc(env(safe-area-inset-bottom,6px)+12px)] w-[calc(100%-2rem)] max-w-[400px] rounded-[22px] border border-white/[0.12] shadow-[0_4px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-3xl"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--league-primary) 14%, rgba(18,18,26,0.88)) 0%, color-mix(in srgb, var(--league-secondary-safe) 10%, rgba(10,10,16,0.92)) 100%)`,
          }}
        >
          <nav className="grid grid-cols-5 items-end py-2.5">
            {/* Standings */}
            <Link
              href={`/${leagueSlug}/standings`}
              className={`flex flex-col items-center justify-end gap-1 py-1 transition-colors ${
                isActive('/standings')
                  ? 'text-[var(--league-primary)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Trophy className="h-[22px] w-[22px]" />
              <span className="text-[10px] font-semibold">Standings</span>
            </Link>

            {/* Schedule */}
            <Link
              href={`/${leagueSlug}/schedule`}
              className={`flex flex-col items-center justify-end gap-1 py-1 transition-colors ${
                isActive('/schedule')
                  ? 'text-[var(--league-primary)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Calendar className="h-[22px] w-[22px]" />
              <span className="text-[10px] font-semibold">Schedule</span>
            </Link>

            {/* Center: Team logo */}
            <div className="flex items-center justify-center">
              <Link
                href={teamHref}
                className="absolute left-1/2 bottom-[-2px] flex -translate-x-1/2 items-center justify-center"
              >
                <div
                  className={`relative transition-transform hover:scale-105 active:scale-95 ${
                    isTeamActive ? 'drop-shadow-[0_0_12px_var(--league-primary)]' : ''
                  }`}
                  style={{
                    filter: isTeamActive
                      ? undefined
                      : 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                  }}
                >
                  {teamLogoUrl ? (
                    <Image
                      src={teamLogoUrl}
                      alt="My Team"
                      width={90}
                      height={90}
                      className="h-[90px] w-[90px] object-contain"
                    />
                  ) : (
                    <div className="flex h-[90px] w-[90px] items-center justify-center rounded-full bg-white/[0.08]">
                      <Users className="h-10 w-10 text-white/50" />
                    </div>
                  )}
                </div>
              </Link>
            </div>

            {/* Stats */}
            <Link
              href={`/${leagueSlug}/stats`}
              className={`flex flex-col items-center justify-end gap-1 py-1 transition-colors ${
                isActive('/stats')
                  ? 'text-[var(--league-primary)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <BarChart3 className="h-[22px] w-[22px]" />
              <span className="text-[10px] font-semibold">Stats</span>
            </Link>

            {/* More */}
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={`flex flex-col items-center justify-end gap-1 py-1 transition-colors ${
                moreOpen || isMoreActive
                  ? 'text-[var(--league-primary)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <MoreHorizontal className="h-[22px] w-[22px]" />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </nav>
        </div>
      </div>
  );

  return (
    <>
      {/* Spacer so content isn't hidden behind dock */}
      <div className="h-32 lg:hidden" />
      {mounted ? createPortal(dock, document.body) : null}
    </>
  );
}
