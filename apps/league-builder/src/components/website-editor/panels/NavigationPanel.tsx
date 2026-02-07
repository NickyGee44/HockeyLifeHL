'use client';

import { useEditor } from '../EditorContext';
import { DEFAULT_VISIBLE_PAGES } from '../constants';
import { useTranslations } from 'next-intl';

const PAGE_KEYS = Object.keys(DEFAULT_VISIBLE_PAGES);

export function NavigationPanel() {
  const { state, setField } = useEditor();
  const t = useTranslations('websiteEditor.navigation');

  const togglePage = (page: string) => {
    setField('visiblePages', {
      ...state.visiblePages,
      [page]: !state.visiblePages[page],
    });
  };

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
    </div>
  );
}
