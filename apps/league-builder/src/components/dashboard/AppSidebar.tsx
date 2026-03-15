'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  Calendar,
  CheckCircle2,
  BarChart3,
  ClipboardCheck,
  Users as UsersIcon,
  Star,
  FileText,
  Trophy,
  CalendarDays,
  DollarSign,
  CreditCard,
  Newspaper,
  Image,
  PartyPopper,
  Award,
  Settings,
  Mail,
  Bug,
  MapPin,
  ClipboardList,
  Dices,
  Shield,
  Zap,
  LogOut,
  Globe,
  Building2,
  UserCircle2,
  Flag,
} from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { useAppSidebar } from './AppSidebarContext';
import { LeagueSwitcher } from './LeagueSwitcher';
import { SeasonPicker } from './SeasonPicker';
import { SidebarNavItem } from './SidebarNavItem';
import { SidebarNavGroup, SidebarSectionLabel } from './SidebarNavGroup';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import type { DashboardData } from '@/lib/actions/dashboard';

interface AppSidebarProps {
  dashboardData: DashboardData | null;
  captainTeams: CaptainTeamOverview[];
  isSubscribed: boolean;
  isPlatformAdmin: boolean;
  ownerViewLeagueId?: string | null;
}

export function AppSidebar({
  dashboardData,
  captainTeams,
  isSubscribed,
  isPlatformAdmin,
  ownerViewLeagueId = null,
}: AppSidebarProps) {
  const t = useTranslations('navigation');
  const { leagueId, seasonId, isMobileSidebarOpen, toggleMobileSidebar } = useAppSidebar();

  const leagueBase = leagueId ? `/dashboard/leagues/${leagueId}` : null;
  const seasonBase = leagueBase && seasonId ? `${leagueBase}/seasons/${seasonId}` : null;

  const orgName = dashboardData?.organizations?.[0]?.name || 'Organization';

  const closeMobileNav = React.useCallback(() => {
    if (isMobileSidebarOpen) toggleMobileSidebar();
  }, [isMobileSidebarOpen, toggleMobileSidebar]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col w-[280px]',
          'bg-neutral-950 border-r border-white/[0.06]',
          // Desktop: always visible
          'hidden md:flex',
          // Mobile: slide in/out
          isMobileSidebarOpen && '!flex'
        )}
      >
        {/* ===== Org Header ===== */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4.5 h-4.5 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{orgName}</p>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={closeMobileNav}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04] transition-colors"
              title={t('settings')}
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ===== League Switcher + Season Picker ===== */}
        {dashboardData && (
          <div className="border-b border-white/[0.06]">
            <LeagueSwitcher
              dashboardData={dashboardData}
              ownerViewLeagueId={ownerViewLeagueId}
              onMobileNavClose={closeMobileNav}
            />
            {leagueId && (
              <div className="px-2 pb-2 -mt-1">
                <SeasonPicker onMobileNavClose={closeMobileNav} />
              </div>
            )}
          </div>
        )}

        {/* ===== Scrollable Nav ===== */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">

          {/* ---------- SEASON SECTION ---------- */}
          {seasonBase && (
            <>
              <SidebarSectionLabel>{t('season') || 'Season'}</SidebarSectionLabel>
              <SidebarNavItem
                href={`${seasonBase}/schedule`}
                icon={Calendar}
                label={t('schedule')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/games`}
                icon={CheckCircle2}
                label={t('games') || 'Games'}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/standings`}
                icon={BarChart3}
                label={t('standings')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/registrations`}
                icon={ClipboardCheck}
                label={t('registration')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/rosters`}
                icon={UsersIcon}
                label={t('rosters') || 'Rosters'}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/players`}
                icon={UserCircle2}
                label={t('players') || 'Players'}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/ratings`}
                icon={Star}
                label={t('playerRatings')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/eligibility`}
                icon={FileText}
                label={t('eligibility') || 'Eligibility'}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/draft`}
                icon={Dices}
                label={t('draftRoom')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${seasonBase}/scorekeeper-schedule`}
                icon={ClipboardList}
                label={t('scorekeeperSchedule')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
            </>
          )}

          {/* ---------- LEAGUE SECTION ---------- */}
          {leagueBase && (
            <>
              <SidebarSectionLabel>{t('league') || 'League'}</SidebarSectionLabel>
              <SidebarNavItem
                href={leagueBase}
                icon={Home}
                label={t('leagueOverview') || 'Overview'}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${leagueBase}/seasons`}
                icon={CalendarDays}
                label={t('seasons')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${leagueBase}/teams`}
                icon={UsersIcon}
                label={t('teamsAndDivisions')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />

              {/* Financials group */}
              <SidebarNavGroup groupId="financials" label={t('financials') || 'Financials'} icon={DollarSign}>
                <SidebarNavItem
                  href={`${leagueBase}/payments`}
                  icon={DollarSign}
                  label={t('paymentTracking')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/billing`}
                  icon={CreditCard}
                  label={t('leagueBilling') || 'League Billing'}
                  indent
                  onClick={closeMobileNav}
                />
              </SidebarNavGroup>

              {/* Content group */}
              <SidebarNavGroup groupId="content" label={t('sectionContent')} icon={Newspaper}>
                <SidebarNavItem
                  href={`${leagueBase}/news`}
                  icon={Newspaper}
                  label={t('news')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/pages`}
                  icon={FileText}
                  label={t('pages')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/sponsors`}
                  icon={Star}
                  label={t('sponsors')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/gallery`}
                  icon={Image}
                  label={t('gallery')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/events`}
                  icon={PartyPopper}
                  label={t('events')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/awards`}
                  icon={Award}
                  label={t('awards')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
              </SidebarNavGroup>

              <SidebarNavItem
                href={`${leagueBase}/website`}
                icon={Globe}
                label={t('websiteEditor')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${leagueBase}/contact-inbox`}
                icon={Mail}
                label={t('contactInbox')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${leagueBase}/bugs`}
                icon={Bug}
                label={t('bugReports')}
                onClick={closeMobileNav}
              />

              {/* League Settings group */}
              <SidebarNavGroup groupId="league-settings" label={t('leagueSettings')} icon={Settings}>
                <SidebarNavItem
                  href={`${leagueBase}/settings/general`}
                  icon={Settings}
                  label={t('general') || 'General'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/settings/game-rules`}
                  icon={CheckCircle2}
                  label={t('gameRules') || 'Game Rules'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/settings/registration`}
                  icon={ClipboardCheck}
                  label={t('registration')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/settings/waiver`}
                  icon={FileText}
                  label={t('waiver') || 'Waiver'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/settings/venues`}
                  icon={MapPin}
                  label={t('venues')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/settings/goalie-pool`}
                  icon={UserCircle2}
                  label={t('goaliePool') || 'Goalie Pool'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueBase}/settings/email-domain`}
                  icon={Mail}
                  label={t('emailDomain') || 'Email Domain'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
              </SidebarNavGroup>
            </>
          )}

          {/* ---------- ORGANIZATION SECTION ---------- */}
          <SidebarSectionLabel>{t('organization') || 'Organization'}</SidebarSectionLabel>
          <SidebarNavItem
            href="/dashboard"
            icon={Home}
            label={t('home') || 'Home'}
            onClick={closeMobileNav}
          />
          <SidebarNavItem
            href="/dashboard/staff"
            icon={Flag}
            label={t('staffPool') || 'Staff Pool'}
            onClick={closeMobileNav}
          />
          <SidebarNavItem
            href="/dashboard/settings"
            icon={Settings}
            label={t('settings')}
            onClick={closeMobileNav}
          />
          <SidebarNavItem
            href="/dashboard/settings/billing"
            icon={CreditCard}
            label={t('billing')}
            onClick={closeMobileNav}
          />

          {/* ---------- CAPTAIN TEAMS ---------- */}
          {captainTeams.length > 0 && (
            <>
              <SidebarSectionLabel>{t('captain') || 'Captain'}</SidebarSectionLabel>
              {captainTeams.map((team) => (
                <SidebarNavItem
                  key={team.id}
                  href={`/dashboard/captain/${team.id}`}
                  icon={Shield}
                  label={team.short_name}
                  badge={team.pending_requests_count}
                  onClick={closeMobileNav}
                />
              ))}
            </>
          )}

          {/* ---------- PLATFORM ADMIN ---------- */}
          {isPlatformAdmin && (
            <>
              <SidebarSectionLabel>Admin</SidebarSectionLabel>
              <SidebarNavItem
                href="/dashboard/admin"
                icon={Zap}
                label="Admin Dashboard"
                onClick={closeMobileNav}
              />
            </>
          )}
        </nav>

        {/* ===== Footer ===== */}
        <div className="border-t border-white/[0.06] p-2 space-y-1">
          <LanguageSwitcher collapsed={false} />
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('signOut') || 'Sign Out'}</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
