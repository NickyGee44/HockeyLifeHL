'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  Calendar,
  BarChart3,
  ClipboardCheck,
  Users as UsersIcon,
  Star,
  FileText,
  Trophy,
  CalendarDays,
  DollarSign,
  CreditCard,
  Wallet,
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
import {
  buildLeagueHubHref,
  buildLeagueSeasonsHref,
  buildSeasonWorkspaceHref,
} from '@/lib/dashboard/workspace-routes';

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

  const leagueHub = leagueId ? buildLeagueHubHref('', leagueId).replace(/^\/$/, '') : null;
  const leagueSeasons = leagueId ? buildLeagueSeasonsHref('', leagueId).replace(/^\/$/, '') : null;
  const seasonHome = leagueId && seasonId ? buildSeasonWorkspaceHref('', leagueId, seasonId).replace(/^\/$/, '') : null;

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
          {seasonHome && leagueId && seasonId && (
            <>
              <SidebarSectionLabel>Season Workspace</SidebarSectionLabel>
              <SidebarNavItem
                href={seasonHome}
                icon={Home}
                label="Season Home"
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />

              <SidebarNavGroup groupId="season-registrations" label="Registrations & Teams" icon={ClipboardCheck}>
                <SidebarNavItem
                  href={buildSeasonWorkspaceHref('', leagueId, seasonId, 'registrations').replace(/^\/$/, '')}
                  icon={ClipboardCheck}
                  label={t('registration')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={buildSeasonWorkspaceHref('', leagueId, seasonId, 'teams').replace(/^\/$/, '')}
                  icon={UsersIcon}
                  label={t('teams') || 'Teams'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={buildSeasonWorkspaceHref('', leagueId, seasonId, 'rosters').replace(/^\/$/, '')}
                  icon={UsersIcon}
                  label={t('rosters') || 'Rosters'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={buildSeasonWorkspaceHref('', leagueId, seasonId, 'players').replace(/^\/$/, '')}
                  icon={UserCircle2}
                  label={t('players') || 'Players'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
              </SidebarNavGroup>

              <SidebarNavGroup groupId="season-game-ops" label="Scheduling & Game Ops" icon={Calendar}>
                <SidebarNavItem
                  href={buildSeasonWorkspaceHref('', leagueId, seasonId, 'schedule').replace(/^\/$/, '')}
                  icon={Calendar}
                  label={t('schedule')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={buildSeasonWorkspaceHref('', leagueId, seasonId, 'games').replace(/^\/$/, '')}
                  icon={Trophy}
                  label={t('games') || 'Games'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={buildSeasonWorkspaceHref('', leagueId, seasonId, 'scorekeepers').replace(/^\/$/, '')}
                  icon={ClipboardList}
                  label={t('scorekeeperSchedule')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
              </SidebarNavGroup>

              <SidebarNavGroup groupId="season-settings" label="Season Settings" icon={Settings}>
                <SidebarNavItem
                  href={buildSeasonWorkspaceHref('', leagueId, seasonId, 'settings').replace(/^\/$/, '')}
                  icon={Settings}
                  label="Edit Season"
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
              </SidebarNavGroup>
            </>
          )}

          {/* ---------- LEAGUE SECTION ---------- */}
          {leagueHub && leagueId && (
            <>
              <SidebarSectionLabel>League Hub</SidebarSectionLabel>
              <SidebarNavItem
                href={leagueHub}
                icon={Building2}
                label={t('leagueOverview') || 'League Hub'}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={leagueSeasons || `${leagueHub}/seasons`}
                icon={CalendarDays}
                label={t('seasons')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${leagueHub}/divisions`}
                icon={UsersIcon}
                label={t('teamsAndDivisions') || 'Divisions'}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${leagueHub}/staff`}
                icon={Flag}
                label={t('staff') || 'Staff Directory'}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />

              {/* Financials group */}
              <SidebarNavGroup groupId="financials" label={t('financials') || 'Financials'} icon={DollarSign}>
                <SidebarNavItem
                  href={`${leagueHub}/finance`}
                  icon={Wallet}
                  label={t('financials') || 'Financials'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/billing`}
                  icon={CreditCard}
                  label={t('leagueBilling') || 'League Billing'}
                  indent
                  onClick={closeMobileNav}
                />
              </SidebarNavGroup>

              {/* Content group */}
              <SidebarNavGroup groupId="content" label={t('sectionContent')} icon={Newspaper}>
                <SidebarNavItem
                  href={`${leagueHub}/news`}
                  icon={Newspaper}
                  label={t('news')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/pages`}
                  icon={FileText}
                  label={t('pages')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/sponsors`}
                  icon={Star}
                  label={t('sponsors')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/gallery`}
                  icon={Image}
                  label={t('gallery')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/events`}
                  icon={PartyPopper}
                  label={t('events')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/awards`}
                  icon={Award}
                  label={t('awards')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
              </SidebarNavGroup>

              <SidebarNavItem
                href={`${leagueHub}/website`}
                icon={Globe}
                label={t('websiteEditor')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${leagueHub}/contact-inbox`}
                icon={Mail}
                label={t('contactInbox')}
                locked={!isSubscribed}
                onClick={closeMobileNav}
              />
              <SidebarNavItem
                href={`${leagueHub}/bugs`}
                icon={Bug}
                label={t('bugReports')}
                onClick={closeMobileNav}
              />

              {/* League Settings group */}
              <SidebarNavGroup groupId="league-settings" label={t('leagueSettings')} icon={Settings}>
                <SidebarNavItem
                  href={`${leagueHub}/settings/general`}
                  icon={Settings}
                  label={t('general') || 'General'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/settings/game-rules`}
                  icon={ClipboardCheck}
                  label={t('gameRules') || 'Game Rules'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/settings/registration`}
                  icon={ClipboardCheck}
                  label={t('registration')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/settings/waiver`}
                  icon={FileText}
                  label={t('waiver') || 'Waiver'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/settings/venues`}
                  icon={MapPin}
                  label={t('venues')}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/settings/goalie-pool`}
                  icon={UserCircle2}
                  label={t('goaliePool') || 'Goalie Pool'}
                  locked={!isSubscribed}
                  indent
                  onClick={closeMobileNav}
                />
                <SidebarNavItem
                  href={`${leagueHub}/settings/email-domain`}
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
