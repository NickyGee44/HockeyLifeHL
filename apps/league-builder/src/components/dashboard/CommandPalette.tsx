'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useSidebar } from './SidebarContext';
import {
  Home,
  Calendar,
  Users,
  Trophy,
  ClipboardCheck,
  User,
  Settings,
  CreditCard,
  Palette,
  Newspaper,
  Star,
  Award,
  Image,
  Dices,
  Plus,
  Search,
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const t = useTranslations('commandPalette');
  const { selected } = useSidebar();

  const leagueBase = selected.leagueId
    ? `/dashboard/leagues/${selected.leagueId}`
    : '/dashboard';

  // Global keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navigate = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const pages = React.useMemo(
    () => [
      { label: t('pages.overview'), icon: Home, href: '/dashboard' },
      { label: t('pages.schedule'), icon: Calendar, href: `${leagueBase}/schedule` },
      { label: t('pages.teamsAndDivisions'), icon: Users, href: `${leagueBase}/teams` },
      { label: t('pages.standings'), icon: Trophy, href: `${leagueBase}/standings` },
      { label: t('pages.registration'), icon: ClipboardCheck, href: `${leagueBase}/registration` },
      { label: t('pages.players'), icon: User, href: `${leagueBase}/players` },
      { label: t('pages.settings'), icon: Settings, href: '/dashboard/settings' },
      { label: t('pages.billing'), icon: CreditCard, href: '/dashboard/settings/billing' },
      { label: t('pages.websiteEditor'), icon: Palette, href: `/website-editor?league=${selected.leagueId}` },
      { label: t('pages.news'), icon: Newspaper, href: `${leagueBase}/news` },
      { label: t('pages.sponsors'), icon: Star, href: `${leagueBase}/sponsors` },
      { label: t('pages.awards'), icon: Award, href: `${leagueBase}/awards` },
      { label: t('pages.gallery'), icon: Image, href: `${leagueBase}/gallery` },
      { label: t('pages.draftRoom'), icon: Dices, href: `${leagueBase}/draft` },
    ],
    [t, leagueBase, selected.leagueId]
  );

  const actions = React.useMemo(
    () => [
      { label: t('actions.createLeague'), icon: Plus, href: '/dashboard/leagues/new' },
      { label: t('actions.addTeam'), icon: Users, href: `${leagueBase}/teams` },
      { label: t('actions.newSeason'), icon: Calendar, href: `${leagueBase}/settings` },
    ],
    [t, leagueBase]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="absolute inset-x-0 top-[20%] mx-auto max-w-lg px-4">
        <Command
          className="rounded-xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden"
          loop
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4">
            <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <Command.Input
              placeholder={t('searchPlaceholder')}
              className="w-full py-3 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/10 bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400 font-mono">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-neutral-500">
              {t('noResults')}
            </Command.Empty>

            {/* Pages */}
            <Command.Group
              heading={t('sections.pages')}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-neutral-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              {pages.map((page) => (
                <Command.Item
                  key={page.href}
                  value={page.label}
                  onSelect={() => navigate(page.href)}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-neutral-300 cursor-pointer data-[selected=true]:bg-rink-500/10 data-[selected=true]:text-rink-400 transition-colors"
                >
                  <page.icon className="w-4 h-4 flex-shrink-0 text-neutral-500" />
                  {page.label}
                </Command.Item>
              ))}
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group
              heading={t('sections.quickActions')}
              className="mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-neutral-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              {actions.map((action) => (
                <Command.Item
                  key={action.label}
                  value={action.label}
                  onSelect={() => navigate(action.href)}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-neutral-300 cursor-pointer data-[selected=true]:bg-rink-500/10 data-[selected=true]:text-rink-400 transition-colors"
                >
                  <action.icon className="w-4 h-4 flex-shrink-0 text-neutral-500" />
                  {action.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer hint */}
          <div className="border-t border-white/10 px-4 py-2 flex items-center justify-between text-[11px] text-neutral-500">
            <span>{t('hint')}</span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-white/10 bg-neutral-800 px-1 py-0.5 font-mono">
                ↑↓
              </kbd>
              {t('toNavigate')}
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
