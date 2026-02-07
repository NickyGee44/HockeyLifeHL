'use client';

import { useEditor } from '../EditorContext';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

const SEO_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 160;

export function SeoPanel() {
  const { state, setField, previewBaseUrl } = useEditor();
  const t = useTranslations('websiteEditor.seo');

  const selectedLeague = useMemo(
    () => state.leagues.find((l) => l.id === state.selectedLeagueId),
    [state.leagues, state.selectedLeagueId],
  );

  const previewUrl = useMemo(() => {
    const slug = selectedLeague?.slug ?? 'your-league';
    return `${previewBaseUrl}/${slug}`;
  }, [selectedLeague, previewBaseUrl]);

  const displayTitle =
    state.seoTitle || selectedLeague?.name || 'Your League';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white">{t('title')}</h3>
        <p className="mt-1 text-xs text-neutral-400">{t('subtitle')}</p>
      </div>

      {/* Page Title */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-300">
          {t('pageTitle')}
        </label>
        <p className="text-xs text-neutral-500">{t('pageTitleDescription')}</p>
        <input
          type="text"
          value={state.seoTitle}
          onChange={(e) => setField('seoTitle', e.target.value)}
          placeholder={t('pageTitlePlaceholder')}
          maxLength={SEO_TITLE_MAX}
          className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20 outline-none transition-colors"
        />
        <p className="text-xs text-neutral-500 text-right">
          {state.seoTitle.length}/{SEO_TITLE_MAX}
        </p>
      </div>

      {/* Meta Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-300">
          {t('metaDescription')}
        </label>
        <p className="text-xs text-neutral-500">
          {t('metaDescriptionDescription')}
        </p>
        <textarea
          value={state.seoDescription}
          onChange={(e) => setField('seoDescription', e.target.value)}
          placeholder={t('metaDescriptionPlaceholder')}
          maxLength={META_DESCRIPTION_MAX}
          rows={3}
          className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20 outline-none transition-colors resize-none"
        />
        <p className="text-xs text-neutral-500 text-right">
          {state.seoDescription.length}/{META_DESCRIPTION_MAX}
        </p>
      </div>

      {/* Google Preview Card */}
      <div className="rounded-lg border border-white/10 bg-neutral-800 p-4 space-y-1">
        <p className="text-xs text-neutral-500">{t('searchPreview')}</p>
        <p className="text-sm text-blue-400 truncate">{displayTitle}</p>
        <p className="text-xs text-green-400 truncate">{previewUrl}</p>
        <p className="text-xs text-neutral-400 line-clamp-2">
          {state.seoDescription || 'No description set'}
        </p>
      </div>
    </div>
  );
}
