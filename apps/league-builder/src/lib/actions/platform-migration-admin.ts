'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/auth';
import { locales } from '@/i18n/config';
import {
  MIGRATION_REQUEST_STATUS_OPTIONS,
  type LeagueMigrationRequest,
  type LeagueMigrationRequestStatus,
} from '@/lib/migration/requests';
import { createServiceRoleClient } from '@/lib/supabase/server';

const isDevelopment = process.env.NODE_ENV !== 'production';

export interface PlatformMigrationQueueRequest extends LeagueMigrationRequest {
  league_name: string;
  league_slug: string | null;
  organization_name: string | null;
  requester_name: string | null;
  requester_email: string | null;
}

export interface PlatformMigrationQueueData {
  requests: PlatformMigrationQueueRequest[];
  summary: Record<LeagueMigrationRequestStatus, number>;
  activeCount: number;
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface UpdatePlatformMigrationRequestInput {
  requestId: string;
  leagueId: string;
  status: LeagueMigrationRequestStatus;
  adminNotes?: string;
  quotedPriceCents?: number | null;
  scheduledFor?: string | null;
}

async function assertPlatformAdmin(): Promise<ActionResult<true>> {
  const userData = await getCurrentUser();
  if (!userData?.profile?.is_platform_admin) {
    return { success: false, error: 'Unauthorized' };
  }
  return { success: true, data: true };
}

function createEmptySummary(): Record<LeagueMigrationRequestStatus, number> {
  return {
    draft: 0,
    submitted: 0,
    reviewing: 0,
    quoted: 0,
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
}

function normalizeQuotedPriceCents(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { value: null } as const;
  }

  const normalized = Math.trunc(value);
  if (normalized < 0) {
    return { error: 'Quoted price cannot be negative.' } as const;
  }

  return { value: normalized } as const;
}

function normalizeScheduledFor(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return { value: null } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { error: 'Scheduled date must use YYYY-MM-DD format.' } as const;
  }
  return { value: trimmed } as const;
}

function revalidateAdminMigrationPaths(leagueId: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}/dashboard/admin`);
    revalidatePath(`/${locale}/dashboard/admin/migrations`);
    revalidatePath(`/${locale}/dashboard/leagues/${leagueId}/migration-center`);
  }
}

export async function getPlatformMigrationQueue(): Promise<ActionResult<PlatformMigrationQueueData>> {
  const access = await assertPlatformAdmin();
  if (!access.success) return access;

  const supabase = createServiceRoleClient() as any;

  const { data: requestRows, error } = await supabase
    .from('league_migration_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    if (isDevelopment) console.error('Error loading platform migration queue:', error);
    return { success: false, error: 'Failed to load migration queue.' };
  }

  const requests = (requestRows ?? []) as LeagueMigrationRequest[];
  const leagueIds = [...new Set(requests.map((request) => request.league_id).filter(Boolean))];
  const requesterIds = [...new Set(requests.map((request) => request.requested_by).filter(Boolean))];

  const [{ data: leagues }, { data: profiles }] = await Promise.all([
    leagueIds.length > 0
      ? supabase
          .from('leagues')
          .select('id, name, slug, organization_id')
          .in('id', leagueIds)
      : Promise.resolve({ data: [] }),
    requesterIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', requesterIds)
      : Promise.resolve({ data: [] }),
  ]);

  const organizationIds = [...new Set(((leagues ?? []) as any[]).map((league) => league.organization_id).filter(Boolean))];
  const { data: organizations } = organizationIds.length > 0
    ? await supabase
        .from('organizations')
        .select('id, name')
        .in('id', organizationIds)
    : { data: [] };

  const leagueMap = new Map<string, any>();
  for (const league of leagues ?? []) leagueMap.set(league.id, league);

  const profileMap = new Map<string, any>();
  for (const profile of profiles ?? []) profileMap.set(profile.id, profile);

  const organizationMap = new Map<string, any>();
  for (const organization of organizations ?? []) organizationMap.set(organization.id, organization);

  const summary = createEmptySummary();
  for (const request of requests) {
    summary[request.status] += 1;
  }

  const enrichedRequests: PlatformMigrationQueueRequest[] = requests.map((request) => {
    const league = leagueMap.get(request.league_id);
    const requester = request.requested_by ? profileMap.get(request.requested_by) : null;
    const organization = league?.organization_id ? organizationMap.get(league.organization_id) : null;

    return {
      ...request,
      league_name: league?.name ?? 'Unknown league',
      league_slug: league?.slug ?? null,
      organization_name: organization?.name ?? null,
      requester_name: requester?.full_name ?? null,
      requester_email: requester?.email ?? null,
    };
  });

  const activeCount =
    summary.draft +
    summary.submitted +
    summary.reviewing +
    summary.quoted +
    summary.scheduled +
    summary.in_progress;

  return {
    success: true,
    data: {
      requests: enrichedRequests,
      summary,
      activeCount,
    },
  };
}

export async function updatePlatformMigrationRequest(
  input: UpdatePlatformMigrationRequestInput
): Promise<ActionResult<PlatformMigrationQueueRequest>> {
  const access = await assertPlatformAdmin();
  if (!access.success) return access;

  if (!(MIGRATION_REQUEST_STATUS_OPTIONS as readonly string[]).includes(input.status)) {
    return { success: false, error: 'Invalid migration status.' };
  }

  const quotedPrice = normalizeQuotedPriceCents(input.quotedPriceCents);
  if (quotedPrice.error) {
    return { success: false, error: quotedPrice.error };
  }

  const scheduledFor = normalizeScheduledFor(input.scheduledFor);
  if (scheduledFor.error) {
    return { success: false, error: scheduledFor.error };
  }

  const adminNotes = input.adminNotes?.trim() || null;
  const supabase = createServiceRoleClient() as any;

  const { data: existing, error: existingError } = await supabase
    .from('league_migration_requests')
    .select('*')
    .eq('id', input.requestId)
    .eq('league_id', input.leagueId)
    .maybeSingle();

  if (existingError || !existing) {
    if (isDevelopment) console.error('Error loading migration request for admin update:', existingError);
    return { success: false, error: 'Migration request not found.' };
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: input.status,
    admin_notes: adminNotes,
    quoted_price_cents: quotedPrice.value ?? null,
    scheduled_for: scheduledFor.value ?? null,
  };

  if (input.status === 'submitted') {
    updatePayload.submitted_at = existing.submitted_at ?? now;
  }

  if (input.status === 'reviewing') {
    updatePayload.reviewed_at = existing.reviewed_at ?? now;
  }

  if (input.status === 'completed') {
    updatePayload.completed_at = now;
  }

  const { data: updated, error: updateError } = await supabase
    .from('league_migration_requests')
    .update(updatePayload)
    .eq('id', input.requestId)
    .eq('league_id', input.leagueId)
    .select('*')
    .single();

  if (updateError || !updated) {
    if (isDevelopment) console.error('Error updating migration request from admin queue:', updateError);
    return { success: false, error: 'Failed to update migration request.' };
  }

  const [{ data: league }, { data: requester }] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name, slug, organization_id')
      .eq('id', input.leagueId)
      .maybeSingle(),
    updated.requested_by
      ? supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', updated.requested_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: organization } = league?.organization_id
    ? await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', league.organization_id)
        .maybeSingle()
    : { data: null };

  revalidateAdminMigrationPaths(input.leagueId);

  return {
    success: true,
    data: {
      ...(updated as LeagueMigrationRequest),
      league_name: league?.name ?? 'Unknown league',
      league_slug: league?.slug ?? null,
      organization_name: organization?.name ?? null,
      requester_name: requester?.full_name ?? null,
      requester_email: requester?.email ?? null,
    },
  };
}
