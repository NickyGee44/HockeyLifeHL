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

    applyLeagueCssVariables(root, theme);

    // Add league theme attributes (data-theme is owned by next-themes for visitor toggle)
    root.setAttribute('data-league-theme', 'true');
    root.setAttribute('data-league-template', theme.templateVariant);

    return () => {
      // Cleanup on unmount
      for (const property of LEAGUE_THEME_CSS_PROPERTIES) {
        root.style.removeProperty(property);
      }

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

const LEAGUE_THEME_CSS_PROPERTIES = [
  '--league-primary-raw',
  '--league-secondary-raw',
  '--league-accent-raw',
  '--league-primary',
  '--league-secondary',
  '--league-accent',
  '--league-primary-strong',
  '--league-primary-soft',
  '--league-primary-border',
  '--league-primary-muted',
  '--league-secondary-safe',
  '--league-on-primary',
  '--league-on-secondary',
  '--league-surface-tint',
  '--league-surface-tint-strong',
  '--league-font-family',
  '--league-primary-hover',
  '--league-glow-color',
  '--color-accent-text',
  '--league-secondary-contrast',
  '--league-ambient-color',
  '--league-ambient-soft',
  '--league-ambient-strong',
] as const;

function applyLeagueCssVariables(root: HTMLElement, theme: LeagueTheme) {
  const ambientColor = pickAmbientColor(theme.primaryColor, theme.secondaryColor);

  root.style.setProperty('--league-primary-raw', theme.primaryColor);
  root.style.setProperty('--league-secondary-raw', theme.secondaryColor);
  root.style.setProperty('--league-accent-raw', theme.accentColor);
  root.style.setProperty('--league-primary', theme.primaryStrong);
  root.style.setProperty('--league-secondary', theme.secondarySafe);
  root.style.setProperty('--league-accent', theme.primaryStrong);
  root.style.setProperty('--league-primary-strong', theme.primaryStrong);
  root.style.setProperty('--league-primary-soft', theme.primarySoft);
  root.style.setProperty('--league-primary-border', theme.primaryBorder);
  root.style.setProperty('--league-primary-muted', theme.primaryMuted);
  root.style.setProperty('--league-secondary-safe', theme.secondarySafe);
  root.style.setProperty('--league-on-primary', theme.onPrimary);
  root.style.setProperty('--league-on-secondary', theme.onSecondary);
  root.style.setProperty('--league-surface-tint', theme.surfaceTint);
  root.style.setProperty('--league-surface-tint-strong', theme.surfaceTintStrong);
  root.style.setProperty('--league-font-family', theme.fontFamily);
  root.style.setProperty('--league-primary-hover', theme.primaryStrong);
  root.style.setProperty('--league-glow-color', theme.primarySoft);
  root.style.setProperty('--color-accent-text', theme.onPrimary);
  root.style.setProperty('--league-secondary-contrast', theme.onSecondary);
  root.style.setProperty('--league-ambient-color', ambientColor);
  root.style.setProperty('--league-ambient-soft', withAlpha(ambientColor, 0.16));
  root.style.setProperty('--league-ambient-strong', withAlpha(ambientColor, 0.3));
}

function pickAmbientColor(primaryColor: string, secondaryColor: string) {
  if (!isNearBlack(primaryColor)) {
    return primaryColor;
  }

  if (!isNearBlack(secondaryColor)) {
    return secondaryColor;
  }

  return '#d9d9d6';
}

function isNearBlack(color: string) {
  const rgb = parseColor(color);
  if (!rgb) return false;

  const luminance = (0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b);
  return luminance < 48;
}

function withAlpha(color: string, alpha: number) {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function parseColor(color: string) {
  const value = color.trim();

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const normalized = hex.length === 3
      ? hex.split('').map((char) => char + char).join('')
      : hex.length >= 6
        ? hex.slice(0, 6)
        : null;

    if (!normalized) return null;

    const int = Number.parseInt(normalized, 16);
    if (Number.isNaN(int)) return null;

    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  }

  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;

  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) {
    return null;
  }

  return {
    r: Math.max(0, Math.min(255, parts[0])),
    g: Math.max(0, Math.min(255, parts[1])),
    b: Math.max(0, Math.min(255, parts[2])),
  };
}
