'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications/email-service';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

export type AvailabilityWindowInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  availabilityType: 'available' | 'preferred' | 'unavailable';
};

export type StaffAvailabilityRole = {
  roleType: 'scorekeeper' | 'referee';
  recordId: string;
  leagueId: string;
  leagueName: string;
  displayName: string;
  email: string | null;
  windows: AvailabilityWindowInput[];
};

type ScorekeeperAvailabilityRow = {
  id: string;
  league_id: string;
  scorekeeper_id: string;
  email: string | null;
  display_name: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type RefereeRow = {
  id: string;
  league_id: string;
  referee_id: string | null;
  display_name: string;
  email: string | null;
  max_games_per_week: number | null;
  preferred_days: number[] | null;
  total_assignments: number;
  can_referee: boolean;
  can_linesman: boolean;
  status: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.beerleaguehockey.ca';
const SCOREKEEPER_REFERENCE_SUNDAY = new Date(Date.UTC(2026, 0, 4, 0, 0, 0, 0));

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function normalizeTimeValue(timeValue: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
  if (!match) {
    return '00:00';
  }

  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${pad2(hours)}:${pad2(minutes)}`;
}

function buildRecurringScorekeeperTimestamp(dayOfWeek: number, timeValue: string): string {
  const [hours, minutes] = normalizeTimeValue(timeValue).split(':').map(Number);
  const next = new Date(SCOREKEEPER_REFERENCE_SUNDAY);
  next.setUTCDate(SCOREKEEPER_REFERENCE_SUNDAY.getUTCDate() + dayOfWeek);
  next.setUTCHours(hours, minutes, 0, 0);
  return next.toISOString();
}

function extractUtcTimeString(timestamp: string): string {
  const parsed = new Date(timestamp);
  return `${pad2(parsed.getUTCHours())}:${pad2(parsed.getUTCMinutes())}`;
}

async function claimScorekeeperRowsForUser(userId: string, email: string) {
  const serviceClient = createServiceRoleClient();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return;
  }

  const { data: rows } = await serviceClient
    .from('league_scorekeepers')
    .select('id, league_id, scorekeeper_id')
    .ilike('email', normalizedEmail);

  for (const row of rows || []) {
    if (row.scorekeeper_id === userId) {
      continue;
    }

    const { data: conflict } = await serviceClient
      .from('league_scorekeepers')
      .select('id')
      .eq('league_id', row.league_id)
      .eq('scorekeeper_id', userId)
      .maybeSingle();

    if (conflict?.id) {
      continue;
    }

    await serviceClient
      .from('league_scorekeepers')
      .update({ scorekeeper_id: userId, updated_at: new Date().toISOString() })
      .eq('id', row.id);
  }
}

async function claimRefereeRowsForUser(userId: string, email: string) {
  const serviceClient = createServiceRoleClient();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return;
  }

  const { data: rows } = await (serviceClient as any)
    .from('league_referees')
    .select('id, league_id, referee_id')
    .ilike('email', normalizedEmail);

  for (const row of (rows || []) as Array<Pick<RefereeRow, 'id' | 'league_id' | 'referee_id'>>) {
    if (row.referee_id === userId) {
      continue;
    }

    const { data: conflict } = await (serviceClient as any)
      .from('league_referees')
      .select('id')
      .eq('league_id', row.league_id)
      .eq('referee_id', userId)
      .maybeSingle();

    if (conflict?.id) {
      continue;
    }

    await (serviceClient as any)
      .from('league_referees')
      .update({ referee_id: userId, updated_at: new Date().toISOString() })
      .eq('id', row.id);
  }
}

export async function syncLeagueRefereesFromStaff(leagueId: string) {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false as const, error: access.error || 'Not authorized' };
  }

  const serviceClient = createServiceRoleClient();
  const { data: staffRows, error: staffError } = await (serviceClient
    .from('league_staff') as any)
    .select('id, league_id, name, role_title, email, phone, is_active')
    .eq('league_id', leagueId)
    .ilike('role_title', '%referee%');

  if (staffError) {
    return { success: false as const, error: 'Failed to load referee staff.' };
  }

  const normalizedEmails: string[] = Array.from(
    new Set(
      (staffRows || [])
        .map((row: any) => normalizeEmail(row.email))
        .filter((email: string | null): email is string => Boolean(email))
    )
  );

  const { data: profiles } = normalizedEmails.length > 0
    ? await serviceClient.from('profiles').select('id, email').in('email', normalizedEmails)
    : { data: [] as Array<{ id: string; email: string | null }> };

  const profileIdByEmail = new Map(
    (profiles || []).map((profile: { id: string; email: string | null }) => [
      normalizeEmail(profile.email) || '',
      profile.id,
    ])
  );

  const { data: existingRows } = await (serviceClient as any)
    .from('league_referees')
    .select('*')
    .eq('league_id', leagueId);

  for (const staffRow of staffRows || []) {
    const normalizedEmail = normalizeEmail(staffRow.email);
    const existing = (existingRows || []).find((row: any) => {
      if (normalizedEmail && normalizeEmail(row.email) === normalizedEmail) {
        return true;
      }
      return row.display_name === staffRow.name;
    });

    const payload = {
      league_id: leagueId,
      referee_id: normalizedEmail ? profileIdByEmail.get(normalizedEmail) || null : null,
      display_name: staffRow.name,
      email: normalizedEmail,
      phone: staffRow.phone || null,
      status: staffRow.is_active ? 'active' : 'inactive',
      hired_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await (serviceClient as any).from('league_referees').update(payload).eq('id', existing.id);
    } else {
      await (serviceClient as any).from('league_referees').insert(payload);
    }
  }

  return { success: true as const };
}

export async function getScorekeeperAvailabilityMetadata(leagueId: string) {
  const serviceClient = createServiceRoleClient();
  const { data } = await serviceClient
    .from('scorekeeper_availability')
    .select('scorekeeper_id, is_recurring')
    .eq('league_id', leagueId);

  const countByScorekeeperId = new Map<string, number>();
  for (const row of data || []) {
    countByScorekeeperId.set(
      row.scorekeeper_id,
      (countByScorekeeperId.get(row.scorekeeper_id) || 0) + 1
    );
  }

  return countByScorekeeperId;
}

export async function getRefereeAvailabilityMetadata(leagueId: string) {
  const serviceClient = createServiceRoleClient();
  const { data } = await (serviceClient as any)
    .from('referee_availability')
    .select('referee_id')
    .eq('league_id', leagueId);

  const countByRefereeId = new Map<string, number>();
  for (const row of (data || []) as Array<{ referee_id: string }>) {
    countByRefereeId.set(
      row.referee_id,
      (countByRefereeId.get(row.referee_id) || 0) + 1
    );
  }

  return countByRefereeId;
}

async function getCurrentUserOrError() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: 'Not authenticated.' };
  }

  return { user, error: null };
}

export async function getMyStaffAvailabilityOverview(): Promise<{
  success: boolean;
  data?: StaffAvailabilityRole[];
  error?: string;
}> {
  const auth = await getCurrentUserOrError();
  if (!auth.user) {
    return { success: false, error: auth.error || 'Not authenticated.' };
  }

  const user = auth.user;
  const normalizedEmail = normalizeEmail(user.email);
  const serviceClient = createServiceRoleClient();

  if (normalizedEmail) {
    await Promise.all([
      claimScorekeeperRowsForUser(user.id, normalizedEmail),
      claimRefereeRowsForUser(user.id, normalizedEmail),
    ]);
  }

  const [{ data: scorekeeperRows }, { data: refereeRows }] = await Promise.all([
    serviceClient
      .from('league_scorekeepers')
      .select(`
        id,
        league_id,
        scorekeeper_id,
        email,
        display_name,
        profile:profiles!league_scorekeepers_scorekeeper_id_fkey(full_name, email)
      `)
      .eq('scorekeeper_id', user.id)
      .eq('status', 'active'),
    (serviceClient as any)
      .from('league_referees')
      .select('id, league_id, referee_id, display_name, email')
      .eq('referee_id', user.id)
      .eq('status', 'active'),
  ]);

  const leagueIds = Array.from(
    new Set([
      ...(scorekeeperRows || []).map((row) => row.league_id),
      ...((refereeRows || []) as Array<{ league_id: string }>).map((row) => row.league_id),
    ])
  );

  const { data: leagues } = leagueIds.length > 0
    ? await serviceClient.from('leagues').select('id, name').in('id', leagueIds)
    : { data: [] as Array<{ id: string; name: string }> };

  const leagueNameById = new Map((leagues || []).map((league) => [league.id, league.name]));

  const scorekeeperIds = (scorekeeperRows || []).map((row) => row.scorekeeper_id);
  const refereeIds = ((refereeRows || []) as Array<{ id: string }>).map((row) => row.id);

  const [{ data: scorekeeperWindows }, { data: refereeWindows }] = await Promise.all([
    scorekeeperIds.length > 0
      ? serviceClient
          .from('scorekeeper_availability')
          .select('league_id, scorekeeper_id, day_of_week, start_time, end_time, availability_type, is_recurring')
          .in('scorekeeper_id', scorekeeperIds)
      : Promise.resolve({ data: [] as any[] }),
    refereeIds.length > 0
      ? (serviceClient as any)
          .from('referee_availability')
          .select('league_id, referee_id, day_of_week, start_time, end_time, availability_type, is_recurring')
          .in('referee_id', refereeIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const result: StaffAvailabilityRole[] = [];

  for (const row of (scorekeeperRows || []) as ScorekeeperAvailabilityRow[]) {
    const windows = (scorekeeperWindows || [])
      .filter((window: any) => window.league_id === row.league_id && window.scorekeeper_id === row.scorekeeper_id)
      .map((window: any) => ({
        dayOfWeek: window.day_of_week ?? 0,
        startTime: extractUtcTimeString(window.start_time),
        endTime: extractUtcTimeString(window.end_time),
        availabilityType: window.availability_type,
      })) satisfies AvailabilityWindowInput[];

    result.push({
      roleType: 'scorekeeper',
      recordId: row.id,
      leagueId: row.league_id,
      leagueName: leagueNameById.get(row.league_id) || 'League',
      displayName: row.display_name || row.profile?.full_name || 'Scorekeeper',
      email: row.email || row.profile?.email || null,
      windows,
    });
  }

  for (const row of (refereeRows || []) as Array<Pick<RefereeRow, 'id' | 'league_id' | 'display_name' | 'email'>>) {
    const windows = (refereeWindows || [])
      .filter((window: any) => window.league_id === row.league_id && window.referee_id === row.id)
      .map((window: any) => ({
        dayOfWeek: window.day_of_week ?? 0,
        startTime: normalizeTimeValue(window.start_time),
        endTime: normalizeTimeValue(window.end_time),
        availabilityType: window.availability_type,
      })) satisfies AvailabilityWindowInput[];

    result.push({
      roleType: 'referee',
      recordId: row.id,
      leagueId: row.league_id,
      leagueName: leagueNameById.get(row.league_id) || 'League',
      displayName: row.display_name,
      email: row.email,
      windows,
    });
  }

  result.sort((left, right) => {
    const leagueCompare = left.leagueName.localeCompare(right.leagueName);
    if (leagueCompare !== 0) {
      return leagueCompare;
    }
    return left.roleType.localeCompare(right.roleType);
  });

  return { success: true, data: result };
}

export async function saveMyScorekeeperAvailability(params: {
  leagueScorekeeperId: string;
  windows: AvailabilityWindowInput[];
}) {
  const auth = await getCurrentUserOrError();
  if (!auth.user) {
    return { success: false, error: auth.error || 'Not authenticated.' };
  }

  const serviceClient = createServiceRoleClient();
  const { data: row } = await serviceClient
    .from('league_scorekeepers')
    .select('id, league_id, scorekeeper_id')
    .eq('id', params.leagueScorekeeperId)
    .eq('scorekeeper_id', auth.user.id)
    .maybeSingle();

  if (!row) {
    return { success: false, error: 'Scorekeeper role not found.' };
  }

  await serviceClient
    .from('scorekeeper_availability')
    .delete()
    .eq('league_id', row.league_id)
    .eq('scorekeeper_id', row.scorekeeper_id)
    .eq('is_recurring', true);

  if (params.windows.length > 0) {
    const payload = params.windows.map((window) => ({
      league_id: row.league_id,
      scorekeeper_id: row.scorekeeper_id,
      availability_type: window.availabilityType,
      start_time: buildRecurringScorekeeperTimestamp(window.dayOfWeek, window.startTime),
      end_time: buildRecurringScorekeeperTimestamp(window.dayOfWeek, window.endTime),
      is_recurring: true,
      recurrence_pattern: 'weekly',
      day_of_week: window.dayOfWeek,
      created_by: auth.user.id,
    }));

    const { error } = await serviceClient.from('scorekeeper_availability').insert(payload);
    if (error) {
      return { success: false, error: 'Failed to save scorekeeper availability.' };
    }
  }

  revalidatePath('/dashboard/staffing/availability');
  return { success: true };
}

export async function saveMyRefereeAvailability(params: {
  leagueRefereeId: string;
  windows: AvailabilityWindowInput[];
}) {
  const auth = await getCurrentUserOrError();
  if (!auth.user) {
    return { success: false, error: auth.error || 'Not authenticated.' };
  }

  const serviceClient = createServiceRoleClient();
  const { data: row } = await (serviceClient as any)
    .from('league_referees')
    .select('id, league_id, referee_id')
    .eq('id', params.leagueRefereeId)
    .eq('referee_id', auth.user.id)
    .maybeSingle();

  if (!row) {
    return { success: false, error: 'Referee role not found.' };
  }

  await (serviceClient as any)
    .from('referee_availability')
    .delete()
    .eq('league_id', row.league_id)
    .eq('referee_id', row.id)
    .eq('is_recurring', true);

  if (params.windows.length > 0) {
    const payload = params.windows.map((window) => ({
      referee_id: row.id,
      league_id: row.league_id,
      day_of_week: window.dayOfWeek,
      start_time: normalizeTimeValue(window.startTime),
      end_time: normalizeTimeValue(window.endTime),
      availability_type: window.availabilityType,
      is_recurring: true,
      specific_date: null,
      created_by: auth.user.id,
    }));

    const { error } = await (serviceClient as any).from('referee_availability').insert(payload);
    if (error) {
      return { success: false, error: 'Failed to save referee availability.' };
    }
  }

  revalidatePath('/dashboard/staffing/availability');
  return { success: true };
}

export async function sendAvailabilityRequest(params: {
  leagueId: string;
  targetType: 'scorekeeper' | 'referee';
  targetId: string;
  locale: string;
}) {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized.' };
  }

  const auth = await getCurrentUserOrError();
  if (!auth.user) {
    return { success: false, error: auth.error || 'Not authenticated.' };
  }

  if (params.targetType === 'referee') {
    const syncResult = await syncLeagueRefereesFromStaff(params.leagueId);
    if (!syncResult.success) {
      return syncResult;
    }
  }

  const serviceClient = createServiceRoleClient();
  const { data: league } = await serviceClient
    .from('leagues')
    .select('id, name')
    .eq('id', params.leagueId)
    .maybeSingle();

  if (!league) {
    return { success: false, error: 'League not found.' };
  }

  let recipientEmail: string | null = null;
  let recipientName = params.targetType === 'scorekeeper' ? 'Scorekeeper' : 'Referee';

  if (params.targetType === 'scorekeeper') {
    const { data: row } = await serviceClient
      .from('league_scorekeepers')
      .select(`
        id,
        email,
        display_name,
        profile:profiles!league_scorekeepers_scorekeeper_id_fkey(email, full_name)
      `)
      .eq('id', params.targetId)
      .eq('league_id', params.leagueId)
      .maybeSingle();

    if (!row) {
      return { success: false, error: 'Scorekeeper not found.' };
    }

    recipientEmail = normalizeEmail(row.email || row.profile?.email || null);
    recipientName = row.display_name || row.profile?.full_name || recipientName;
  } else {
    const { data: row } = await (serviceClient as any)
      .from('league_referees')
      .select('id, email, display_name')
      .eq('id', params.targetId)
      .eq('league_id', params.leagueId)
      .maybeSingle();

    if (!row) {
      return { success: false, error: 'Referee not found.' };
    }

    recipientEmail = normalizeEmail(row.email);
    recipientName = row.display_name || recipientName;
  }

  if (!recipientEmail) {
    return { success: false, error: 'This staff member does not have an email on file.' };
  }

  const availabilityUrl = `${APP_URL}/${params.locale}/dashboard/staffing/availability`;
  const loginUrl = `${APP_URL}/${params.locale}/login?redirectTo=${encodeURIComponent(`/${params.locale}/dashboard/staffing/availability`)}`;
  const signupUrl = `${APP_URL}/${params.locale}/signup`;

  const result = await sendEmail({
    to: recipientEmail,
    replyTo: auth.user.email || undefined,
    subject: `${league.name}: update your weekly availability`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.6;">
        <p>Hi ${recipientName},</p>
        <p>${league.name} is collecting weekly availability for ${params.targetType === 'scorekeeper' ? 'scorekeepers' : 'referees'} so assignments can be generated automatically.</p>
        <p>Please use the link below to set the nights and time slots you are available each week:</p>
        <p>
          <a href="${availabilityUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:600;">
            Update Availability
          </a>
        </p>
        <p>If you already have a Beer League Hockey account with this email, sign in here first: <a href="${loginUrl}">${loginUrl}</a></p>
        <p>If you do not have an account yet, create one with this same email address here: <a href="${signupUrl}">${signupUrl}</a></p>
        <p>Once your availability is saved, the league can assign you to games with far less manual back-and-forth.</p>
      </div>
    `,
    tags: [
      { name: 'type', value: 'availability_request' },
      { name: 'league_id', value: params.leagueId },
      { name: 'staff_role', value: params.targetType },
    ],
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Failed to send availability request.' };
  }

  return { success: true };
}

export async function sendAvailabilityRequestForRefereeStaffMember(params: {
  leagueId: string;
  staffMemberId: string;
  locale: string;
}) {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized.' };
  }

  const serviceClient = createServiceRoleClient();
  const { data: staffRow } = await (serviceClient.from('league_staff') as any)
    .select('id, league_id, name, role_title, email')
    .eq('id', params.staffMemberId)
    .eq('league_id', params.leagueId)
    .maybeSingle();

  if (!staffRow) {
    return { success: false, error: 'Staff member not found.' };
  }

  if (!String(staffRow.role_title || '').toLowerCase().includes('referee')) {
    return { success: false, error: 'This staff member is not marked as a referee.' };
  }

  if (!normalizeEmail(staffRow.email)) {
    return { success: false, error: 'Add an email address before requesting availability.' };
  }

  const syncResult = await syncLeagueRefereesFromStaff(params.leagueId);
  if (!syncResult.success) {
    return syncResult;
  }

  const { data: refereeRow } = await (serviceClient as any)
    .from('league_referees')
    .select('id')
    .eq('league_id', params.leagueId)
    .ilike('email', normalizeEmail(staffRow.email)!)
    .maybeSingle();

  if (!refereeRow?.id) {
    return { success: false, error: 'Unable to create the referee scheduling record yet.' };
  }

  return sendAvailabilityRequest({
    leagueId: params.leagueId,
    targetType: 'referee',
    targetId: refereeRow.id,
    locale: params.locale,
  });
}
