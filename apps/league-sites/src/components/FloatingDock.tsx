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
  LayoutDashboard,
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

interface FloatingDockProps {
  leagueId: string;
  leagueSlug: string;
  leagueName: string;
  leagueLogoUrl: string | null;
  seasonId: string | null;
  visiblePages?: Record<string, boolean>;
  allLeagues?: Array<{ slug: string; name: string; logo_url: string | null }>;
}

interface MoreMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  pageKey: string;
}

const MORE_ITEMS: MoreMenuItem[] = [
  { href: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard, pageKey: 'dashboard' },
  { href: '/teams', label: 'Teams', icon: Users, pageKey: 'teams' },
  { href: '/players', label: 'Players', icon: Users, pageKey: 'players' },
  { href: '/news', label: 'News', icon: Newspaper, pageKey: 'news' },
  { href: '/suspensions', label: 'Suspensions', icon: Shield, pageKey: 'suspensions' },
  { href: '/history', label: 'History', icon: Crown, pageKey: 'history' },
  { href: '/gallery', label: 'Gallery', icon: Camera, pageKey: 'gallery' },
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

  return (
    <>
      {/* Spacer so content isn't hidden behind dock */}
      <div className="h-32 lg:hidden" />

      {/* Dock wrapper — centers everything */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center lg:hidden" ref={moreRef}>
        {/* "More" popup menu */}
        {moreOpen && (
          <div className="absolute inset-x-4 bottom-[calc(100%+4px)] max-w-sm mx-auto rounded-[20px] border border-white/[0.12] shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in slide-in-from-bottom-4 duration-200"
            style={{
              background: `linear-gradient(170deg, color-mix(in srgb, var(--league-primary) 10%, rgba(20,20,28,0.92)) 0%, color-mix(in srgb, var(--league-secondary-safe) 6%, rgba(12,12,18,0.95)) 100%)`,
            }}
          >
            {/* League logo header with optional switcher chevrons */}
            <div className="flex items-center justify-center gap-4 px-4 pt-4 pb-3 border-b border-white/[0.08]">
              {leagues && prevLeague && (
                <Link
                  href={`/${prevLeague.slug}`}
                  className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
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
                <span className="text-[11px] font-semibold text-white/70 leading-tight text-center max-w-[140px] truncate">
                  {leagueName}
                </span>
              </Link>
              {leagues && nextLeague && (
                <Link
                  href={`/${nextLeague.slug}`}
                  className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}
            </div>

            {/* Page links grid */}
            <div className="grid grid-cols-3 gap-0.5 p-2">
              {filteredMoreItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.pageKey}
                    href={`/${leagueSlug}${item.href}`}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors ${
                      active
                        ? 'bg-[var(--league-primary)]/15 text-[var(--league-primary)]'
                        : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                    }`}
                  >
                    <item.icon className="h-[22px] w-[22px]" />
                    <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Utility row: theme toggle, bug report, sign out — icons only */}
            <div className="flex items-center justify-center gap-1 px-4 pt-2 pb-3 border-t border-white/[0.08] mt-1">
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
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-red-500/[0.12] hover:text-red-400"
                aria-label="Sign out"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Dock bar ─── */}
        <div
          className="relative mb-[calc(env(safe-area-inset-bottom,6px)+12px)] mx-auto w-[calc(100%-2rem)] max-w-[400px] rounded-[22px] border border-white/[0.12] shadow-[0_4px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-3xl"
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

            {/* ─── Center: Team logo — oversized, no container, no label ─── */}
            <div className="flex items-center justify-center">
              <Link
                href={teamHref}
                className="absolute left-1/2 -translate-x-1/2 bottom-1 flex items-center justify-center"
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
                      width={108}
                      height={108}
                      className="h-[108px] w-[108px] object-contain"
                    />
                  ) : (
                    <div className="flex h-[108px] w-[108px] items-center justify-center rounded-full bg-white/[0.08]">
                      <Users className="h-12 w-12 text-white/50" />
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
              onClick={() => setMoreOpen((o) => !o)}
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
    </>
  );
}
