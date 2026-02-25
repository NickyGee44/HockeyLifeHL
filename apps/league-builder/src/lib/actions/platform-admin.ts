'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';

async function assertPlatformAdmin() {
  const userData = await getCurrentUser();
  if (!userData?.profile?.is_platform_admin) {
    throw new Error('Unauthorized');
  }
}

export interface PlatformOrgRow {
  id: string;
  name: string;
  owner_email: string | null;
  owner_name: string | null;
  bypass_subscription_gate: boolean;
  has_platform_subscription: boolean;
  has_ai_news: boolean;
  has_advanced_stats: boolean;
  league_count: number;
  roster_count: number;
  team_count: number;
  games_completed: number;
  games_last_30: number;
  created_at: string | null;
  // First league (for deep-link into admin)
  primary_league_id: string | null;
  primary_league_slug: string | null;
  primary_league_name: string | null;
}

export interface BugReportRow {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  category: string;
  description: string;
  report_count: number;
  created_at: string;
  league_name: string | null;
}

export interface AiLeagueStat {
  league_id: string;
  league_name: string;
  count: number;
  tokens: number;
}

export interface PlatformAdminData {
  orgs: PlatformOrgRow[];
  totals: {
    org_count: number;
    league_count: number;
    roster_count: number;
    team_count: number;
    games_completed: number;
    subscribed_count: number;
    bypass_count: number;
    mrr_cents: number;
    total_users: number;
    active_seasons: number;
    new_users_30d: number;
  };
  bugs: {
    open_critical: number;
    open_high: number;
    open_medium: number;
    open_low: number;
    recent: BugReportRow[];
  };
  ai: {
    articles_total: number;
    tokens_total: number;
    avg_gen_ms: number;
    by_league: AiLeagueStat[];
  };
}

export async function getPlatformAdminData(): Promise<PlatformAdminData> {
  await assertPlatformAdmin();
  const supabase = createServiceRoleClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Run all independent queries in parallel
  const [
    orgsResult,
    addonsResult,
    leaguesResult,
    teamsResult,
    rosterResult,
    gamesResult,
    recentGamesResult,
    usersResult,
    seasonsResult,
    newUsersResult,
    bugReportsResult,
    aiLogResult,
  ] = await Promise.all([
    (supabase as any).from('organizations').select(
      'id, name, bypass_subscription_gate, created_at, owner_user_id'
    ).order('created_at', { ascending: false }),

    (supabase as any).from('organization_addons')
      .select('organization_id, addon_type, status')
      .in('status', ['active', 'trialing']),

    (supabase as any).from('leagues').select('id, organization_id, name, slug'),

    (supabase as any).from('teams').select('id, league_id'),

    (supabase as any).from('team_rosters').select('id, team_id'),

    (supabase as any).from('games').select('id, league_id, status').eq('status', 'completed'),

    (supabase as any).from('games').select('id, league_id')
      .eq('status', 'completed')
      .gte('updated_at', thirtyDaysAgo),

    (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),

    (supabase as any).from('seasons').select('id', { count: 'exact', head: true }).eq('status', 'active'),

    (supabase as any).from('profiles').select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgo),

    (supabase as any).from('bug_reports')
      .select('id, severity, status, category, description, report_count, created_at, league_id')
      .not('status', 'in', '("closed","wont_fix","duplicate")')
      .order('created_at', { ascending: false })
      .limit(20),

    (supabase as any).from('ai_generation_log')
      .select('league_id, tokens_used, generation_time_ms, article_type')
      .eq('status', 'completed'),
  ]);

  const TEST_ORG_IDS = new Set([
    '918d7824-7efa-4e99-8816-e06b056ca64d', // DRAFT TEST
    'a90ca03c-7443-43ce-affc-b8961eef3a48', // Wally Test League
  ]);

  const rawOrgs = (orgsResult.data ?? []).filter((o: any) => !TEST_ORG_IDS.has(o.id));

  // Separate profile lookup (avoids unreliable FK hint in PostgREST)
  const ownerIds = [...new Set(rawOrgs.map((o: any) => o.owner_user_id).filter(Boolean))];
  const profilesResult = ownerIds.length > 0
    ? await (supabase as any).from('profiles').select('id, email, full_name').in('id', ownerIds)
    : { data: [] };
  const profileMap = new Map<string, { email: string; full_name: string }>();
  for (const p of (profilesResult.data ?? [])) profileMap.set(p.id, p);

  const orgs = rawOrgs.map((o: any) => ({ ...o, profile: profileMap.get(o.owner_user_id) ?? null }));
  const addons = addonsResult.data ?? [];
  const leagues = leaguesResult.data ?? [];
  const teams = teamsResult.data ?? [];
  const rosters = rosterResult.data ?? [];
  const games = gamesResult.data ?? [];
  const recentGames = recentGamesResult.data ?? [];

  // league_id → league name (for bug reports + AI stats)
  const leagueNameById = new Map<string, string>();
  for (const l of leagues) leagueNameById.set(l.id, l.name);

  // Build lookup maps
  const activeAddonsByOrg = new Map<string, Set<string>>();
  for (const addon of addons) {
    if (!activeAddonsByOrg.has(addon.organization_id)) {
      activeAddonsByOrg.set(addon.organization_id, new Set());
    }
    activeAddonsByOrg.get(addon.organization_id)!.add(addon.addon_type);
  }

  const leaguesByOrg = new Map<string, typeof leagues>();
  for (const l of leagues) {
    if (!leaguesByOrg.has(l.organization_id)) leaguesByOrg.set(l.organization_id, []);
    leaguesByOrg.get(l.organization_id)!.push(l);
  }

  // team_id → league_id (via teams table)
  const leagueByTeam = new Map<string, string>();
  for (const t of teams) leagueByTeam.set(t.id, t.league_id);

  const teamCountByLeague = new Map<string, number>();
  for (const t of teams) teamCountByLeague.set(t.league_id, (teamCountByLeague.get(t.league_id) ?? 0) + 1);

  // Roster spots by league (via team_id → league_id)
  const rosterByLeague = new Map<string, number>();
  for (const r of rosters) {
    const lid = leagueByTeam.get(r.team_id);
    if (lid) rosterByLeague.set(lid, (rosterByLeague.get(lid) ?? 0) + 1);
  }

  const gamesByLeague = new Map<string, number>();
  for (const g of games) gamesByLeague.set(g.league_id, (gamesByLeague.get(g.league_id) ?? 0) + 1);

  const recentGamesByLeague = new Map<string, number>();
  for (const g of recentGames) recentGamesByLeague.set(g.league_id, (recentGamesByLeague.get(g.league_id) ?? 0) + 1);

  const PLATFORM_PRICE_CENTS = 29999;
  const ADDON_PRICE_CENTS = 1499;

  let totalMrr = 0;
  let subscribedCount = 0;
  let bypassCount = 0;

  const rows: PlatformOrgRow[] = orgs.map((org: any) => {
    const orgLeagues = leaguesByOrg.get(org.id) ?? [];
    const orgLeagueIds = orgLeagues.map((l: any) => l.id);
    const orgAddons = activeAddonsByOrg.get(org.id) ?? new Set();
    const hasPlatformSub = orgAddons.has('platform_subscription');
    const hasAiNews = orgAddons.has('ai_news');
    const hasStats = orgAddons.has('advanced_stats');

    let orgMrr = 0;
    if (hasPlatformSub) { orgMrr += PLATFORM_PRICE_CENTS; subscribedCount++; }
    if (hasStats) orgMrr += ADDON_PRICE_CENTS;
    if (hasAiNews) orgMrr += ADDON_PRICE_CENTS;
    totalMrr += orgMrr;
    if (org.bypass_subscription_gate) bypassCount++;

    const teamCount = orgLeagueIds.reduce((s: number, lid: string) => s + (teamCountByLeague.get(lid) ?? 0), 0);
    const rosterCount = orgLeagueIds.reduce((s: number, lid: string) => s + (rosterByLeague.get(lid) ?? 0), 0);
    const gamesCompleted = orgLeagueIds.reduce((s: number, lid: string) => s + (gamesByLeague.get(lid) ?? 0), 0);
    const gamesLast30 = orgLeagueIds.reduce((s: number, lid: string) => s + (recentGamesByLeague.get(lid) ?? 0), 0);

    const primary = orgLeagues[0] as any;

    return {
      id: org.id,
      name: org.name,
      owner_email: org.profile?.email ?? null,
      owner_name: org.profile?.full_name ?? null,
      bypass_subscription_gate: org.bypass_subscription_gate,
      has_platform_subscription: hasPlatformSub,
      has_ai_news: hasAiNews,
      has_advanced_stats: hasStats,
      league_count: orgLeagues.length,
      roster_count: rosterCount,
      team_count: teamCount,
      games_completed: gamesCompleted,
      games_last_30: gamesLast30,
      created_at: org.created_at,
      primary_league_id: primary?.id ?? null,
      primary_league_slug: primary?.slug ?? null,
      primary_league_name: primary?.name ?? null,
    };
  });

  // --- Bug reports ---
  const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const openBugs: BugReportRow[] = (bugReportsResult.data ?? [])
    .map((b: any) => ({
      id: b.id,
      severity: b.severity,
      status: b.status,
      category: b.category,
      description: b.description,
      report_count: b.report_count,
      created_at: b.created_at,
      league_name: leagueNameById.get(b.league_id) ?? null,
    }))
    .sort((a: BugReportRow, b: BugReportRow) =>
      (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
    );

  const bugs = {
    open_critical: openBugs.filter(b => b.severity === 'critical').length,
    open_high: openBugs.filter(b => b.severity === 'high').length,
    open_medium: openBugs.filter(b => b.severity === 'medium').length,
    open_low: openBugs.filter(b => b.severity === 'low').length,
    recent: openBugs.slice(0, 10),
  };

  // --- AI usage ---
  const aiLog = aiLogResult.data ?? [];
  const aiByLeague = new Map<string, { count: number; tokens: number }>();
  let totalTokens = 0;
  let totalGenMs = 0;
  for (const row of aiLog) {
    totalTokens += row.tokens_used ?? 0;
    totalGenMs += row.generation_time_ms ?? 0;
    const lid = row.league_id;
    if (!aiByLeague.has(lid)) aiByLeague.set(lid, { count: 0, tokens: 0 });
    const entry = aiByLeague.get(lid)!;
    entry.count++;
    entry.tokens += row.tokens_used ?? 0;
  }
  const aiByLeagueSorted: AiLeagueStat[] = [...aiByLeague.entries()]
    .map(([lid, stat]) => ({
      league_id: lid,
      league_name: leagueNameById.get(lid) ?? lid,
      count: stat.count,
      tokens: stat.tokens,
    }))
    .sort((a, b) => b.count - a.count);

  const ai = {
    articles_total: aiLog.length,
    tokens_total: totalTokens,
    avg_gen_ms: aiLog.length > 0 ? Math.round(totalGenMs / aiLog.length) : 0,
    by_league: aiByLeagueSorted,
  };

  const totals = {
    org_count: rows.length,
    league_count: rows.reduce((s, r) => s + r.league_count, 0),
    roster_count: rows.reduce((s, r) => s + r.roster_count, 0),
    team_count: rows.reduce((s, r) => s + r.team_count, 0),
    games_completed: rows.reduce((s, r) => s + r.games_completed, 0),
    subscribed_count: subscribedCount,
    bypass_count: bypassCount,
    mrr_cents: totalMrr,
    total_users: usersResult.count ?? 0,
    active_seasons: seasonsResult.count ?? 0,
    new_users_30d: newUsersResult.count ?? 0,
  };

  return { orgs: rows, totals, bugs, ai };
}

export async function toggleBypassGate(orgId: string, enabled: boolean): Promise<void> {
  await assertPlatformAdmin();
  const supabase = createServiceRoleClient();
  await (supabase as any)
    .from('organizations')
    .update({ bypass_subscription_gate: enabled })
    .eq('id', orgId);
  revalidatePath('/dashboard/admin');
}
