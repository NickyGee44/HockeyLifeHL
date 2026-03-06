'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useEditor } from '../EditorContext';
import type { PreviewThemePayload } from '../types';
import { getWebsiteEditorPreviewOrigin } from '@/lib/website-editor/preview';

/**
 * Must be called exactly ONCE in EditorShell.
 * Reads the shared iframeRef from EditorContext so the same ref is used
 * for both rendering (EditorPreview) and sending messages.
 *
 * Sends the FULL editor state to the preview iframe on every change so
 * the preview can do a complete state replacement (no partial merging).
 */
export function usePreviewMessaging() {
  const { state, setPreviewReady, previewUrl, iframeRef } = useEditor();
  const versionRef = useRef(0);

  const previewOrigin = useMemo(() => {
    return getWebsiteEditorPreviewOrigin(previewUrl);
  }, [previewUrl]);

  // Listen for PREVIEW_READY from iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (previewOrigin && event.origin !== previewOrigin) {
        return;
      }
      if (event.data?.type === 'PREVIEW_READY') {
        setPreviewReady(true);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [previewOrigin, setPreviewReady]);

  // Send the complete editor state to the preview iframe
  const sendThemeUpdate = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !state.isPreviewReady) return;

    versionRef.current += 1;

    const payload: PreviewThemePayload = {
      version: versionRef.current,

      // Theme
      primaryColor: state.primaryColor,
      secondaryColor: state.secondaryColor,
      accentColor: state.accentColor,
      themePreset: state.themePreset,
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

      // Navigation
      visiblePages: state.visiblePages,
      navItems: state.navItems,
      showGameTicker: state.showGameTicker,

      // Social
      socialFacebook: state.socialFacebook,
      socialTwitter: state.socialTwitter,
      socialInstagram: state.socialInstagram,
      socialYoutube: state.socialYoutube,
      socialTiktok: state.socialTiktok,

      // SEO
      seoTitle: state.seoTitle,
      seoDescription: state.seoDescription,

      // Advanced
      customCss: state.customCss,
      isPublic: state.isPublic,
    };

    const origin = previewOrigin || window.location.origin;
    iframeRef.current.contentWindow.postMessage(
      { type: 'PREVIEW_THEME_UPDATE', payload },
      origin,
    );
  }, [state, previewOrigin, iframeRef]);

  // Auto-send theme updates when relevant state changes
  useEffect(() => {
    sendThemeUpdate();
  }, [sendThemeUpdate]);
}
