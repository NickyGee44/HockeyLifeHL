import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { getPlatformAdminData, toggleBypassGate } from '@/lib/actions/platform-admin';
import {
  Building2, Users, Trophy, BarChart3, DollarSign, Zap,
  ExternalLink, CheckCircle2, Clock, Shield, Activity,
  TrendingUp, Gamepad2, Calendar, Bug, Sparkles,
  AlertTriangle, AlertCircle, Info, UserPlus,
  CreditCard, RefreshCw, XCircle, WifiOff,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function fmt(cents: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtN(n: number) {
  return new Intl.NumberFormat('en-CA').format(n);
}

function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function fmtK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtUnix(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function cardBrand(brand: string | null) {
  if (!brand) return '—';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

const SUB_STATUS_STYLE: Record<string, { label: string; badge: string }> = {
  active:    { label: 'Active',    badge: 'bg-green-500/15 text-green-400' },
  trialing:  { label: 'Trial',     badge: 'bg-blue-500/15 text-blue-400' },
  past_due:  { label: 'Past Due',  badge: 'bg-red-500/15 text-red-400' },
  canceled:  { label: 'Canceled',  badge: 'bg-neutral-800 text-neutral-500' },
  unpaid:    { label: 'Unpaid',    badge: 'bg-orange-500/15 text-orange-400' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SEVERITY_STYLE: Record<string, { label: string; dot: string; badge: string }> = {
  critical: { label: 'Critical', dot: 'bg-red-500', badge: 'bg-red-500/15 text-red-400' },
  high:     { label: 'High',     dot: 'bg-orange-500', badge: 'bg-orange-500/15 text-orange-400' },
  medium:   { label: 'Medium',   dot: 'bg-yellow-500', badge: 'bg-yellow-500/15 text-yellow-400' },
  low:      { label: 'Low',      dot: 'bg-neutral-500', badge: 'bg-neutral-800 text-neutral-400' },
};

export default async function PlatformAdminPage() {
  const locale = await getLocale();
  const userData = await getCurrentUser();

  if (!userData?.profile?.is_platform_admin) {
    redirect(`/${locale}/dashboard`);
  }

  const { orgs, totals, bugs, ai, financials } = await getPlatformAdminData();

  // Separate active (bypass/subscribed) from others
  const activeOrgs = orgs.filter(o => o.league_count > 0 && (o.bypass_subscription_gate || o.has_platform_subscription));
  const totalOpenBugs = bugs.open_critical + bugs.open_high + bugs.open_medium + bugs.open_low;

  const keyStats = [
    {
      label: 'Total Users', value: fmtN(totals.total_users), icon: Users, color: 'text-purple-400',
      sub: `+${fmtN(totals.new_users_30d)} this month`,
    },
    { label: 'Roster Spots', value: fmtN(totals.roster_count), icon: Shield, color: 'text-blue-400', sub: 'across all leagues' },
    { label: 'Games Played', value: fmtN(totals.games_completed), icon: Gamepad2, color: 'text-rink-400', sub: 'completed games' },
    { label: 'Teams', value: fmtN(totals.team_count), icon: Trophy, color: 'text-arena-400', sub: 'active teams' },
    { label: 'Active Seasons', value: totals.active_seasons, icon: Calendar, color: 'text-green-400', sub: 'seasons running' },
    { label: 'Orgs', value: totals.org_count, icon: Building2, color: 'text-neutral-400', sub: `${totals.bypass_count} on bypass` },
    { label: 'MRR', value: fmt(totals.mrr_cents), icon: DollarSign, color: 'text-emerald-400', sub: 'monthly recurring' },
    {
      label: 'Open Bugs', value: totalOpenBugs, icon: Bug,
      color: bugs.open_critical > 0 ? 'text-red-400' : bugs.open_high > 0 ? 'text-orange-400' : 'text-neutral-400',
      sub: bugs.open_critical > 0 ? `${bugs.open_critical} critical` : 'no critical issues',
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1400px] mx-auto space-y-10">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-black" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Overview</h1>
        </div>
        <p className="text-sm text-neutral-500 ml-11">Beer League Hockey · internal admin</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {keyStats.map((s) => (
          <div key={s.label} className="bg-neutral-900 border border-white/[0.07] rounded-xl p-4">
            <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-xs font-semibold text-neutral-400 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-neutral-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Active Leagues */}
      {activeOrgs.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Active Leagues
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeOrgs.map((org) => (
              <div key={org.id} className="bg-neutral-900 border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{org.primary_league_name ?? org.name}</p>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">{org.owner_email ?? '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {org.has_platform_subscription ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> Subscribed
                      </span>
                    ) : (
                      <form action={async () => { 'use server'; await toggleBypassGate(org.id, !org.bypass_subscription_gate); }}>
                        <button type="submit" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 transition-colors cursor-pointer">
                          <Zap className="w-3 h-3" /> Bypass On
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Teams', value: org.team_count },
                    { label: 'Roster', value: org.roster_count },
                    { label: 'Games', value: org.games_completed },
                    { label: 'Last 30d', value: org.games_last_30 },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-neutral-800/60 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-white">{fmtN(value)}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {org.has_ai_news && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-arena-500/15 text-arena-400">AI News</span>
                    )}
                    {org.has_advanced_stats && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rink-500/15 text-rink-400">Adv Stats</span>
                    )}
                  </div>
                  {org.primary_league_id && (
                    <Link
                      href={`/dashboard/leagues/${org.primary_league_id}`}
                      className="inline-flex items-center gap-1 text-xs text-rink-400 hover:text-rink-300 transition-colors"
                    >
                      Admin <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stripe Financials */}
      <div>
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5" /> Stripe Financials
          {!financials.stripe_available && (
            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-600">
              <WifiOff className="w-3 h-3" /> invoice data unavailable
            </span>
          )}
        </h2>

        {/* At-a-glance chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            {
              label: 'Active Subs', value: financials.subscriptions.filter(s => s.subscription_status === 'active').length,
              icon: CheckCircle2, color: 'text-green-400',
            },
            {
              label: 'Past Due', value: financials.at_risk.past_due,
              icon: AlertTriangle, color: financials.at_risk.past_due > 0 ? 'text-red-400' : 'text-neutral-600',
            },
            {
              label: 'Renewing in 7d', value: financials.at_risk.renewals_7d,
              icon: RefreshCw, color: 'text-blue-400',
            },
            {
              label: 'Platform Fees (30d)', value: fmt(financials.connect_fees_30d_cents),
              icon: CreditCard, color: 'text-emerald-400',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-neutral-900 border border-white/[0.07] rounded-xl p-4 flex items-start gap-3">
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
              <div>
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-xs text-neutral-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Subscription health table */}
          <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.05]">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Subscriptions</p>
            </div>
            {financials.subscriptions.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {['Org', 'Status', 'Renews', 'Card', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-neutral-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {financials.subscriptions.map(sub => {
                    const style = SUB_STATUS_STYLE[sub.subscription_status] ?? { label: sub.subscription_status, badge: 'bg-neutral-800 text-neutral-500' };
                    return (
                      <tr key={sub.org_id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-white text-xs truncate max-w-[120px]">{sub.org_name}</p>
                          {sub.addon_types.length > 0 && (
                            <p className="text-[10px] text-neutral-600 mt-0.5">{sub.addon_types.join(', ')}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
                          {sub.cancel_at_period_end && (
                            <span className="ml-1 text-[10px] text-orange-400">cancels</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-neutral-400 whitespace-nowrap">
                          {sub.trial_ends_at ? `Trial → ${fmtDate(sub.trial_ends_at)}` : fmtDate(sub.current_period_end)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-neutral-500 whitespace-nowrap">
                          {sub.payment_method_last4
                            ? `${cardBrand(sub.payment_method_brand)} ···${sub.payment_method_last4}`
                            : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right font-semibold text-neutral-300 whitespace-nowrap">
                          {sub.mrr_cents > 0 ? fmt(sub.mrr_cents) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-5 py-8 text-center">
                <CreditCard className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
                <p className="text-sm text-neutral-600">No active subscriptions yet</p>
                <p className="text-xs text-neutral-700 mt-1">Will populate when orgs subscribe</p>
              </div>
            )}
          </div>

          {/* Invoice history */}
          <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Recent Invoices</p>
              {financials.failed_invoices.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400">
                  <XCircle className="w-3 h-3" /> {financials.failed_invoices.length} failed
                </span>
              )}
            </div>

            {/* Failed invoices (shown first if any) */}
            {financials.failed_invoices.map(inv => (
              <div key={inv.id} className="px-4 py-3 border-b border-red-500/10 bg-red-500/5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-red-300 truncate">{inv.org_name}</p>
                  <p className="text-[10px] text-neutral-600 truncate">{inv.description || 'Invoice'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold text-red-400">{fmt(inv.amount_cents)}</span>
                  {inv.hosted_url && (
                    <a href={inv.hosted_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-rink-400 hover:text-rink-300">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Paid invoices */}
            {financials.recent_invoices.length > 0 ? (
              <div className="divide-y divide-white/[0.03]">
                {financials.recent_invoices.map(inv => (
                  <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-200 truncate">{inv.org_name}</p>
                      <p className="text-[10px] text-neutral-600 truncate">{inv.description || 'Invoice'} · {fmtUnix(inv.created)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-green-400">{fmt(inv.amount_cents)}</span>
                      {inv.hosted_url && (
                        <a href={inv.hosted_url} target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:text-neutral-400">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <Clock className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
                <p className="text-sm text-neutral-600">No invoices yet</p>
                <p className="text-xs text-neutral-700 mt-1">
                  {financials.stripe_available ? 'Stripe connected — invoices will appear here' : 'Stripe connection unavailable'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column: AI Usage + Bug Reports */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* AI Usage */}
        <div>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> AI Usage
          </h2>
          <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-5">
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Articles', value: fmtN(ai.articles_total), sub: 'all time' },
                { label: 'Tokens', value: fmtK(ai.tokens_total), sub: 'consumed' },
                { label: 'Avg Time', value: fmtMs(ai.avg_gen_ms), sub: 'per article' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-neutral-800/60 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-white">{value}</p>
                  <p className="text-xs font-semibold text-neutral-400 mt-0.5">{label}</p>
                  <p className="text-[10px] text-neutral-600">{sub}</p>
                </div>
              ))}
            </div>

            {/* Per-league breakdown */}
            {ai.by_league.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">By League</p>
                {ai.by_league.map((row) => (
                  <div key={row.league_id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-300 truncate flex-1">{row.league_name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-neutral-500 text-xs">{fmtK(row.tokens)} tok</span>
                      <span className="text-white font-semibold w-8 text-right">{row.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-600 text-center py-2">No articles generated yet</p>
            )}
          </div>
        </div>

        {/* Bug Reports */}
        <div>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bug className="w-3.5 h-3.5" /> Bug Reports
          </h2>
          <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-5">
            {/* Severity summary */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'critical', label: 'Critical', count: bugs.open_critical, icon: AlertTriangle, color: 'text-red-400' },
                { key: 'high', label: 'High', count: bugs.open_high, icon: AlertCircle, color: 'text-orange-400' },
                { key: 'medium', label: 'Medium', count: bugs.open_medium, icon: Info, color: 'text-yellow-400' },
                { key: 'low', label: 'Low', count: bugs.open_low, icon: Info, color: 'text-neutral-400' },
              ].map(({ key, label, count, icon: Icon, color }) => (
                <div key={key} className="bg-neutral-800/60 rounded-xl p-3 text-center">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                  <p className="text-lg font-black text-white">{count}</p>
                  <p className="text-[10px] text-neutral-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent reports */}
            {bugs.recent.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">Recent Open</p>
                {bugs.recent.map((bug) => {
                  const sev = SEVERITY_STYLE[bug.severity] ?? SEVERITY_STYLE.low;
                  return (
                    <div key={bug.id} className="flex items-start gap-3 py-2 border-t border-white/[0.04] first:border-0">
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200 line-clamp-1">{bug.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sev.badge}`}>{sev.label}</span>
                          {bug.league_name && <span className="text-[10px] text-neutral-600">{bug.league_name}</span>}
                          {bug.report_count > 1 && <span className="text-[10px] text-neutral-600">×{bug.report_count}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-700 flex-shrink-0 pt-1">{timeAgo(bug.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="w-6 h-6 text-green-500/50 mx-auto mb-2" />
                <p className="text-sm text-neutral-600">No open bug reports</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All Orgs Table */}
      <div>
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" /> All Organizations
        </h2>
        <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Org / League', 'Owner', 'Teams', 'Roster', 'Games', '30d', 'Addons', 'Status', 'Bypass', 'Joined', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-semibold text-white">{org.name}</p>
                      {org.primary_league_name && org.primary_league_name !== org.name && (
                        <p className="text-xs text-neutral-500">{org.primary_league_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-neutral-300 text-xs">{org.owner_name ?? '—'}</p>
                      {org.owner_email && <p className="text-neutral-600 text-xs">{org.owner_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-neutral-300">{org.team_count}</td>
                    <td className="px-4 py-3 text-neutral-300">{org.roster_count}</td>
                    <td className="px-4 py-3 text-neutral-300">{org.games_completed}</td>
                    <td className="px-4 py-3">
                      {org.games_last_30 > 0 ? (
                        <span className="text-rink-400 font-semibold">{org.games_last_30}</span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {org.has_ai_news && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-arena-500/15 text-arena-400">AI</span>}
                        {org.has_advanced_stats && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rink-500/15 text-rink-400">Stats</span>}
                        {!org.has_ai_news && !org.has_advanced_stats && <span className="text-neutral-600 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {org.has_platform_subscription ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-500 whitespace-nowrap">
                          <Clock className="w-3 h-3" /> None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form action={async () => { 'use server'; await toggleBypassGate(org.id, !org.bypass_subscription_gate); }}>
                        <button type="submit" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          org.bypass_subscription_gate
                            ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
                            : 'bg-neutral-800 text-neutral-600 hover:bg-neutral-700'
                        }`}>
                          <Zap className="w-3 h-3" />
                          {org.bypass_subscription_gate ? 'On' : 'Off'}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 text-xs whitespace-nowrap">{fmtDate(org.created_at)}</td>
                    <td className="px-4 py-3">
                      {org.primary_league_id ? (
                        <Link href={`/dashboard/leagues/${org.primary_league_id}`} className="inline-flex items-center gap-1 text-xs text-rink-400 hover:text-rink-300 transition-colors whitespace-nowrap">
                          Admin <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-neutral-700 text-xs">No league</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Growth — new user signups */}
      <div>
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UserPlus className="w-3.5 h-3.5" /> User Growth
        </h2>
        <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-black text-white">{fmtN(totals.new_users_30d)}</p>
              <p className="text-sm text-neutral-500 mt-1">new accounts in the last 30 days</p>
              <p className="text-xs text-neutral-600 mt-0.5">{fmtN(totals.total_users)} total registered users</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-600">
                {totals.total_users > 0
                  ? `${((totals.new_users_30d / totals.total_users) * 100).toFixed(0)}% of total joined this month`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
