import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { getPlatformAdminData, toggleBypassGate } from '@/lib/actions/platform-admin';
import {
  Building2, Users, Trophy, BarChart3, DollarSign, Zap,
  ExternalLink, CheckCircle2, Clock, Shield, Activity,
  TrendingUp, Gamepad2, Calendar,
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

export default async function PlatformAdminPage() {
  const locale = await getLocale();
  const userData = await getCurrentUser();

  if (!userData?.profile?.is_platform_admin) {
    redirect(`/${locale}/dashboard`);
  }

  const { orgs, totals } = await getPlatformAdminData();

  // Separate active (bypass/subscribed) from test orgs
  const activeOrgs = orgs.filter(o => o.league_count > 0 && (o.bypass_subscription_gate || o.has_platform_subscription));
  const otherOrgs = orgs.filter(o => !activeOrgs.includes(o));

  const keyStats = [
    { label: 'Total Users', value: fmtN(totals.total_users), icon: Users, color: 'text-purple-400', sub: 'registered accounts' },
    { label: 'Roster Spots', value: fmtN(totals.roster_count), icon: Shield, color: 'text-blue-400', sub: 'across all leagues' },
    { label: 'Games Played', value: fmtN(totals.games_completed), icon: Gamepad2, color: 'text-rink-400', sub: 'completed games' },
    { label: 'Teams', value: fmtN(totals.team_count), icon: Trophy, color: 'text-arena-400', sub: 'active teams' },
    { label: 'Active Seasons', value: totals.active_seasons, icon: Calendar, color: 'text-green-400', sub: 'seasons running' },
    { label: 'Orgs', value: totals.org_count, icon: Building2, color: 'text-neutral-400', sub: `${totals.bypass_count} on bypass` },
    { label: 'MRR', value: fmt(totals.mrr_cents), icon: DollarSign, color: 'text-emerald-400', sub: 'monthly recurring' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1400px] mx-auto space-y-8">

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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {keyStats.map((s) => (
          <div key={s.label} className="bg-neutral-900 border border-white/[0.07] rounded-xl p-4">
            <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-xs font-semibold text-neutral-400 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-neutral-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline — active / bypassed leagues */}
      {activeOrgs.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Active Leagues
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeOrgs.map((org) => (
              <div key={org.id} className="bg-neutral-900 border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4">
                {/* Org header */}
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

                {/* Stats grid */}
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

                {/* Addons + link */}
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

    </div>
  );
}
