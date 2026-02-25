import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { getPlatformAdminData, toggleBypassGate } from '@/lib/actions/platform-admin';
import { Building2, Users, Trophy, BarChart3, DollarSign, Zap, ExternalLink, CheckCircle2, Clock, Shield } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatMrr(cents: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function PlatformAdminPage() {
  const locale = await getLocale();
  const userData = await getCurrentUser();

  if (!userData?.profile?.is_platform_admin) {
    redirect(`/${locale}/dashboard`);
  }

  const { orgs, totals } = await getPlatformAdminData();

  const stats = [
    { label: 'Organizations', value: totals.org_count, icon: Building2, color: 'text-rink-400' },
    { label: 'Leagues', value: totals.league_count, icon: Trophy, color: 'text-arena-400' },
    { label: 'Teams', value: totals.team_count, icon: Shield, color: 'text-blue-400' },
    { label: 'Players', value: totals.player_count, icon: Users, color: 'text-purple-400' },
    { label: 'Subscribed', value: totals.subscribed_count, icon: CheckCircle2, color: 'text-green-400' },
    { label: 'On Bypass', value: totals.bypass_count, icon: Zap, color: 'text-yellow-400' },
    { label: 'MRR', value: formatMrr(totals.mrr_cents), icon: DollarSign, color: 'text-emerald-400', wide: true },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-black" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Overview</h1>
        </div>
        <p className="text-sm text-neutral-400 ml-11">Beer League Hockey — internal admin view</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`bg-neutral-900 border border-white/[0.07] rounded-xl p-4 ${(s as any).wide ? 'col-span-2 sm:col-span-1' : ''}`}>
            <s.icon className={`w-4 h-4 mb-2 ${s.color}`} />
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Organizations Table */}
      <div className="bg-neutral-900 border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">All Organizations</h2>
          <span className="text-xs text-neutral-500">{orgs.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Organization', 'Owner', 'Leagues', 'Teams', 'Players', 'Subscription', 'Bypass Gate', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{org.name}</td>
                  <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">
                    <div>{org.owner_name ?? '—'}</div>
                    {org.owner_email && <div className="text-xs text-neutral-600">{org.owner_email}</div>}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{org.league_count}</td>
                  <td className="px-4 py-3 text-neutral-300">{org.team_count}</td>
                  <td className="px-4 py-3 text-neutral-300">{org.player_count}</td>
                  <td className="px-4 py-3">
                    {org.has_platform_subscription ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-500">
                        <Clock className="w-3 h-3" /> None
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={async () => {
                        'use server';
                        await toggleBypassGate(org.id, !org.bypass_subscription_gate);
                      }}
                    >
                      <button
                        type="submit"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          org.bypass_subscription_gate
                            ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
                            : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        {org.bypass_subscription_gate ? 'Bypassed' : 'Off'}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">{formatDate(org.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/leagues`}
                      className="inline-flex items-center gap-1 text-xs text-rink-400 hover:text-rink-300 transition-colors"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
