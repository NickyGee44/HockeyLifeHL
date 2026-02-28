'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, FileText, Link2, Plus, Trash2 } from 'lucide-react';
import { useEditor } from '../EditorContext';
import { DEFAULT_VISIBLE_PAGES } from '../constants';
import { useTranslations } from 'next-intl';

const PAGE_KEYS = Object.keys(DEFAULT_VISIBLE_PAGES);

interface NavigationPanelProps {
  leagueId: string;
}

interface CustomPage {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
}

export function NavigationPanel({ leagueId }: NavigationPanelProps) {
  const { state, setField } = useEditor();
  const t = useTranslations('websiteEditor.navigation');
  const navItems = state.navItems ?? [];
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pagesError, setPagesError] = useState('');
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalLabel, setExternalLabel] = useState('');
  const [externalHref, setExternalHref] = useState('');
  const [showPageForm, setShowPageForm] = useState(false);
  const [selectedPageSlug, setSelectedPageSlug] = useState('');

  const togglePage = (page: string) => {
    setField('visiblePages', {
      ...state.visiblePages,
      [page]: !state.visiblePages[page],
    });
  };

  const setNavItems = (items: typeof navItems) => {
    setField('navItems', items);
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= navItems.length) return;
    const nextItems = [...navItems];
    const current = nextItems[index];
    nextItems[index] = nextItems[nextIndex];
    nextItems[nextIndex] = current;
    setNavItems(nextItems);
  };

  const deleteNavItem = (index: number) => {
    setNavItems(navItems.filter((_, i) => i !== index));
  };

  const addExternalLink = () => {
    const label = externalLabel.trim();
    const href = externalHref.trim();
    if (!label || !href) return;

    setNavItems([
      ...navItems,
      {
        label,
        href,
        isExternal: true,
      },
    ]);
    setExternalLabel('');
    setExternalHref('');
    setShowExternalForm(false);
  };

  const addPageLink = () => {
    const page = customPages.find((item) => item.slug === selectedPageSlug);
    if (!page) return;

    setNavItems([
      ...navItems,
      {
        label: page.title,
        href: `/${page.slug}`,
        isCustomPage: true,
        pageSlug: page.slug,
      },
    ]);
    setSelectedPageSlug('');
    setShowPageForm(false);
  };

  useEffect(() => {
    if (!leagueId) {
      setCustomPages([]);
      return;
    }

    const controller = new AbortController();
    setIsLoadingPages(true);
    setPagesError('');

    async function fetchCustomPages() {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/custom-pages`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error('Failed to load custom pages');
        }

        const data = (await res.json()) as CustomPage[];
        setCustomPages(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setPagesError('Could not load custom pages');
        }
      } finally {
        setIsLoadingPages(false);
      }
    }

    fetchCustomPages();
    return () => controller.abort();
  }, [leagueId]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white">{t('title')}</h3>
        <p className="mt-1 text-xs text-neutral-400">{t('subtitle')}</p>
      </div>

      <div className="space-y-2">
        {PAGE_KEYS.map((page) => {
          const isEnabled = state.visiblePages[page] ?? true;

          return (
            <div
              key={page}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-neutral-800 px-4 py-3"
            >
              <span className="text-sm font-medium text-neutral-300">
                {t(page)}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => togglePage(page)}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rink-500/20 focus:ring-offset-2 focus:ring-offset-neutral-900
                  ${isEnabled ? 'bg-rink-500' : 'bg-neutral-600'}
                `}
              >
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
                    transition duration-200 ease-in-out
                    ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-white/10 space-y-3">
        <div>
          <h4 className="text-sm font-medium text-white">Custom Navigation Links</h4>
          <p className="mt-1 text-xs text-neutral-400">
            Add external URLs or links to your custom pages.
          </p>
        </div>

        <div className="space-y-2">
          {navItems.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-neutral-800 px-4 py-3 text-xs text-neutral-400">
              No custom navigation links yet.
            </div>
          ) : (
            navItems.map((item, index) => {
              const typeLabel = item.isExternal ? 'External' : item.isCustomPage ? 'Page' : 'Link';
              const hrefOrSlug = item.pageSlug ? `/${item.pageSlug}` : item.href;
              return (
                <div
                  key={`${item.label}-${item.href}-${index}`}
                  className="rounded-lg border border-white/10 bg-neutral-800 px-4 py-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-100 truncate">{item.label}</p>
                      <p className="text-xs text-neutral-400 truncate">{hrefOrSlug}</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-white/10 bg-neutral-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-300">
                      {typeLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveNavItem(index, 'up')}
                      disabled={index === 0}
                      className="rounded-md border border-white/10 bg-neutral-900 p-1.5 text-neutral-300 hover:text-white disabled:opacity-40"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveNavItem(index, 'down')}
                      disabled={index === navItems.length - 1}
                      className="rounded-md border border-white/10 bg-neutral-900 p-1.5 text-neutral-300 hover:text-white disabled:opacity-40"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNavItem(index)}
                      className="rounded-md border border-red-500/30 bg-red-500/10 p-1.5 text-red-300 hover:text-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowExternalForm((prev) => !prev);
              setShowPageForm(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Add External Link
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPageForm((prev) => !prev);
              setShowExternalForm(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
          >
            <FileText className="h-3.5 w-3.5" />
            Add Page Link
          </button>
        </div>

        {showExternalForm && (
          <div className="rounded-lg border border-white/10 bg-neutral-800 p-3 space-y-2">
            <input
              type="text"
              value={externalLabel}
              onChange={(e) => setExternalLabel(e.target.value)}
              placeholder="Label"
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20 outline-none"
            />
            <input
              type="url"
              value={externalHref}
              onChange={(e) => setExternalHref(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20 outline-none"
            />
            <button
              type="button"
              onClick={addExternalLink}
              disabled={!externalLabel.trim() || !externalHref.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rink-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        )}

        {showPageForm && (
          <div className="rounded-lg border border-white/10 bg-neutral-800 p-3 space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
              <Link2 className="h-3.5 w-3.5" />
              Select custom page
            </label>
            <select
              value={selectedPageSlug}
              onChange={(e) => setSelectedPageSlug(e.target.value)}
              disabled={isLoadingPages || customPages.length === 0}
              className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20 outline-none disabled:opacity-50"
            >
              <option value="">
                {isLoadingPages ? 'Loading pages...' : 'Choose a page'}
              </option>
              {customPages.map((page) => (
                <option key={page.id} value={page.slug}>
                  {page.title} ({page.slug})
                </option>
              ))}
            </select>
            {pagesError && <p className="text-xs text-red-300">{pagesError}</p>}
            <button
              type="button"
              onClick={addPageLink}
              disabled={!selectedPageSlug}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rink-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
