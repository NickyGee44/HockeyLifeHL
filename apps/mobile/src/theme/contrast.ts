import colors from './colors';

function normalizeHex(color: string): string | null {
  const match = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;

  const value = match[1];
  if (value.length === 3) {
    return value
      .split('')
      .map((char) => char + char)
      .join('');
  }

  return value;
}

export function getContrastTextColor(backgroundColor?: string | null) {
  if (!backgroundColor) return colors.textOnPrimary;

  const hex = normalizeHex(backgroundColor);
  if (!hex) return colors.textPrimary;

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.62 ? colors.textOnPrimary : colors.textPrimary;
}
