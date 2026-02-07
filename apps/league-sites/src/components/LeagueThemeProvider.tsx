'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import type { LeagueTheme } from '@/lib/types';

interface LeagueThemeProviderProps {
  theme: LeagueTheme;
  children: React.ReactNode;
}

/**
 * Applies league-specific theme colors via CSS custom properties
 *
 * This component sets CSS variables on the document root to override
 * the default gold/black theme with league-specific colors.
 */
export function LeagueThemeProvider({ theme, children }: LeagueThemeProviderProps) {
  const { setTheme } = useTheme();

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return;
    }

    const defaultVisitorTheme = theme.templateVariant === 'light' ? 'light' : 'dark';
    setTheme(defaultVisitorTheme);
  }, [theme.templateVariant, setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const previousTemplateVariant = root.getAttribute('data-league-template');
    const previousLeagueTheme = root.getAttribute('data-league-theme');

    // Set league colors as CSS variables
    root.style.setProperty('--league-primary', theme.primaryColor);
    root.style.setProperty('--league-secondary', theme.secondaryColor);
    root.style.setProperty('--league-accent', theme.accentColor);
    root.style.setProperty('--league-font-family', theme.fontFamily);

    // Calculate a hover color (slightly darker)
    const hoverColor = adjustBrightness(theme.primaryColor, -15);
    root.style.setProperty('--league-primary-hover', hoverColor);

    // Calculate glow color (primary with transparency)
    const glowColor = hexToRgba(theme.primaryColor, 0.2);
    root.style.setProperty('--league-glow-color', glowColor);
    root.style.setProperty('--color-accent-text', getContrastTextColor(theme.primaryColor));
    root.style.setProperty('--league-secondary-contrast', getContrastTextColor(theme.secondaryColor));

    // Add league theme attributes (data-theme is owned by next-themes for visitor toggle)
    root.setAttribute('data-league-theme', 'true');
    root.setAttribute('data-league-template', theme.templateVariant);

    return () => {
      // Cleanup on unmount
      root.style.removeProperty('--league-primary');
      root.style.removeProperty('--league-secondary');
      root.style.removeProperty('--league-accent');
      root.style.removeProperty('--league-font-family');
      root.style.removeProperty('--league-primary-hover');
      root.style.removeProperty('--league-glow-color');
      root.style.removeProperty('--color-accent-text');
      root.style.removeProperty('--league-secondary-contrast');

      if (previousLeagueTheme === null) {
        root.removeAttribute('data-league-theme');
      } else {
        root.setAttribute('data-league-theme', previousLeagueTheme);
      }

      if (previousTemplateVariant === null) {
        root.removeAttribute('data-league-template');
      } else {
        root.setAttribute('data-league-template', previousTemplateVariant);
      }

    };
  }, [theme.primaryColor, theme.secondaryColor, theme.accentColor, theme.fontFamily, theme.templateVariant]);

  return <>{children}</>;
}

/**
 * Adjust brightness of a hex color
 */
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/**
 * Convert hex to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastTextColor(hex: string): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return '#ffffff';

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? '#0a0a0a' : '#ffffff';
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const trimmed = hex.trim();
  if (!trimmed.startsWith('#')) return null;

  let normalized = trimmed.slice(1);
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}
