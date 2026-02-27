'use server';

import crypto from 'node:crypto';
import { createAuthClient } from '@/lib/supabase/server';
import type { BugReportCategory, CollectedBugReportData } from '@/lib/bug-report-collector';

interface SubmitBugReportInput {
  leagueId: string;
  seasonId?: string | null;
  teamId?: string | null;
  description: string;
  expectedBehavior?: string;
  category: BugReportCategory;
  collected: CollectedBugReportData;
  screenshotUrl?: string | null;
  appState?: Record<string, unknown>;
}

interface SubmitBugReportResult {
  success: boolean;
  error?: string;
  reportId?: string;
  duplicateOf?: string;
}

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const NUMBER_PATTERN = /\b\d{4,}\b/g;
const TIMESTAMP_PATTERN = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g;

function normalizePath(path: string): string {
  return path.replace(UUID_PATTERN, ':id').replace(NUMBER_PATTERN, ':n');
}

function normalizeErrorMessage(message: string): string {
  return message
    .toLowerCase()
    .replace(UUID_PATTERN, ':id')
    .replace(TIMESTAMP_PATTERN, ':ts')
    .replace(NUMBER_PATTERN, ':n')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function getBrowserCategory(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome/')) return 'chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'safari';
  if (ua.includes('firefox/')) return 'firefox';
  return 'other';
}

function getPrimaryError(collected: CollectedBugReportData): string {
  const unhandled = collected.errorState?.unhandledErrors?.[0]?.message;
  if (unhandled) return unhandled;

  const consoleError = collected.consoleLogs.find((entry) => entry.level === 'error')?.message;
  if (consoleError) return consoleError;

  const networkError = collected.networkErrors[0];
  if (networkError) return `HTTP ${networkError.status} ${networkError.url}`;

  return 'no-error-context';
}

function classifySeverity(input: SubmitBugReportInput): 'critical' | 'high' | 'medium' | 'low' {
  const hasUnhandled = (input.collected.errorState?.unhandledErrors?.length ?? 0) > 0;
  const hasConsoleError = input.collected.consoleLogs.some((entry) => entry.level === 'error');
  const hasServerError = input.collected.networkErrors.some((entry) => entry.status >= 500);

  if (hasUnhandled) {
    return 'critical';
  }

  if (hasServerError || hasConsoleError) {
    return 'high';
  }

  if (input.category === 'suggestion' || input.category === 'confusing') {
    return 'low';
  }

  return 'medium';
}

export async function submitBugReport(
  input: SubmitBugReportInput
): Promise<SubmitBugReportResult> {
  try {
    if (!input.leagueId || !input.description?.trim()) {
      return { success: false, error: 'Missing required fields' };
    }

    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: membership } = await (supabase as any)
      .from('league_memberships' as any)
      .select('role, status')
      .eq('league_id', input.leagueId)
      .eq('user_id', user?.id)
      .eq('status', 'active')
      .maybeSingle();

    const userRole = membership?.role || (user ? 'member' : 'anonymous');

    const currentPath = new URL(input.collected.url, 'https://local.invalid').pathname;
    const normalizedPath = normalizePath(currentPath);
    const primaryError = normalizeErrorMessage(getPrimaryError(input.collected));
    const browserCategory = getBrowserCategory(input.collected.browserInfo.userAgent);

    const signatureBase = `${primaryError}|${normalizedPath}|${browserCategory}`;
    const errorSignature = crypto.createHash('sha256').update(signatureBase).digest('hex');

    const severity = classifySeverity(input);

    let duplicateOf: string | null = null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await (supabase as any)
      .from('bug_reports' as any)
      .select('id, report_count')
      .eq('league_id', input.leagueId)
      .eq('error_signature', errorSignature)
      .gte('created_at', sevenDaysAgo)
      .is('duplicate_of', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      duplicateOf = existing.id;

      await (supabase as any)
        .from('bug_reports' as any)
        .update({
          report_count: Number(existing.report_count || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }

    const screenshotUrl =
      input.screenshotUrl &&
      input.screenshotUrl.startsWith('data:image/') &&
      input.screenshotUrl.length <= 700_000
        ? input.screenshotUrl
        : null;

    const { data: inserted, error } = await (supabase as any)
      .from('bug_reports' as any)
      .insert({
        league_id: input.leagueId,
        season_id: input.seasonId || null,
        team_id: input.teamId || null,
        reporter_id: user?.id || null,
        description: input.description.trim(),
        expected_behavior: input.expectedBehavior?.trim() || null,
        category: input.category,
        url: input.collected.url,
        route_params: input.collected.routeParams,
        user_role: userRole,
        browser_info: input.collected.browserInfo,
        console_logs: input.collected.consoleLogs,
        network_errors: input.collected.networkErrors,
        navigation_history: input.collected.navigationHistory,
        user_interactions: input.collected.userInteractions,
        performance_data: input.collected.performanceData,
        error_state: input.collected.errorState,
        screenshot_url: screenshotUrl,
        app_state: input.appState || {},
        severity,
        status: duplicateOf ? 'duplicate' : 'new',
        error_signature: errorSignature,
        duplicate_of: duplicateOf,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[submitBugReport] Insert failed', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      reportId: inserted?.id,
      duplicateOf: duplicateOf || undefined,
    };
  } catch (error) {
    console.error('[submitBugReport] Unexpected error', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit report',
    };
  }
}
