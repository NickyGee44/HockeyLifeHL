'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { updateLeagueBranding } from '@/lib/actions/organization';
import { useEditor } from '../EditorContext';

export function useEditorSave() {
  const { state, setSaving, markClean } = useEditor();

  const save = useCallback(async () => {
    if (state.isSaving || !state.selectedLeagueId) return;
    setSaving(true);

    try {
      const websiteSettings = {
        themePreset: state.themePreset,
        socialFacebook: state.socialFacebook,
        socialTwitter: state.socialTwitter,
        socialInstagram: state.socialInstagram,
        socialYoutube: state.socialYoutube,
        socialTiktok: state.socialTiktok,
        visiblePages: state.visiblePages,
        seoTitle: state.seoTitle,
        seoDescription: state.seoDescription,
      };

      const result = await updateLeagueBranding({
        leagueId: state.selectedLeagueId,

        // Theme
        primaryColor: state.primaryColor,
        secondaryColor: state.secondaryColor,
        accentColor: state.accentColor,
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
        toast.success('Changes saved successfully!');
        markClean();
      } else {
        toast.error(result.error || 'Failed to save changes');
      }
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [state, setSaving, markClean]);

  return { save, isSaving: state.isSaving };
}
