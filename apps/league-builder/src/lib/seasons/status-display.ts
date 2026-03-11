export function getSeasonStatusLabel(
  status: string | null | undefined,
  registrationType?: string | null
): string {
  if (!status) return 'Unknown';

  switch (status) {
    case 'draft':
      return registrationType === 'draft' ? 'Draft Setup' : 'Pre-Season';
    case 'active':
      return 'Active';
    case 'playoffs':
      return 'Playoffs';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    case 'registration':
      return 'Registration';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
