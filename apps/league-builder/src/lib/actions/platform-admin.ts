'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import { stripe } from '@/lib/stripe/client';

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

export interface SubscriptionHealthRow {
  org_id: string;
  org_name: string;
  subscription_status: string;
  current_period_end: string | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  addon_types: string[];
  mrr_cents: number;
}

export interface StripeInvoiceRow {
  id: string;
  org_name: string;
  amount_cents: number;
  status: string;
  created: number; // unix timestamp
  description: string;
  hosted_url: string | null;
}

export interface PlatformFinancials {
  subscriptions: SubscriptionHealthRow[];
  at_risk: {
    past_due: number;
    cancelling: number;
    trials_expiring_7d: number;
    renewals_7d: number;
  };
  recent_invoices: StripeInvoiceRow[];
  failed_invoices: StripeInvoiceRow[];
  connect_fees_30d_cents: number;
  stripe_available: boolean;
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
  financials: PlatformFinancials;
}

export async function getPlatformAdminData(): Promise<PlatformAdminData> {
  await assertPlatformAdmin();
  const supabase = createServiceRoleClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Run all independent DB queries in parallel
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
    connectFeesResult,
  ] = await Promise.all([
    (supabase as any).from('organizations').select(
      `id, name, bypass_subscription_gate, created_at, owner_user_id,
       stripe_customer_id, subscription_status, current_period_end,
       payment_method_last4, payment_method_brand, trial_ends_at, cancel_at_period_end`
    ).order('created_at', { ascending: false }),

    (supabase as any).from('organization_addons')
      .select('organization_id, addon_type, status, amount_cents, current_period_end')
      .in('status', ['active', 'trialing', 'past_due']),

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

    (supabase as any).from('stripe_connect_payments')
      .select('application_fee_cents')
      .eq('status', 'succeeded')
      .gte('created_at', thirtyDaysAgo),
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

  // league_id → league name
  const leagueNameById = new Map<string, string>();
  for (const l of leagues) leagueNameById.set(l.id, l.name);

  // Build lookup maps
  const addonsByOrg = new Map<string, Array<{ addon_type: string; status: string; amount_cents: number; current_period_end: string | null }>>();
  for (const addon of addons) {
    if (!addonsByOrg.has(addon.organization_id)) addonsByOrg.set(addon.organization_id, []);
    addonsByOrg.get(addon.organization_id)!.push(addon);
  }

  const activeAddonsByOrg = new Map<string, Set<string>>();
  for (const addon of addons) {
    if (addon.status !== 'active' && addon.status !== 'trialing') continue;
    if (!activeAddonsByOrg.has(addon.organization_id)) activeAddonsByOrg.set(addon.organization_id, new Set());
    activeAddonsByOrg.get(addon.organization_id)!.add(addon.addon_type);
  }

  const leaguesByOrg = new Map<string, typeof leagues>();
  for (const l of leagues) {
    if (!leaguesByOrg.has(l.organization_id)) leaguesByOrg.set(l.organization_id, []);
    leaguesByOrg.get(l.organization_id)!.push(l);
  }

  const leagueByTeam = new Map<string, string>();
  for (const t of teams) leagueByTeam.set(t.id, t.league_id);

  const teamCountByLeague = new Map<string, number>();
  for (const t of teams) teamCountByLeague.set(t.league_id, (teamCountByLeague.get(t.league_id) ?? 0) + 1);

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

  // --- Subscription health (from DB) ---
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const subscriptions: SubscriptionHealthRow[] = orgs
    .filter((org: any) => org.subscription_status && org.subscription_status !== 'none')
    .map((org: any) => {
      const orgAddons = addonsByOrg.get(org.id) ?? [];
      const activeAddons = orgAddons.filter((a: any) => a.status === 'active' || a.status === 'trialing');
      const mrr = activeAddons.reduce((s: number, a: any) => s + (a.amount_cents ?? 0), 0);
      return {
        org_id: org.id,
        org_name: org.name,
        subscription_status: org.subscription_status,
        current_period_end: org.current_period_end,
        payment_method_last4: org.payment_method_last4,
        payment_method_brand: org.payment_method_brand,
        trial_ends_at: org.trial_ends_at,
        cancel_at_period_end: !!org.cancel_at_period_end,
        addon_types: activeAddons.map((a: any) => a.addon_type),
        mrr_cents: mrr,
      };
    });

  const pastDueCount = subscriptions.filter(s => s.subscription_status === 'past_due').length;
  const cancellingCount = subscriptions.filter(s => s.cancel_at_period_end).length;
  const trialsExpiring = subscriptions.filter(s =>
    s.trial_ends_at && new Date(s.trial_ends_at).getTime() - now.getTime() < sevenDaysMs
  ).length;
  const renewalsSoon = subscriptions.filter(s =>
    s.current_period_end &&
    !s.cancel_at_period_end &&
    new Date(s.current_period_end).getTime() - now.getTime() < sevenDaysMs &&
    new Date(s.current_period_end).getTime() > now.getTime()
  ).length;

  // --- Stripe API: invoice history (graceful fallback) ---
  let recentInvoices: StripeInvoiceRow[] = [];
  let failedInvoices: StripeInvoiceRow[] = [];
  let stripeAvailable = false;

  const customerToOrg = new Map<string, string>();
  for (const org of orgs) {
    if (org.stripe_customer_id) customerToOrg.set(org.stripe_customer_id, org.name);
  }

  try {
    const [paidList, openList] = await Promise.all([
      stripe.invoices.list({ limit: 8, status: 'paid' }),
      stripe.invoices.list({ limit: 5 }),
    ]);
    stripeAvailable = true;

    recentInvoices = paidList.data.map((inv) => ({
      id: inv.id,
      org_name: customerToOrg.get(inv.customer as string) ?? 'Unknown',
      amount_cents: inv.amount_paid,
      status: inv.status ?? 'paid',
      created: inv.created,
      description: inv.lines?.data?.[0]?.description ?? '',
      hosted_url: inv.hosted_invoice_url ?? null,
    }));

    failedInvoices = openList.data
      .filter((inv) => (inv.attempt_count ?? 0) > 0 && inv.status !== 'paid')
      .map((inv) => ({
        id: inv.id,
        org_name: customerToOrg.get(inv.customer as string) ?? 'Unknown',
        amount_cents: inv.amount_due,
        status: inv.status ?? 'open',
        created: inv.created,
        description: inv.lines?.data?.[0]?.description ?? '',
        hosted_url: inv.hosted_invoice_url ?? null,
      }));
  } catch {
    // Stripe unavailable — degrade gracefully, page still loads
    stripeAvailable = false;
  }

  // --- Connect fees (player registrations) ---
  const connectFees = connectFeesResult.data ?? [];
  const connectFees30dCents = connectFees.reduce(
    (s: number, r: any) => s + (r.application_fee_cents ?? 0), 0
  );

  const financials: PlatformFinancials = {
    subscriptions,
    at_risk: {
      past_due: pastDueCount,
      cancelling: cancellingCount,
      trials_expiring_7d: trialsExpiring,
      renewals_7d: renewalsSoon,
    },
    recent_invoices: recentInvoices,
    failed_invoices: failedInvoices,
    connect_fees_30d_cents: connectFees30dCents,
    stripe_available: stripeAvailable,
  };

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

  return { orgs: rows, totals, bugs, ai, financials };
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
