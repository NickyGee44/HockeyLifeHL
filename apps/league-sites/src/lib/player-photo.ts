export type PlayerPhotoFields = {
  avatar_url?: string | null;
  photo_url?: string | null;
} | null | undefined;

function normalizePhotoUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Canonical player photo resolver.
 *
 * `avatar_url` is the primary field used by most UI. Some registration paths
 * historically populated `photo_url` only, so player-facing UI should fall back
 * to it instead of showing initials when an uploaded registration photo exists.
 */
export function resolvePlayerPhotoUrl(profile: PlayerPhotoFields): string | null {
  return normalizePhotoUrl(profile?.avatar_url) ?? normalizePhotoUrl(profile?.photo_url);
}
