'use client';

import { useEditor } from '../EditorContext';
import { Facebook, Twitter, Instagram, Youtube, Music2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { EditorState } from '../types';
import type { LucideIcon } from 'lucide-react';

const SOCIAL_FIELDS: Array<{
  key: keyof EditorState;
  i18nKey: string;
  placeholder: string;
  icon: LucideIcon;
}> = [
  {
    key: 'socialFacebook',
    i18nKey: 'facebook',
    placeholder: 'https://facebook.com/your-league',
    icon: Facebook,
  },
  {
    key: 'socialTwitter',
    i18nKey: 'twitter',
    placeholder: 'https://x.com/your-league',
    icon: Twitter,
  },
  {
    key: 'socialInstagram',
    i18nKey: 'instagram',
    placeholder: 'https://instagram.com/your-league',
    icon: Instagram,
  },
  {
    key: 'socialYoutube',
    i18nKey: 'youtube',
    placeholder: 'https://youtube.com/@your-league',
    icon: Youtube,
  },
  {
    key: 'socialTiktok',
    i18nKey: 'tiktok',
    placeholder: 'https://tiktok.com/@your-league',
    icon: Music2,
  },
];

export function SocialLinksPanel() {
  const { state, setField } = useEditor();
  const t = useTranslations('websiteEditor.social');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white">{t('title')}</h3>
        <p className="mt-1 text-xs text-neutral-400">{t('subtitle')}</p>
      </div>

      <div className="space-y-4">
        {SOCIAL_FIELDS.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.key} className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                <Icon className="h-4 w-4 text-neutral-400" />
                {t(field.i18nKey)}
              </label>
              <input
                type="url"
                value={(state[field.key] as string) || ''}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 bg-neutral-800 border border-white/10 rounded-lg text-sm text-neutral-300 placeholder:text-neutral-500 focus:border-rink-500 focus:ring-1 focus:ring-rink-500/20 outline-none transition-colors"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
