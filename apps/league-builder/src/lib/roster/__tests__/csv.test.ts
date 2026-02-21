import { describe, expect, it } from '@jest/globals';
import {
  buildRosterCsv,
  escapeCsvCell,
  formatLeadershipRole,
  type RosterCsvRow,
} from '@/lib/roster/csv';

const rows: RosterCsvRow[] = [
  {
    jerseyNumber: 9,
    fullName: 'Alex "Ace" Carter',
    email: 'alex@example.com',
    phone: '555-111-2222',
    position: 'C',
    leadershipRole: 'captain',
    status: 'active',
    teamName: 'Ice Wolves',
  },
  {
    jerseyNumber: 17,
    fullName: 'Sam Rivers',
    email: 'sam@example.com',
    phone: null,
    position: 'D',
    leadershipRole: null,
    status: 'active',
    teamName: 'Ice Wolves',
  },
];

describe('roster csv export helpers', () => {
  it('escapes CSV cells with quotes and commas', () => {
    expect(escapeCsvCell('A, B')).toBe('"A, B"');
    expect(escapeCsvCell('A "quoted" value')).toBe('"A ""quoted"" value"');
  });

  it('formats leadership roles for readable CSV output', () => {
    expect(formatLeadershipRole('alternate_captain')).toBe('Alternate Captain');
    expect(formatLeadershipRole(null)).toBe('');
  });

  it('builds team roster CSV without team column', () => {
    const csv = buildRosterCsv(rows, false);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Jersey #,Name,Email,Phone,Position,Role,Status');
    expect(lines[1]).toContain('"Alex ""Ace"" Carter"');
    expect(lines[1]).toContain('Captain');
  });

  it('builds full-league CSV with team column', () => {
    const csv = buildRosterCsv(rows, true);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Team,Jersey #,Name,Email,Phone,Position,Role,Status');
    expect(lines[1].startsWith('Ice Wolves,')).toBe(true);
  });
});

