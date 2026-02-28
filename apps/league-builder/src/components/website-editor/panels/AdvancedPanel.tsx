'use client';

import { useEditor } from '../EditorContext';
import { useTranslations } from 'next-intl';

export function AdvancedPanel() {
  const { state, setField } = useEditor();
  const t = useTranslations('websiteEditor.advanced');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white">{t('title')}</h3>
        <p className="mt-1 text-xs text-neutral-400">{t('subtitle')}</p>
      </div>

      {/* Custom CSS */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-300">
          {t('customCss')}
        </label>
        <p className="text-xs text-neutral-500">{t('customCssDescription')}</p>
        <textarea
          value={state.customCss}
          onChange={(e) => setField('customCss', e.target.value)}
          placeholder="/* Add your custom CSS here */"
          rows={10}
          spellCheck={false}
          className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20 outline-none transition-colors resize-y font-mono leading-relaxed"
        />
      </div>

      {/* Public Visibility Toggle */}
      <div className="rounded-lg border border-white/10 bg-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-300">
              {t('visibility')}
            </label>
            <p className="text-xs text-neutral-500">
              {t('visibilityDescription')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">
              {state.isPublic ? t('visibilityPublic') : t('visibilityPrivate')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={state.isPublic}
              onClick={() => setField('isPublic', !state.isPublic)}
              className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rink-500/20 focus:ring-offset-2 focus:ring-offset-neutral-900
                ${state.isPublic ? 'bg-rink-500' : 'bg-neutral-600'}
              `}
            >
              <span
                aria-hidden="true"
                className={`
                  pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
                  transition duration-200 ease-in-out
                  ${state.isPublic ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-300">
              Game Score Ticker
            </label>
            <p className="text-xs text-neutral-500">
              Show a scrolling ticker of today&apos;s games at the top of your site
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={state.showGameTicker}
            onClick={() => setField('showGameTicker', !state.showGameTicker)}
            className={`
              relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rink-500/20 focus:ring-offset-2 focus:ring-offset-neutral-900
              ${state.showGameTicker ? 'bg-rink-500' : 'bg-neutral-600'}
            `}
          >
            <span
              aria-hidden="true"
              className={`
                pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
                transition duration-200 ease-in-out
                ${state.showGameTicker ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
