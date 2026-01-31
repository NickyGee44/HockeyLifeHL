'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    const root = document.documentElement;

    // Set league colors as CSS variables
    root.style.setProperty('--league-primary', theme.primaryColor);
    root.style.setProperty('--league-secondary', theme.secondaryColor);
    root.style.setProperty('--league-accent', theme.accentColor);

    // Calculate a hover color (slightly darker)
    const hoverColor = adjustBrightness(theme.primaryColor, -15);
    root.style.setProperty('--league-primary-hover', hoverColor);

    // Calculate glow color (primary with transparency)
    const glowColor = hexToRgba(theme.primaryColor, 0.2);
    root.style.setProperty('--league-glow-color', glowColor);

    // Add league theme attribute
    root.setAttribute('data-league-theme', 'true');

    return () => {
      // Cleanup on unmount
      root.style.removeProperty('--league-primary');
      root.style.removeProperty('--league-secondary');
      root.style.removeProperty('--league-accent');
      root.style.removeProperty('--league-primary-hover');
      root.style.removeProperty('--league-glow-color');
      root.removeAttribute('data-league-theme');
    };
  }, [theme]);

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
