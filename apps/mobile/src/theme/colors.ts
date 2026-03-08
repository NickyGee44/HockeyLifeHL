const colors = {
  // Brand
  primary: '#4FD8FF',
  brandRink: '#4FD8FF',
  brandArena: '#6C7CFF',
  brandGold: '#D4AF37',

  // Backgrounds (3 elevation levels)
  bgBase: '#060B14',          // Level 1 — main app bg
  bgSurface: 'rgba(17, 24, 39, 0.84)',     // Level 2 — cards, modals
  bgInteractive: 'rgba(28, 37, 56, 0.9)',  // Level 3 — hover states, popovers
  bgElevated: 'rgba(10, 17, 30, 0.94)',
  glassStroke: 'rgba(255, 255, 255, 0.12)',
  glassStrokeStrong: 'rgba(255, 255, 255, 0.2)',
  glassHighlight: 'rgba(255, 255, 255, 0.08)',
  glassGlow: 'rgba(79, 216, 255, 0.22)',

  // Text — ALL must pass contrast on bg levels above
  textPrimary: '#F7FBFF',     // headlines, primary content
  textSecondary: '#A8B4C8',   // body copy, metadata
  textOnPrimary: '#02111B',   // text ON the cyan primary button
  textInteractive: '#4FD8FF', // links, brand-colored elements

  // Borders
  borderCard: 'rgba(255, 255, 255, 0.1)',

  // Buttons
  buttonDefault: '#4FD8FF',
  buttonPressed: '#2FCBFF',

  // Status badges
  badgeUpcomingBg: 'rgba(79, 216, 255, 0.2)',
  badgeUpcomingText: '#F0F6FC',
  badgeLiveBg: '#DA3633',
  badgeLiveText: '#F0F6FC',
  badgeFinalBg: 'rgba(255, 255, 255, 0.1)',
  badgeFinalText: '#C9D1D9',

  // Tab bar
  tabBarBg: 'rgba(10, 16, 28, 0.82)',
  tabActive: '#4FD8FF',
  tabInactive: '#8E9AAF',

  // Accents
  accentGreen: '#22C55E',
  accentRed: '#EF4444',
  accentViolet: '#8E7FFF',

  // Legacy aliases (keep for compatibility)
  navy: '#060B14',
  background: '#060B14',
  card: 'rgba(17, 24, 39, 0.84)',
};

export default colors;
