/**
 * HockeyLifeHL Brand Colors
 * Gold + neutral palette from brand kit
 */

export const colors = {
  gold: {
    50: '#FFFDF5',
    100: '#FFF9E6',
    200: '#FFF0BF',
    300: '#FFE699',
    400: '#FFD54F',
    500: '#D4AF37',
    600: '#C19A00',
    700: '#9A7B00',
    800: '#735C00',
    900: '#4D3D00',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    150: '#ededed',
    200: '#e5e5e5',
    250: '#d9d9d9',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    750: '#2e2e2e',
    800: '#262626',
    850: '#1a1a1a',
    900: '#171717',
    950: '#0a0a0a',
  },
  surface: {
    primary: '#0a0a0a',
    elevated: '#111111',
    card: '#1a1a1a',
    interactive: '#242424',
  },
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

/** Tab bar active/inactive tint colors */
export const tabBarColors = {
  active: colors.gold[500],
  inactive: colors.neutral[500],
  background: colors.neutral[950],
  border: colors.neutral[800],
};
