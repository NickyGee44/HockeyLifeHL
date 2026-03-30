const ACTIVE_REGISTRATION_STATUSES = new Set([
  'pending',
  'approved',
  'waitlisted',
  'submitted',
]);

export function hasActiveSeasonRegistration(status?: string | null) {
  if (!status) {
    return false;
  }

  return ACTIVE_REGISTRATION_STATUSES.has(status.toLowerCase());
}
