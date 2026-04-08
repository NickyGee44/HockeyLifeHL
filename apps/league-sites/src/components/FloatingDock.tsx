'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
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
  X,
  LogOut,
  Sun,
  Moon,
  Bug,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { signOut } from '@/lib/supabase/auth';
import { useBugReportContext } from '@/components/bug-report/BugReportProvider';

interface FloatingDockProps {
  leagueId: string;
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl: string | null;
  seasonId: string | null;
  visiblePages?: Record<string, boolean>;
  /** All leagues the site knows about — enables league switcher chevrons */
  allLeagues?: Array<{ slug: string; name: string; logo_url: string | null }>;
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

export function FloatingDock({
  leagueId,
  leagueSlug,
  leagueName,
  leagueLogoUrl,
  seasonId,
  visiblePages,
  allLeagues,
}: FloatingDockProps) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { currentTeam } = usePlayerProfile(leagueId, seasonId);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Bug report context
  let bugReportCtx: ReturnType<typeof useBugReportContext> | null = null;
  try {
    bugReportCtx = useBugReportContext();
  } catch {
    // Not inside BugReportProvider
  }

  // For theme toggle hydration
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

  const filteredMoreItems = MORE_ITEMS.filter((item) => shouldShowPage(item.pageKey, visiblePages));
  const isMoreActive = filteredMoreItems.some((item) => isActive(item.href));

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

  const isDark = resolvedTheme === 'dark';

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
      <div className="h-24 lg:hidden" />

      {/* Dock */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center lg:hidden" ref={moreRef}>
        {/* "More" popup menu */}
        {moreOpen && (
          <div className="absolute inset-x-4 bottom-[calc(100%+8px)] max-w-sm mx-auto rounded-2xl border border-white/15 bg-[color-mix(in_srgb,var(--league-primary)_12%,color-mix(in_srgb,var(--league-secondary-safe)_8%,var(--color-surface)))] p-3 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-200">
            {/* League logo header with optional switcher chevrons */}
            <div className="flex items-center justify-center gap-3 pb-3 border-b border-white/10 mb-3">
              {leagues && prevLeague && (
                <Link
                  href={`/${prevLeague.slug}`}
                  className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}
              <Link
                href={`/${leagueSlug}`}
                className="flex flex-col items-center gap-1.5"
                onClick={() => setMoreOpen(false)}
              >
                {leagueLogoUrl ? (
                  <Image
                    src={leagueLogoUrl}
                    alt={leagueName}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl object-contain drop-shadow-lg"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--league-primary-soft)] text-[var(--league-primary)]">
                    <Trophy className="h-6 w-6" />
                  </div>
                )}
                <span className="text-[11px] font-semibold text-[var(--color-text-primary)] leading-tight text-center max-w-[120px] truncate">
                  {leagueName}
                </span>
              </Link>
              {leagues && nextLeague && (
                <Link
                  href={`/${nextLeague.slug}`}
                  className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}
            </div>

            {/* Page links grid */}
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
                        : 'text-[var(--color-text-secondary)] hover:bg-white/8'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Utility row: sign out, theme toggle, bug report */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-2">
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-text-primary)]"
                  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  // Trigger bug report modal via DOM event
                  window.dispatchEvent(new CustomEvent('open-bug-report'));
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--color-text-primary)]"
                aria-label="Report a bug"
              >
                <Bug className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-red-500/15 hover:text-red-400"
                aria-label="Sign out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}

        {/* Dock bar — floating, not full-width */}
        <div
          className="mb-[env(safe-area-inset-bottom,8px)] mx-4 w-[min(calc(100%-2rem),360px)] rounded-2xl border border-white/15 px-2 py-3 shadow-2xl backdrop-blur-2xl"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--league-primary) 18%, var(--color-surface) 82%) 0%, color-mix(in srgb, var(--league-secondary-safe) 12%, var(--color-surface) 88%) 100%)`,
          }}
        >
          <nav className="flex items-end justify-around">
            {/* Left items: Standings, Schedule */}
            {dockItems.slice(0, 2).map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 transition-colors ${
                  item.active
                    ? 'text-[var(--league-primary)]'
                    : 'text-white/60 hover:text-white/90'
                }`}
              >
                {item.render()}
                <span className={`text-[10px] font-semibold ${item.active ? 'text-[var(--league-primary)]' : ''}`}>
                  {item.label}
                </span>
              </Link>
            ))}

            {/* Center: Team logo — oversized focal point, no text label */}
            <Link
              href={teamHref}
              className="relative -mt-6 flex flex-col items-center"
            >
              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105 ${
                  isTeamActive
                    ? 'ring-2 ring-[var(--league-primary)] ring-offset-2 ring-offset-[var(--color-surface)]'
                    : ''
                }`}
                style={{
                  background: 'radial-gradient(circle, color-mix(in srgb, var(--league-primary) 25%, var(--color-surface)) 0%, color-mix(in srgb, var(--league-secondary-safe) 15%, var(--color-surface)) 100%)',
                  boxShadow: '0 0 20px color-mix(in srgb, var(--league-primary) 35%, transparent), 0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                {teamLogoUrl ? (
                  <Image
                    src={teamLogoUrl}
                    alt="My Team"
                    width={52}
                    height={52}
                    className="h-[52px] w-[52px] rounded-full object-contain drop-shadow-lg"
                  />
                ) : (
                  <Users className="h-7 w-7 text-white/70" />
                )}
              </div>
            </Link>

            {/* Right items: Stats, More */}
            {dockItems.slice(2).map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 transition-colors ${
                  item.active
                    ? 'text-[var(--league-primary)]'
                    : 'text-white/60 hover:text-white/90'
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
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1 transition-colors ${
                moreOpen || isMoreActive
                  ? 'text-[var(--league-primary)]'
                  : 'text-white/60 hover:text-white/90'
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
