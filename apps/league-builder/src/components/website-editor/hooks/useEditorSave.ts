'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { updateLeagueBranding } from '@/lib/actions/organization';
import { useEditor } from '../EditorContext';
import { normalizeHexColor } from '@/lib/website-editor/theme-palette';
import { DEFAULT_COLORS } from '../constants';

export function useEditorSave() {
  const { state, setSaving, markClean } = useEditor();
  const t = useTranslations('websiteEditor.toasts');

  const save = useCallback(async () => {
    if (state.isSaving || !state.selectedLeagueId) return;
    setSaving(true);

    try {
      const primaryColor = normalizeHexColor(state.primaryColor, DEFAULT_COLORS.primary);
      const secondaryColor = normalizeHexColor(state.secondaryColor, DEFAULT_COLORS.secondary);
      const accentColor = normalizeHexColor(state.accentColor, DEFAULT_COLORS.accent);

      const websiteSettings = {
        themePreset: state.themePreset,
        backgroundPreset: state.backgroundPreset,
        socialFacebook: state.socialFacebook,
        socialTwitter: state.socialTwitter,
        socialInstagram: state.socialInstagram,
        socialYoutube: state.socialYoutube,
        socialTiktok: state.socialTiktok,
        visiblePages: state.visiblePages,
        navItems: state.navItems,
        showGameTicker: state.showGameTicker,
        showCaptainPhone: state.showCaptainPhone,
        seoTitle: state.seoTitle,
        seoDescription: state.seoDescription,
      };

      const result = await updateLeagueBranding({
        leagueId: state.selectedLeagueId,

        // Theme
        primaryColor,
        secondaryColor,
        accentColor,
        fontFamily: state.fontFamily,

        // Images
        logoUrl: state.logoUrl,
        bannerUrl: state.bannerUrl,
        faviconUrl: state.faviconUrl,

        // Content
        tagline: state.tagline,
        description: state.description,
        contactEmail: state.contactEmail,
        contactPhone: state.contactPhone,
        websiteUrl: state.websiteUrl,

        // Advanced
        customCss: state.customCss,
        isPublic: state.isPublic,

        // JSONB settings (social, nav, SEO, theme preset)
        settings: { website: websiteSettings },
      });

      if (result.success) {
        toast.success(t('saveSuccess'));
        markClean();
      } else {
        toast.error(result.error || t('saveError'));
      }
    } catch {
      toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  }, [state, setSaving, markClean, t]);

  return { save, isSaving: state.isSaving };
}
