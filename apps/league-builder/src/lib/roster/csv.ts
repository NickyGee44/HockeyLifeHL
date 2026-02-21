export interface RosterCsvRow {
  jerseyNumber: number | null;
  fullName: string;
  email: string;
  phone: string | null;
  position: string;
  leadershipRole: string | null;
  status: string;
  teamName: string;
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatLeadershipRole(role: string | null): string {
  if (!role) return '';
  return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildRosterCsv(
  rows: RosterCsvRow[],
  includeTeamColumn: boolean
): string {
  const headers = includeTeamColumn
    ? ['Team', 'Jersey #', 'Name', 'Email', 'Phone', 'Position', 'Role', 'Status']
    : ['Jersey #', 'Name', 'Email', 'Phone', 'Position', 'Role', 'Status'];

  const csvRows = rows.map((row) => {
    const base = [
      escapeCsvCell(row.jerseyNumber),
      escapeCsvCell(row.fullName),
      escapeCsvCell(row.email),
      escapeCsvCell(row.phone),
      escapeCsvCell(row.position),
      escapeCsvCell(formatLeadershipRole(row.leadershipRole)),
      escapeCsvCell(row.status),
    ];
    return includeTeamColumn
      ? [escapeCsvCell(row.teamName), ...base].join(',')
      : base.join(',');
  });

  return [headers.join(','), ...csvRows].join('\n');
}

