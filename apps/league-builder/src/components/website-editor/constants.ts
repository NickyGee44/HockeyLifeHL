import type { ViewportSize, EditorPanel } from './types';

export const VIEWPORT_WIDTHS: Record<ViewportSize, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

export const DEFAULT_COLORS = {
  primary: '#1E40AF',
  secondary: '#3B82F6',
  accent: '#FFD700',
} as const;

export const DEFAULT_VISIBLE_PAGES: Record<string, boolean> = {
  scores: true,
  schedule: true,
  standings: true,
  teams: true,
  stats: true,
  about: true,
};

export const COLOR_PRESETS = [
  {
    name: 'classicBlue',
    primary: '#1E40AF',
    secondary: '#3B82F6',
    accent: '#FFD700',
  },
  {
    name: 'forestGreen',
    primary: '#166534',
    secondary: '#22C55E',
    accent: '#FDE68A',
  },
  {
    name: 'boldRed',
    primary: '#991B1B',
    secondary: '#EF4444',
    accent: '#FCD34D',
  },
  {
    name: 'royalPurple',
    primary: '#581C87',
    secondary: '#A855F7',
    accent: '#F0ABFC',
  },
  {
    name: 'sunsetOrange',
    primary: '#9A3412',
    secondary: '#F97316',
    accent: '#FDE047',
  },
  {
    name: 'midnight',
    primary: '#0F172A',
    secondary: '#334155',
    accent: '#38BDF8',
  },
] as const;

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Rajdhani', label: 'Rajdhani' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Sora', label: 'Sora' },
  { value: 'Poppins', label: 'Poppins' },
] as const;

export const PANEL_CONFIG: Array<{
  id: EditorPanel;
  icon: string;
  i18nKey: string;
}> = [
  { id: 'theme', icon: 'Palette', i18nKey: 'theme' },
  { id: 'images', icon: 'Image', i18nKey: 'images' },
  { id: 'content', icon: 'Type', i18nKey: 'content' },
  { id: 'navigation', icon: 'Navigation', i18nKey: 'navigation' },
  { id: 'social', icon: 'Share2', i18nKey: 'social' },
  { id: 'seo', icon: 'Search', i18nKey: 'seo' },
  { id: 'advanced', icon: 'Code', i18nKey: 'advanced' },
];
