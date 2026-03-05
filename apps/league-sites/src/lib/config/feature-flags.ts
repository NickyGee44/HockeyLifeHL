const truthy = new Set(['1', 'true', 'yes', 'on']);

function readFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  return truthy.has(raw.toLowerCase());
}

export const featureFlags = {
  enableHomepageNewsFallback: readFlag('NEXT_PUBLIC_ENABLE_HOMEPAGE_NEWS_FALLBACK', true),
  enableLeagueSiteResponsiveGuards: readFlag('NEXT_PUBLIC_ENABLE_LEAGUE_SITE_RESPONSIVE_GUARDS', true),
};
