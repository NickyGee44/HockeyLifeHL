'use client';

import { useEffect, useState, createContext, useContext } from 'react';

interface PreviewTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
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
 *   payload: { primaryColor, secondaryColor, accentColor, logoUrl?, bannerUrl? }
 * }
 */
export function PreviewModeProvider({ children }: PreviewModeProviderProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [theme, setTheme] = useState<PreviewTheme | null>(null);

  useEffect(() => {
    // Check if we're in an iframe (preview mode)
    const inIframe = window.self !== window.top;

    // Also check for ?preview=true in URL
    const urlParams = new URLSearchParams(window.location.search);
    const previewParam = urlParams.get('preview') === 'true';

    if (inIframe || previewParam) {
      setIsPreviewMode(true);

      // Send ready message to parent
      window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
    }

    const handleMessage = (event: MessageEvent) => {
      // Validate message origin in production
      // For now, accept messages from any origin during development

      if (event.data?.type === 'PREVIEW_THEME_UPDATE') {
        const payload = event.data.payload as PreviewTheme;

        // Apply theme to CSS variables immediately
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
 * Apply theme colors to document CSS variables
 */
function applyThemeToDocument(theme: PreviewTheme): void {
  const root = document.documentElement;

  // Set league colors as CSS variables
  root.style.setProperty('--league-primary', theme.primaryColor);
  root.style.setProperty('--league-secondary', theme.secondaryColor);
  root.style.setProperty('--league-accent', theme.accentColor);

  // Calculate hover color (slightly darker)
  const hoverColor = adjustBrightness(theme.primaryColor, -15);
  root.style.setProperty('--league-primary-hover', hoverColor);

  // Calculate glow color (primary with transparency)
  const glowColor = hexToRgba(theme.primaryColor, 0.2);
  root.style.setProperty('--league-glow-color', glowColor);

  // Mark as preview mode
  root.setAttribute('data-preview-mode', 'true');
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
