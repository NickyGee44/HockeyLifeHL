'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  CalendarDays,
  Plus,
  Users,
  Calendar,
  UserCircle2,
  DollarSign,
  CreditCard,
  Newspaper,
  FileText,
  Star,
  Award,
  Image,
  Settings,
  Palette,
  Building2,
  User,
  CheckCircle2,
  ClipboardCheck,
  Dices,
  Flag,
  MapPin,
  Mail,
  PartyPopper,
  Bug,
  ClipboardList,
  BarChart3,
  Database,
  Lock,
  PinOff,
  Pin,
  ChevronLeft,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useSidebar, type NavSection } from './SidebarContext';
import { LeagueScopeSelector } from './LeagueScopeSelector';
import type { DashboardData } from '@/lib/actions/dashboard';

interface SecondaryPanelProps {
  dashboardData: DashboardData | null;
  isSubscribed: boolean;
  ownerViewLeagueId?: string | null;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  locked?: boolean;
  muted?: boolean;
  comingSoon?: boolean;
}

function extractLeagueIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/dashboard\/leagues\/([0-9a-f-]{36})/i);
  return match ? match[1] : null;
}

export function SecondaryPanel({
  dashboardData,
  isSubscribed,
  ownerViewLeagueId = null,
}: SecondaryPanelProps) {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const {
    activeSection,
    setActiveSection,
    isSecondaryPinned,
    toggleSecondaryPin,
    isCollapsed,
    selected,
    isMobileNavOpen,
    toggleMobileNav,
  } = useSidebar();

  const pathLeagueId = extractLeagueIdFromPath(pathname);
  const effectiveLeagueId = pathLeagueId ?? selected.leagueId;

  const leagueBase = effectiveLeagueId
    ? `/dashboard/leagues/${effectiveLeagueId}`
    : '/dashboard';

  const hasLeague = !!effectiveLeagueId;

  const isPathActive = (href: string) => {
    const hrefPath = href.split('?')[0];
    const localizedPath = `/${locale}${hrefPath}`;
    if (hrefPath === '/dashboard') {
      return pathname === localizedPath || pathname === `/${locale}/tableau-de-bord`;
    }
    return pathname.startsWith(localizedPath);
  };

  // Close mobile nav on link click
  const onLinkClick = React.useCallback(() => {
    if (isMobileNavOpen) toggleMobileNav();
  }, [isMobileNavOpen, toggleMobileNav]);

  // Define sub-items for each section
  const sectionItems = React.useMemo((): Record<NavSection, { title: string; items: NavItem[] }> => ({
    dashboard: {
      title: t('overview'),
      items: [
        { href: '/dashboard', icon: Home, label: t('overview') },
        ...(hasLeague ? [{ href: leagueBase, icon: Home, label: t('leagueOverview') }] : []),
        ...(hasLeague ? [{ href: `${leagueBase}/migration-center`, icon: Database, label: 'Migration Center' }] : []),
      ],
    },
    seasons: {
      title: t('seasons'),
      items: hasLeague
        ? [
            { href: `${leagueBase}/seasons`, icon: CalendarDays, label: t('seasons'), locked: !isSubscribed },
            { href: '/dashboard/leagues/new', icon: Plus, label: t('createLeague'), muted: true },
          ]
        : [
            { href: '/dashboard/leagues/new', icon: Plus, label: t('createLeague'), muted: true },
          ],
    },
    teams: {
      title: t('teamsAndDivisions'),
      items: hasLeague
        ? [
            { href: `${leagueBase}/teams-divisions`, icon: Users, label: t('teamsAndDivisions'), locked: !isSubscribed },
            { href: `${leagueBase}/divisions`, icon: Users, label: t('divisions') || 'Divisions', locked: !isSubscribed },
            { href: `${leagueBase}/settings/goalie-pool`, icon: UserCircle2, label: t('goaliePool') || 'Goalie Pool', locked: !isSubscribed },
            { href: `${leagueBase}/draft`, icon: Dices, label: t('draftRoom'), locked: !isSubscribed },
          ]
        : [],
    },
    schedule: {
      title: t('schedule'),
      items: hasLeague
        ? [
            { href: `${leagueBase}/schedule`, icon: Calendar, label: t('schedule'), locked: !isSubscribed },
            { href: `${leagueBase}/games`, icon: CheckCircle2, label: t('games') || 'Games', locked: !isSubscribed },
            { href: `${leagueBase}/settings/venues`, icon: MapPin, label: t('venues'), locked: !isSubscribed },
            { href: `${leagueBase}/scorekeepers/schedule`, icon: ClipboardList, label: t('scorekeeperSchedule'), locked: !isSubscribed },
          ]
        : [],
    },
    players: {
      title: t('players') || 'Players',
      items: hasLeague
        ? [
            { href: `${leagueBase}/registrations`, icon: ClipboardCheck, label: t('registration'), locked: !isSubscribed },
            { href: `${leagueBase}/ratings`, icon: BarChart3, label: t('playerRatings') },
            { href: `${leagueBase}/staff`, icon: User, label: t('staff'), locked: !isSubscribed },
            { href: `${leagueBase}/settings/referees`, icon: Flag, label: t('referees'), locked: !isSubscribed },
          ]
        : [],
    },
    financials: {
      title: t('financials') || 'Financials',
      items: [
        ...(hasLeague
          ? [
              { href: `${leagueBase}/payments`, icon: DollarSign, label: t('paymentTracking'), locked: !isSubscribed },
              { href: `${leagueBase}/billing`, icon: CreditCard, label: t('leagueBilling') || 'League Billing' },
            ]
          : []),
        { href: '/dashboard/settings/billing', icon: CreditCard, label: t('billing') },
      ],
    },
    content: {
      title: t('sectionContent'),
      items: hasLeague
        ? [
            { href: `${leagueBase}/news`, icon: Newspaper, label: t('news'), locked: !isSubscribed },
            { href: `${leagueBase}/pages`, icon: FileText, label: t('pages'), locked: !isSubscribed },
            { href: `${leagueBase}/sponsors`, icon: Star, label: t('sponsors'), locked: !isSubscribed },
            { href: `${leagueBase}/awards`, icon: Award, label: t('awards'), locked: !isSubscribed },
            { href: `${leagueBase}/gallery`, icon: Image, label: t('gallery'), locked: !isSubscribed },
            { href: `${leagueBase}/events`, icon: PartyPopper, label: t('events'), locked: !isSubscribed },
            { href: `${leagueBase}/contact-inbox`, icon: Mail, label: t('contactInbox'), locked: !isSubscribed },
            { href: `${leagueBase}/bugs`, icon: Bug, label: t('bugReports') },
          ]
        : [],
    },
    settings: {
      title: t('settings'),
      items: [
        ...(hasLeague
          ? [{ href: `${leagueBase}/settings`, icon: Settings, label: t('leagueSettings'), locked: !isSubscribed }]
          : []),
        { href: '/dashboard/company', icon: Building2, label: t('companyProfile') },
        { href: '/dashboard/settings/members', icon: Users, label: t('members') },
        { href: '/dashboard/settings', icon: Settings, label: t('settings') },
        { href: hasLeague ? `/website-editor?league=${effectiveLeagueId}` : '/website-editor', icon: Palette, label: t('websiteEditor') },
      ],
    },
  }), [t, hasLeague, leagueBase, isSubscribed]);

  const currentData = activeSection ? sectionItems[activeSection] : null;
  const isVisible = !isCollapsed && activeSection !== null;

  if (!isVisible || !currentData) return null;

  return (
    <div
      className={cn(
        'fixed top-0 bottom-0 z-40 hidden md:flex flex-col',
        'w-60 bg-neutral-900 border-r border-white/10',
        'transition-all duration-200 ease-in-out',
        'left-16' // positioned right of the icon rail
      )}
    >
      {/* Header with section title + pin toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <span className="text-sm font-semibold text-white truncate">{currentData.title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSecondaryPin}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
            title={isSecondaryPinned ? 'Unpin panel' : 'Pin panel open'}
          >
            {isSecondaryPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
          {!isSecondaryPinned && (
            <button
              onClick={() => setActiveSection(null)}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* League scope selector — also show for platform admins who have admin_leagues but no org */}
      {((dashboardData?.organizations?.length ?? 0) > 0 || (dashboardData?.admin_leagues?.length ?? 0) > 0) && (
        <div className="border-b border-white/[0.06]">
          <LeagueScopeSelector
            dashboardData={dashboardData}
            collapsed={false}
            ownerViewLeagueId={ownerViewLeagueId}
          />
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {currentData.items.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-neutral-500">Select a league to see options</p>
          </div>
        ) : (
          currentData.items.map((item) => {
            if (item.comingSoon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-600 cursor-not-allowed"
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0 text-neutral-700" />
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-800 px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </div>
              );
            }

            const resolvedHref = item.locked ? '/dashboard/settings/billing' : item.href;
            const active = isPathActive(item.href);

            return (
              <Link
                key={item.href}
                href={resolvedHref}
                onClick={onLinkClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  item.locked
                    ? 'text-neutral-600 hover:text-neutral-500 hover:bg-neutral-800/20 cursor-not-allowed'
                    : active
                    ? 'bg-rink-500/10 text-rink-500 border border-rink-500/30'
                    : item.muted
                    ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30 border border-transparent'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent'
                )}
              >
                <item.icon
                  className={cn(
                    'w-[18px] h-[18px] flex-shrink-0',
                    item.locked
                      ? 'text-neutral-600'
                      : active
                      ? 'text-rink-500'
                      : 'text-neutral-500 group-hover:text-rink-500'
                  )}
                />
                <span className="font-medium text-sm flex-1">{item.label}</span>
                {item.locked && <Lock className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />}
              </Link>
            );
          })
        )}
      </nav>

      {/* Language switcher at bottom */}
      <div className="p-2 border-t border-white/10">
        <LanguageSwitcher collapsed={false} />
      </div>
    </div>
  );
}
