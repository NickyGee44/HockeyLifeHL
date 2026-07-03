import type { ThemePreset } from './types';

const DEFAULT_PRIMARY = '#C0C0C0';
const DEFAULT_SECONDARY = '#1A1A1A';
const DEFAULT_ACCENT = '#C0C0C0';
const DARK_BASE = '#08111F';
const SAFE_PRIMARY_TARGET_LUMINANCE = 0.18;
const SAFE_PRIMARY_MIN_LUMINANCE = 0.16;
const SAFE_PRIMARY_MAX_LUMINANCE = 0.22;
const SAFE_SECONDARY_TARGET_LUMINANCE = 0.08;
const SAFE_SECONDARY_MAX_LUMINANCE = 0.12;

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
  const primaryColor = normalizeHexColor(params.primaryColor, DEFAULT_PRIMARY);
  const secondaryColor = balanceSecondaryColor(
    normalizeHexColor(params.secondaryColor, DEFAULT_SECONDARY),
    params.themePreset
  );
  const accentColor = normalizeHexColor(params.accentColor, DEFAULT_ACCENT);
  const primaryStrong = createReadableAccent(accentColor);
  const secondarySafe = createSafeSecondary(secondaryColor);

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    primaryStrong,
    primarySoft: hexToRgba(primaryStrong, 0.16),
    primaryBorder: hexToRgba(primaryStrong, 0.3),
    primaryMuted: hexToRgba(primaryStrong, 0.08),
    secondarySafe,
    onPrimary: getContrastTextColor(primaryStrong),
    onSecondary: getContrastTextColor(secondarySafe),
    surfaceTint: hexToRgba(primaryStrong, 0.05),
    surfaceTintStrong: hexToRgba(primaryStrong, 0.11),
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

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHexColor(hex) ?? parseHexColor(DEFAULT_PRIMARY)!;
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamped})`;
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

function getContrastTextColor(hex: string): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return '#ffffff';

  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.18 ? '#0A0A0A' : '#FFFFFF';
}

function createReadableAccent(color: string): string {
  const safeColor = normalizeHexColor(color, DEFAULT_PRIMARY);
  const rgb = parseHexColor(safeColor);
  if (!rgb) {
    return '#8A8A8A';
  }

  const luminance = getRelativeLuminance(rgb);
  if (luminance < SAFE_PRIMARY_MIN_LUMINANCE) {
    return moveColorToTargetLuminance(safeColor, '#FFFFFF', SAFE_PRIMARY_TARGET_LUMINANCE, 'lighter');
  }

  if (luminance > SAFE_PRIMARY_MAX_LUMINANCE) {
    return moveColorToTargetLuminance(safeColor, DARK_BASE, SAFE_PRIMARY_TARGET_LUMINANCE, 'darker');
  }

  return safeColor;
}

function createSafeSecondary(color: string): string {
  const safeColor = normalizeHexColor(color, DEFAULT_SECONDARY);
  const rgb = parseHexColor(safeColor);
  if (!rgb) {
    return mixHexColors(DEFAULT_SECONDARY, DARK_BASE, 0.4);
  }

  const luminance = getRelativeLuminance(rgb);
  if (luminance > SAFE_SECONDARY_MAX_LUMINANCE) {
    return moveColorToTargetLuminance(safeColor, DARK_BASE, SAFE_SECONDARY_TARGET_LUMINANCE, 'darker');
  }

  return safeColor;
}

function moveColorToTargetLuminance(
  from: string,
  toward: string,
  targetLuminance: number,
  mode: 'lighter' | 'darker',
): string {
  let low = 0;
  let high = 1;
  let best = from;

  for (let index = 0; index < 18; index += 1) {
    const mid = (low + high) / 2;
    const mixed = mixHexColors(from, toward, mid);
    const rgb = parseHexColor(mixed);
    if (!rgb) {
      break;
    }

    const luminance = getRelativeLuminance(rgb);
    best = mixed;

    if (mode === 'lighter') {
      if (luminance < targetLuminance) {
        low = mid;
      } else {
        high = mid;
      }
      continue;
    }

    if (luminance > targetLuminance) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return best;
}
