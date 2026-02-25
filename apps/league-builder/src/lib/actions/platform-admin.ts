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
  league_count: number;
  player_count: number;
  team_count: number;
  created_at: string | null;
}

export interface PlatformAdminData {
  orgs: PlatformOrgRow[];
  totals: {
    org_count: number;
    league_count: number;
    player_count: number;
    team_count: number;
    subscribed_count: number;
    bypass_count: number;
    mrr_cents: number;
  };
}

export async function getPlatformAdminData(): Promise<PlatformAdminData> {
  await assertPlatformAdmin();
  const supabase = createServiceRoleClient();

  // All orgs with owner profile
  const { data: orgs } = await (supabase as any)
    .from('organizations')
    .select(`
      id,
      name,
      bypass_subscription_gate,
      created_at,
      owner_user_id,
      profiles!organizations_owner_user_id_fkey (
        email,
        full_name
      )
    `)
    .order('created_at', { ascending: false });

  if (!orgs) return { orgs: [], totals: { org_count: 0, league_count: 0, player_count: 0, team_count: 0, subscribed_count: 0, bypass_count: 0, mrr_cents: 0 } };

  // Active platform subscriptions
  const { data: addons } = await (supabase as any)
    .from('organization_addons')
    .select('organization_id, addon_type, status')
    .in('status', ['active', 'trialing']);

  const activeAddonsByOrg = new Map<string, Set<string>>();
  for (const addon of (addons ?? [])) {
    if (!activeAddonsByOrg.has(addon.organization_id)) {
      activeAddonsByOrg.set(addon.organization_id, new Set());
    }
    activeAddonsByOrg.get(addon.organization_id)!.add(addon.addon_type);
  }

  // League/team/player counts per org
  const { data: leagues } = await (supabase as any)
    .from('leagues')
    .select('id, organization_id');

  const leagueIdsByOrg = new Map<string, string[]>();
  for (const l of (leagues ?? [])) {
    if (!leagueIdsByOrg.has(l.organization_id)) leagueIdsByOrg.set(l.organization_id, []);
    leagueIdsByOrg.get(l.organization_id)!.push(l.id);
  }

  const allLeagueIds = (leagues ?? []).map((l: any) => l.id);

  const { data: teams } = allLeagueIds.length
    ? await (supabase as any).from('teams').select('id, league_id').in('league_id', allLeagueIds)
    : { data: [] };

  const { data: players } = allLeagueIds.length
    ? await (supabase as any).from('league_players').select('id, league_id').in('league_id', allLeagueIds)
    : { data: [] };

  const teamCountByLeague = new Map<string, number>();
  for (const t of (teams ?? [])) {
    teamCountByLeague.set(t.league_id, (teamCountByLeague.get(t.league_id) ?? 0) + 1);
  }
  const playerCountByLeague = new Map<string, number>();
  for (const p of (players ?? [])) {
    playerCountByLeague.set(p.league_id, (playerCountByLeague.get(p.league_id) ?? 0) + 1);
  }

  const PLATFORM_PRICE_CENTS = 29999;
  const ADDON_PRICE_CENTS = 1499;

  let totalMrr = 0;
  let subscribedCount = 0;
  let bypassCount = 0;

  const rows: PlatformOrgRow[] = orgs.map((org: any) => {
    const orgLeagueIds = leagueIdsByOrg.get(org.id) ?? [];
    const orgAddons = activeAddonsByOrg.get(org.id) ?? new Set();
    const hasPlatformSub = orgAddons.has('platform_subscription');
    const hasStats = orgAddons.has('advanced_stats');
    const hasAiNews = orgAddons.has('ai_news');

    let orgMrr = 0;
    if (hasPlatformSub) {
      orgMrr += PLATFORM_PRICE_CENTS;
      subscribedCount++;
    }
    if (hasStats) orgMrr += ADDON_PRICE_CENTS;
    if (hasAiNews) orgMrr += ADDON_PRICE_CENTS;
    totalMrr += orgMrr;

    if (org.bypass_subscription_gate) bypassCount++;

    const leagueCount = orgLeagueIds.length;
    const teamCount = orgLeagueIds.reduce((sum: number, lid: string) => sum + (teamCountByLeague.get(lid) ?? 0), 0);
    const playerCount = orgLeagueIds.reduce((sum: number, lid: string) => sum + (playerCountByLeague.get(lid) ?? 0), 0);

    return {
      id: org.id,
      name: org.name,
      owner_email: org.profiles?.email ?? null,
      owner_name: org.profiles?.full_name ?? null,
      bypass_subscription_gate: org.bypass_subscription_gate,
      has_platform_subscription: hasPlatformSub,
      league_count: leagueCount,
      player_count: playerCount,
      team_count: teamCount,
      created_at: org.created_at,
    };
  });

  const totals = {
    org_count: rows.length,
    league_count: rows.reduce((s, r) => s + r.league_count, 0),
    player_count: rows.reduce((s, r) => s + r.player_count, 0),
    team_count: rows.reduce((s, r) => s + r.team_count, 0),
    subscribed_count: subscribedCount,
    bypass_count: bypassCount,
    mrr_cents: totalMrr,
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
