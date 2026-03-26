'use client';

import { useEffect, useState, useRef, createContext, useContext } from 'react';
import type { ThemePreset } from '@/lib/types';
import { getBalancedLeagueColors } from '@/lib/theme-palette';

/**
 * Full preview theme state received from the website editor via postMessage.
 * This mirrors the PreviewThemePayload from league-builder so the preview can
 * do a complete state replacement on every message (no partial merging).
 */
export interface PreviewTheme {
  /** Monotonically increasing counter; stale messages are discarded */
  version: number;

  // Theme
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themePreset: ThemePreset;
  fontFamily: string;

  // Images
  logoUrl: string | null;
  bannerUrl: string | null;
  faviconUrl: string | null;

  // Content
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;

  // Navigation
  visiblePages: Record<string, boolean>;

  // Social
  socialFacebook: string;
  socialTwitter: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;

  // SEO
  seoTitle: string;
  seoDescription: string;

  // Advanced
  customCss: string;
  isPublic: boolean;
}

interface PreviewModeContextType {
  isPreviewMode: boolean;
  theme: PreviewTheme | null;
}

const PreviewModeContext = createContext<PreviewModeContextType>({
  isPreviewMode: false,
  theme: null,
});

export const usePreviewMode = () => useContext(PreviewModeContext);

interface PreviewModeProviderProps {
  children: React.ReactNode;
}

/**
 * PreviewModeProvider listens for postMessage events from the parent window
 * (Platform 1 website editor) to apply real-time theme changes.
 *
 * Message format:
 * {
 *   type: 'PREVIEW_THEME_UPDATE',
 *   payload: PreviewTheme (full state, with version counter)
 * }
 *
 * Each message fully REPLACES the previous preview state. Stale messages
 * (lower version) are discarded.
 */
export function PreviewModeProvider({ children }: PreviewModeProviderProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [theme, setTheme] = useState<PreviewTheme | null>(null);
  const latestVersionRef = useRef(0);

  useEffect(() => {
    // Check if we're in an iframe (preview mode)
    const inIframe = window.self !== window.top;

    // Also check for ?preview=true in URL
    const urlParams = new URLSearchParams(window.location.search);
    const previewParam = urlParams.get('preview') === 'true';

    if (inIframe || previewParam) {
      setIsPreviewMode(true); // eslint-disable-line -- client-only iframe detection

      // Send ready message to parent
      const parentOrigin = getOriginFromUrl(document.referrer);
      window.parent.postMessage({ type: 'PREVIEW_READY' }, parentOrigin || '*');
    }

    const allowedOrigins = new Set<string>();
    const referrerOrigin = getOriginFromUrl(document.referrer);
    if (referrerOrigin) {
      allowedOrigins.add(referrerOrigin);
    }
    for (const configured of [
      process.env.NEXT_PUBLIC_LEAGUE_BUILDER_URL,
      process.env.NEXT_PUBLIC_PLATFORM1_URL,
      process.env.NEXT_PUBLIC_APP_URL,
    ]) {
      const origin = getOriginFromUrl(configured);
      if (origin) {
        allowedOrigins.add(origin);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (allowedOrigins.size > 0 && !allowedOrigins.has(event.origin)) {
        return;
      }

      if (event.data?.type === 'PREVIEW_THEME_UPDATE') {
        const payload = event.data.payload as PreviewTheme;

        // Discard stale messages (lower or equal version)
        if (typeof payload.version === 'number' && payload.version <= latestVersionRef.current) {
          return;
        }
        if (typeof payload.version === 'number') {
          latestVersionRef.current = payload.version;
        }

        // Full replacement of preview state
        applyThemeToDocument(payload);
        setTheme(payload);
      }

      if (event.data?.type === 'PREVIEW_SCROLL_TO') {
        const section = event.data.payload?.section as string;
        const element = document.getElementById(section);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <PreviewModeContext.Provider value={{ isPreviewMode, theme }}>
      {children}
    </PreviewModeContext.Provider>
  );
}

/**
 * Apply the full theme payload to document CSS variables and attributes.
 * This is a deterministic full replacement -- every supported property is set.
 */
function applyThemeToDocument(theme: PreviewTheme): void {
  const root = document.documentElement;
  const derivedColors = getBalancedLeagueColors({
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    themePreset: normalizeThemePreset(theme.themePreset),
  });

  // Set league colors as CSS variables
  root.style.setProperty('--league-primary-raw', derivedColors.primaryColor);
  root.style.setProperty('--league-secondary-raw', derivedColors.secondaryColor);
  root.style.setProperty('--league-accent-raw', derivedColors.accentColor);
  root.style.setProperty('--league-primary', derivedColors.primaryStrong);
  root.style.setProperty('--league-secondary', derivedColors.secondarySafe);
  root.style.setProperty('--league-accent', derivedColors.primaryStrong);
  root.style.setProperty('--league-primary-strong', derivedColors.primaryStrong);
  root.style.setProperty('--league-primary-soft', derivedColors.primarySoft);
  root.style.setProperty('--league-primary-border', derivedColors.primaryBorder);
  root.style.setProperty('--league-primary-muted', derivedColors.primaryMuted);
  root.style.setProperty('--league-secondary-safe', derivedColors.secondarySafe);
  root.style.setProperty('--league-on-primary', derivedColors.onPrimary);
  root.style.setProperty('--league-on-secondary', derivedColors.onSecondary);
  root.style.setProperty('--league-surface-tint', derivedColors.surfaceTint);
  root.style.setProperty('--league-surface-tint-strong', derivedColors.surfaceTintStrong);
  root.setAttribute('data-league-template', normalizeThemePreset(theme.themePreset));

  root.style.setProperty('--league-primary-hover', derivedColors.primaryStrong);
  root.style.setProperty('--league-glow-color', derivedColors.primarySoft);
  root.style.setProperty('--color-accent-text', derivedColors.onPrimary);
  root.style.setProperty('--league-secondary-contrast', derivedColors.onSecondary);

  // Set font family
  if (theme.fontFamily) {
    root.style.setProperty('--league-font-family', theme.fontFamily);
  }

  // Inject / update custom CSS
  const styleId = 'preview-custom-css';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (theme.customCss) {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = theme.customCss;
  } else if (styleEl) {
    // Clear custom CSS if empty string provided
    styleEl.textContent = '';
  }

  // Update favicon if provided
  if (theme.faviconUrl) {
    let faviconEl = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!faviconEl) {
      faviconEl = document.createElement('link');
      faviconEl.rel = 'icon';
      document.head.appendChild(faviconEl);
    }
    faviconEl.href = theme.faviconUrl;
  }

  // Mark as preview mode
  root.setAttribute('data-preview-mode', 'true');
}

function getOriginFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function normalizeThemePreset(preset: PreviewTheme['themePreset']): 'dark' | 'light' | 'custom' {
  if (preset === 'light' || preset === 'custom') {
    return preset;
  }
  return 'dark';
}
