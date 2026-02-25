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
  ] = await Promise.all([
    (supabase as any).from('organizations').select(`
      id, name, bypass_subscription_gate, created_at, owner_user_id,
      profiles!organizations_owner_user_id_fkey ( email, full_name )
    `).order('created_at', { ascending: false }),

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
  ]);

  const orgs = orgsResult.data ?? [];
  const addons = addonsResult.data ?? [];
  const leagues = leaguesResult.data ?? [];
  const teams = teamsResult.data ?? [];
  const rosters = rosterResult.data ?? [];
  const games = gamesResult.data ?? [];
  const recentGames = recentGamesResult.data ?? [];

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
      owner_email: org.profiles?.email ?? null,
      owner_name: org.profiles?.full_name ?? null,
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
  };

  return { orgs: rows, totals };
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
