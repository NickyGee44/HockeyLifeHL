'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Command } from 'cmdk';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAppSidebar } from './AppSidebarContext';
import { Search } from 'lucide-react';
import { buildCommandPaletteActions, buildCommandPalettePages } from '@/lib/dashboard/command-palette';

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const t = useTranslations('commandPalette');
  const pathname = usePathname();
  const { leagueId: contextLeagueId, seasonId } = useAppSidebar();

  const pathLeagueId = React.useMemo(() => {
    const match = pathname.match(/\/dashboard\/leagues\/([0-9a-f-]{36})/i);
    return match ? match[1] : null;
  }, [pathname]);
  const effectiveLeagueId = pathLeagueId ?? contextLeagueId;

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
    () => buildCommandPalettePages({ t, leagueId: effectiveLeagueId, seasonId }),
    [t, effectiveLeagueId, seasonId]
  );

  const actions = React.useMemo(
    () => buildCommandPaletteActions({ t, leagueId: effectiveLeagueId }),
    [t, effectiveLeagueId]
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
