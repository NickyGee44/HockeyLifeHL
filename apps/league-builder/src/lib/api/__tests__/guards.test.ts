import { requireAuthenticatedApiUser, requireCronSecret, requireLeagueApiAccess, requireLeagueOrTeamApiAccess, requirePlatformAdminApiAccess, requireTeamApiAccess } from '@/lib/api/guards';
import { createClient } from '@/lib/supabase/server';
import { verifyCaptainOrAdminAccess, verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/actions/permissions', () => ({
  verifyCaptainOrAdminAccess: jest.fn(),
  verifyLeagueOwnerAccess: jest.fn(),
}));

jest.mock('@/lib/auth/platform-admin', () => ({
  isUserPlatformAdmin: jest.fn(),
}));

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedVerifyTeam = verifyCaptainOrAdminAccess as jest.MockedFunction<typeof verifyCaptainOrAdminAccess>;
const mockedVerifyLeague = verifyLeagueOwnerAccess as jest.MockedFunction<typeof verifyLeagueOwnerAccess>;
const mockedIsPlatformAdmin = isUserPlatformAdmin as jest.MockedFunction<typeof isUserPlatformAdmin>;

function mockUser(user: { id: string } | null, error: unknown = null) {
  mockedCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error }),
    },
  } as any);
}

describe('api guards', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('rejects invalid cron secret', () => {
    process.env.CRON_SECRET = 'topsecret';
    const request = new Request('https://example.com', {
      headers: { authorization: 'Bearer nope' },
    });

    const result = requireCronSecret(request as any);

    expect('response' in result).toBe(true);
  });

  it('returns auth context for authenticated users', async () => {
    mockUser({ id: 'user-1' });

    const result = await requireAuthenticatedApiUser();

    expect('response' in result).toBe(false);
    if ('response' in result) throw new Error('expected auth success');
    expect(result.user.id).toBe('user-1');
  });

  it('rejects missing league access', async () => {
    mockUser({ id: 'user-1' });
    mockedVerifyLeague.mockResolvedValue({ authorized: false, error: 'Forbidden' });

    const result = await requireLeagueApiAccess('league-1');

    expect('response' in result).toBe(true);
  });

  it('returns team access context when authorized', async () => {
    mockUser({ id: 'user-1' });
    mockedVerifyTeam.mockResolvedValue({
      authorized: true,
      accessType: 'captain',
      team: { id: 'team-1', league_id: 'league-1' } as any,
    });

    const result = await requireTeamApiAccess('team-1');

    expect('response' in result).toBe(false);
    if ('response' in result) throw new Error('expected team access success');
    expect(result.access.team?.id).toBe('team-1');
  });

  it('allows league-or-team access through matching team scope', async () => {
    mockUser({ id: 'user-1' });
    mockedVerifyLeague.mockResolvedValue({ authorized: false, error: 'Forbidden' });
    mockedVerifyTeam.mockResolvedValue({
      authorized: true,
      accessType: 'captain',
      team: { id: 'team-1', league_id: 'league-1' } as any,
    });

    const result = await requireLeagueOrTeamApiAccess('league-1', 'team-1');

    expect('response' in result).toBe(false);
  });

  it('requires platform admin access', async () => {
    mockUser({ id: 'user-1' });
    mockedIsPlatformAdmin.mockResolvedValue(false);

    const result = await requirePlatformAdminApiAccess();

    expect('response' in result).toBe(true);
  });
});
