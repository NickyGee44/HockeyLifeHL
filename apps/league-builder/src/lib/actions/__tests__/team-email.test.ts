import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/notifications/email-service', () => ({
  sendBatchEmails: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { sendBatchEmails } from '@/lib/notifications/email-service';
import { sendLeagueEmail, sendTeamEmail } from '@/lib/actions/team-email';

type RosterRow = {
  leadership_role: string | null;
  profile: { full_name: string; email: string };
};

function makeThenableRosterQuery(rows: RosterRow[]) {
  let captainsOnly = false;

  const query: {
    eq: jest.Mock;
    in: jest.Mock;
    then: (resolve: (value: { data: RosterRow[]; error: null }) => void) => void;
  } = {
    eq: jest.fn(() => query),
    in: jest.fn((field: string) => {
      if (field === 'leadership_role') captainsOnly = true;
      return query;
    }),
    then: (resolve) => {
      const filtered = captainsOnly
        ? rows.filter((row) =>
            row.leadership_role === 'captain' || row.leadership_role === 'alternate_captain'
          )
        : rows;
      resolve({ data: filtered, error: null });
    },
  };

  return query;
}

function makeSupabaseMock(params: {
  teamName?: string;
  leagueName: string;
  rosterRows: RosterRow[];
}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: jest.fn((table: string) => {
      if (table === 'teams') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { name: params.teamName ?? 'Wolves', league_id: 'league-1' },
              }),
            })),
          })),
        };
      }

      if (table === 'leagues') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: { name: params.leagueName } }),
            })),
          })),
        };
      }

      if (table === 'team_rosters') {
        return {
          select: jest.fn(() => makeThenableRosterQuery(params.rosterRows)),
        };
      }
      return { select: jest.fn() };
    }),
  };
}

describe('team email actions', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const mockSendBatchEmails = sendBatchEmails as jest.MockedFunction<typeof sendBatchEmails>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendBatchEmails.mockResolvedValue({
      total: 0,
      sent: 0,
      failed: 0,
      results: [],
    });
  });

  it('filters team recipients to captains and renders announcement template', async () => {
    const supabase = makeSupabaseMock({
      teamName: 'Ice Wolves',
      leagueName: 'Metro League',
      rosterRows: [
        {
          leadership_role: 'captain',
          profile: { full_name: 'Captain One', email: 'captain@example.com' },
        },
        {
          leadership_role: null,
          profile: { full_name: 'Skater One', email: 'skater@example.com' },
        },
      ],
    });

    mockCreateClient.mockResolvedValue(supabase as never);
    mockSendBatchEmails.mockResolvedValue({
      total: 1,
      sent: 1,
      failed: 0,
      results: [{ email: 'captain@example.com', success: true, messageId: 'msg_1' }],
    });

    const result = await sendTeamEmail({
      teamId: 'team-1',
      subject: 'Practice Update',
      content: 'Practice starts at 8:00 PM.',
      recipientFilter: 'captains',
    });

    expect(result.success).toBe(true);
    expect(result.sentCount).toBe(1);

    const recipients = (mockSendBatchEmails.mock.calls[0]?.[0] ?? []) as Array<{
      email: string;
      name?: string;
    }>;
    expect(recipients).toEqual([
      {
        email: 'captain@example.com',
        name: 'Captain One',
      },
    ]);

    const renderTemplate = mockSendBatchEmails.mock.calls[0]?.[2];
    const rendered = typeof renderTemplate === 'function'
      ? renderTemplate({ email: 'captain@example.com', name: 'Captain One' })
      : '';
    expect(rendered).toContain('Practice Update');
    expect(rendered).toContain('Practice starts at 8:00 PM.');
  });

  it('deduplicates league recipient emails for league-wide blast', async () => {
    const rosterRows: RosterRow[] = [
      {
        leadership_role: 'captain',
        profile: { full_name: 'Sam Captain', email: 'sam@example.com' },
      },
      {
        leadership_role: 'alternate_captain',
        profile: { full_name: 'Sam Captain', email: 'sam@example.com' },
      },
      {
        leadership_role: null,
        profile: { full_name: 'Alex Skater', email: 'alex@example.com' },
      },
    ];

    const supabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: jest.fn((table: string) => {
        if (table === 'leagues') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: { name: 'Metro League' } }),
              })),
            })),
          };
        }
        if (table === 'teams') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: [{ id: 'team-1' }, { id: 'team-2' }] }),
            })),
          };
        }
        if (table === 'team_rosters') {
          return {
            select: jest.fn(() => makeThenableRosterQuery(rosterRows)),
          };
        }
        return { select: jest.fn() };
      }),
    };

    mockCreateClient.mockResolvedValue(supabase as never);
    mockSendBatchEmails.mockResolvedValue({
      total: 2,
      sent: 2,
      failed: 0,
      results: [
        { email: 'sam@example.com', success: true, messageId: 'msg_1' },
        { email: 'alex@example.com', success: true, messageId: 'msg_2' },
      ],
    });

    const result = await sendLeagueEmail({
      leagueId: 'league-1',
      subject: 'League News',
      content: 'This week has a holiday schedule.',
      recipientFilter: 'all',
    });

    expect(result.success).toBe(true);
    expect(result.sentCount).toBe(2);

    const recipients = (mockSendBatchEmails.mock.calls[0]?.[0] ?? []) as Array<{
      email: string;
    }>;
    expect(recipients).toHaveLength(2);
    expect(recipients.map((r) => r.email).sort()).toEqual([
      'alex@example.com',
      'sam@example.com',
    ]);
  });
});
