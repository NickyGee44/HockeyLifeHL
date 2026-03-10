import type { ThemePreset } from './types';

const DEFAULT_PRIMARY = '#D4AF37';
const DEFAULT_SECONDARY = '#1A1A1A';
const DEFAULT_ACCENT = '#D4AF37';
const DARK_BASE = '#08111F';

type RgbColor = { r: number; g: number; b: number };

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const raw = normalized.slice(1);

  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
      .toUpperCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }

  return fallback;
}

export function getBalancedLeagueColors(params: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  themePreset: ThemePreset;
}) {
  return {
    primaryColor: normalizeHexColor(params.primaryColor, DEFAULT_PRIMARY),
    secondaryColor: balanceSecondaryColor(
      normalizeHexColor(params.secondaryColor, DEFAULT_SECONDARY),
      params.themePreset
    ),
    accentColor: normalizeHexColor(params.accentColor, DEFAULT_ACCENT),
  };
}

function balanceSecondaryColor(color: string, themePreset: ThemePreset): string {
  const safeColor = normalizeHexColor(color, DEFAULT_SECONDARY);
  const rgb = parseHexColor(safeColor);
  if (!rgb) {
    return themePreset === 'light'
      ? mixHexColors(DEFAULT_SECONDARY, '#FFFFFF', 0.72)
      : mixHexColors(DEFAULT_SECONDARY, DARK_BASE, 0.58);
  }

  const luminance = getRelativeLuminance(rgb);

  if (themePreset === 'light') {
    if (luminance >= 0.72) {
      return safeColor;
    }
    if (luminance >= 0.45) {
      return mixHexColors(safeColor, '#FFFFFF', 0.42);
    }
    return mixHexColors(safeColor, '#FFFFFF', 0.68);
  }

  if (luminance <= 0.24) {
    return safeColor;
  }
  if (luminance <= 0.42) {
    return mixHexColors(safeColor, DARK_BASE, 0.34);
  }
  return mixHexColors(safeColor, DARK_BASE, 0.58);
}

function mixHexColors(from: string, to: string, ratio: number): string {
  const start = parseHexColor(from) ?? parseHexColor(DEFAULT_PRIMARY)!;
  const end = parseHexColor(to) ?? parseHexColor(DARK_BASE)!;
  const clamped = Math.max(0, Math.min(1, ratio));

  return rgbToHex({
    r: Math.round(start.r + (end.r - start.r) * clamped),
    g: Math.round(start.g + (end.g - start.g) * clamped),
    b: Math.round(start.b + (end.b - start.b) * clamped),
  });
}

function rgbToHex(rgb: RgbColor): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function parseHexColor(hex: string): RgbColor | null {
  const normalized = normalizeHexColor(hex, '');
  if (!normalized) {
    return null;
  }

  const raw = normalized.slice(1);
  if (!/^[0-9A-F]{6}$/.test(raw)) {
    return null;
  }

  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function getRelativeLuminance({ r, g, b }: RgbColor): number {
  const channels = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
