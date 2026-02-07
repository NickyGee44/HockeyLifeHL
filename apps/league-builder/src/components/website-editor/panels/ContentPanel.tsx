'use client';

import { Type, Mail, Phone, LinkIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEditor } from '../EditorContext';

// ---------------------------------------------------------------------------
// ContentPanel
// ---------------------------------------------------------------------------

export function ContentPanel() {
  const { state, setField } = useEditor();
  const t = useTranslations('websiteEditor.content');

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Type className="w-4 h-4 text-rink-500" />
          {t('title')}
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          {t('subtitle')}
        </p>
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">{t('tagline')}</label>
        <p className="text-xs text-neutral-500 mb-2">
          {t('taglineDescription')}
        </p>
        <input
          type="text"
          value={state.tagline}
          onChange={(e) => setField('tagline', e.target.value)}
          placeholder={t('taglinePlaceholder')}
          maxLength={60}
          className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20"
        />
        <p className="text-xs text-neutral-500 mt-1 text-right">{state.tagline.length}/60</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          {t('description')}
        </label>
        <p className="text-xs text-neutral-500 mb-2">{t('descriptionDescription')}</p>
        <textarea
          value={state.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={5}
          maxLength={500}
          className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20 resize-none"
        />
        <p className="text-xs text-neutral-500 mt-1 text-right">
          {state.description.length}/500
        </p>
      </div>

      {/* Contact info separator */}
      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-4">Contact Information</h4>

        {/* Contact Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-neutral-500" />
              {t('contactEmail')}
            </span>
          </label>
          <input
            type="email"
            value={state.contactEmail}
            onChange={(e) => setField('contactEmail', e.target.value)}
            placeholder={t('contactEmailPlaceholder')}
            className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20"
          />
        </div>

        {/* Contact Phone */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-neutral-500" />
              {t('contactPhone')}
            </span>
          </label>
          <input
            type="tel"
            value={state.contactPhone}
            onChange={(e) => setField('contactPhone', e.target.value)}
            placeholder={t('contactPhonePlaceholder')}
            className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20"
          />
        </div>

        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">
            <span className="inline-flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-neutral-500" />
              {t('websiteUrl')}
            </span>
          </label>
          <input
            type="url"
            value={state.websiteUrl}
            onChange={(e) => setField('websiteUrl', e.target.value)}
            placeholder={t('websiteUrlPlaceholder')}
            className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20"
          />
        </div>
      </div>

      {/* Tips */}
      <div className="pt-4 border-t border-white/10">
        <h4 className="text-xs font-medium text-neutral-400 mb-2">{t('tips')}</h4>
        <ul className="text-xs text-neutral-500 space-y-1 list-disc list-inside">
          <li>{t('tipTagline')}</li>
          <li>{t('tipDescription')}</li>
          <li>{t('tipSave')}</li>
        </ul>
      </div>
    </div>
  );
}
