const truthy = new Set(['1', 'true', 'yes', 'on']);

function readFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  return truthy.has(raw.toLowerCase());
}

export const featureFlags = {
  enablePlatformHealthEndpoint: readFlag('ENABLE_PLATFORM_HEALTH_ENDPOINT', true),
  enableReleaseGuards: readFlag('ENABLE_RELEASE_GUARDS', true),
};
