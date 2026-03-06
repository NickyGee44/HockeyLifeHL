import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/actions/auth', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock('@/i18n/config', () => ({
  locales: ['en', 'fr'],
}));

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { updatePlatformMigrationRequest } from '../platform-migration-admin';

describe('platform migration admin actions', () => {
  const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
  const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
  const mockCreateServiceRoleClient = createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({
      profile: {
        is_platform_admin: true,
      },
    } as never);
  });

  it('rejects negative quoted prices before touching the database', async () => {
    const result = await updatePlatformMigrationRequest({
      requestId: 'request-1',
      leagueId: 'league-1',
      status: 'quoted',
      quotedPriceCents: -1,
    });

    expect(result).toEqual({
      success: false,
      error: 'Quoted price cannot be negative.',
    });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it('updates request status, timestamps, and revalidates admin and owner views', async () => {
    const updateSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'request-1',
        league_id: 'league-1',
        requested_by: 'user-1',
        status: 'completed',
        scope: ['teams'],
        source_system: 'TeamSnap',
        source_url: null,
        asset_links: [],
        notes: null,
        desired_launch_date: null,
        estimated_item_count: null,
        admin_notes: 'Ready for launch',
        quoted_price_cents: 250000,
        submitted_at: '2026-03-01T00:00:00.000Z',
        reviewed_at: '2026-03-02T00:00:00.000Z',
        scheduled_for: '2026-03-10',
        completed_at: '2026-03-12T00:00:00.000Z',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-12T00:00:00.000Z',
      },
      error: null,
    });
    const update = jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: updateSingle,
          })),
        })),
      })),
    }));
    const existingMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'request-1',
        league_id: 'league-1',
        requested_by: 'user-1',
        submitted_at: '2026-03-01T00:00:00.000Z',
        reviewed_at: '2026-03-02T00:00:00.000Z',
      },
      error: null,
    });
    const leagueMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'league-1',
        name: 'Metro League',
        slug: 'metro-league',
        organization_id: 'org-1',
      },
    });
    const requesterMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        full_name: 'Alex Admin',
        email: 'alex@example.com',
      },
    });
    const organizationMaybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'org-1',
        name: 'Metro Sports',
      },
    });

    mockCreateServiceRoleClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'league_migration_requests') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: existingMaybeSingle,
                })),
              })),
            })),
            update,
          };
        }

        if (table === 'leagues') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: leagueMaybeSingle,
              })),
            })),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: requesterMaybeSingle,
              })),
            })),
          };
        }

        if (table === 'organizations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: organizationMaybeSingle,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    } as never);

    const result = await updatePlatformMigrationRequest({
      requestId: 'request-1',
      leagueId: 'league-1',
      status: 'completed',
      adminNotes: '  Ready for launch  ',
      quotedPriceCents: 250000,
      scheduledFor: '2026-03-10',
    });

    expect(result.success).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        admin_notes: 'Ready for launch',
        quoted_price_cents: 250000,
        scheduled_for: '2026-03-10',
        completed_at: expect.any(String),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/dashboard/admin');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/dashboard/admin/migrations');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/dashboard/leagues/league-1/migration-center');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/fr/dashboard/admin');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/fr/dashboard/admin/migrations');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/fr/dashboard/leagues/league-1/migration-center');
  });
});
