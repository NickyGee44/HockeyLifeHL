// @ts-nocheck — new tables pending migration; regenerate types after running migrations
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type BugReportStatus =
  | 'new'
  | 'investigating'
  | 'fix_deployed'
  | 'closed'
  | 'duplicate'
  | 'wont_fix';

export interface BugReportRow {
  id: string;
  league_id: string;
  description: string;
  expected_behavior: string | null;
  category: string;
  severity: string;
  status: BugReportStatus;
  report_count: number;
  created_at: string;
  updated_at: string;
  resolution_notes: string | null;
  screenshot_url: string | null;
  browser_info: Record<string, unknown> | null;
  console_logs: Array<Record<string, unknown>>;
  network_errors: Array<Record<string, unknown>>;
  navigation_history: string[];
  user_interactions: Array<Record<string, unknown>>;
}

async function canAccessLeague(leagueId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, userId: null, supabase };
  }

  const { data: league } = await supabase
    .from('leagues')
    .select('id, owner_id, created_by')
    .eq('id', leagueId)
    .single();

  if (!league) {
    return { allowed: false, userId: user.id, supabase };
  }

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .maybeSingle();

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .maybeSingle();

  const allowed =
    league.owner_id === user.id ||
    league.created_by === user.id ||
    Boolean(membership) ||
    Boolean(profile?.is_platform_admin);

  return { allowed, userId: user.id, supabase };
}

export async function getLeagueBugReports(leagueId: string): Promise<BugReportRow[]> {
  const access = await canAccessLeague(leagueId);
  if (!access.allowed) {
    return [];
  }

  const { data, error } = await (access.supabase as any)
    .from('bug_reports' as any)
    .select(
      `
      id,
      league_id,
      description,
      expected_behavior,
      category,
      severity,
      status,
      report_count,
      created_at,
      updated_at,
      resolution_notes,
      screenshot_url,
      browser_info,
      console_logs,
      network_errors,
      navigation_history,
      user_interactions
      `
    )
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false })
    .limit(400);

  if (error || !data) {
    console.error('[getLeagueBugReports] Failed', error);
    return [];
  }

  return data as BugReportRow[];
}

export async function updateBugReportStatus(input: {
  leagueId: string;
  reportId: string;
  status?: BugReportStatus;
  resolutionNotes?: string;
}) {
  const access = await canAccessLeague(input.leagueId);
  if (!access.allowed) {
    return { success: false, error: 'Unauthorized' };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.status) {
    patch.status = input.status;
    if (input.status === 'closed' || input.status === 'wont_fix' || input.status === 'fix_deployed') {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = access.userId;
    }
  }

  if (typeof input.resolutionNotes === 'string') {
    patch.resolution_notes = input.resolutionNotes.trim() || null;
  }

  const { error } = await (access.supabase as any)
    .from('bug_reports' as any)
    .update(patch)
    .eq('id', input.reportId)
    .eq('league_id', input.leagueId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
