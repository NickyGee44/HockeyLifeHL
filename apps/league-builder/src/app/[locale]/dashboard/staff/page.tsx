/**
 * Organization Staff Pool page
 *
 * Aggregated view of scorekeepers and referees across all leagues in the org.
 * Data stays in league_scorekeepers table — this is a cross-league view.
 */
import { setRequestLocale } from 'next-intl/server';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { Users, Flag, ClipboardList, Mail, Phone } from 'lucide-react';
import { cn } from '@hockey-life/ui';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function StaffPoolPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) redirect(`/${locale}/login`);

  const supabase = await createClient();

  // Get the user's organization
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name)')
    .eq('user_id', userData.user.id)
    .in('role', ['owner', 'admin'])
    .limit(1);

  const org = orgMembers?.[0]?.organizations as any;
  if (!org) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-black text-white mb-4">Staff Pool</h1>
          <p className="text-neutral-400">No organization found. Create an organization to manage staff.</p>
        </div>
      </div>
    );
  }

  // Get all leagues in the org
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, primary_color, logo_url')
    .eq('organization_id', org.id);

  const leagueIds = (leagues ?? []).map((l: any) => l.id);
  const leagueMap = new Map((leagues ?? []).map((l: any) => [l.id, l]));

  // Get all scorekeepers across all leagues
  const { data: scorekeepers } = leagueIds.length > 0
    ? await supabase
        .from('league_scorekeepers')
        .select('*')
        .in('league_id', leagueIds)
        .order('display_name')
    : { data: [] };

  // Group by league
  const byLeague = new Map<string, any[]>();
  for (const sk of scorekeepers ?? []) {
    const list = byLeague.get(sk.league_id) || [];
    list.push(sk);
    byLeague.set(sk.league_id, list);
  }

  const totalActive = (scorekeepers ?? []).filter((s: any) => s.is_active).length;
  const totalAll = (scorekeepers ?? []).length;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-rink-500" />
            Staff Pool
          </h1>
          <p className="text-neutral-400 mt-1">
            Scorekeepers and officials across all your leagues
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">Total Staff</p>
            <p className="text-3xl font-bold text-white">{totalAll}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">Active</p>
            <p className="text-3xl font-bold text-green-500">{totalActive}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4">
            <p className="text-sm text-neutral-400 mb-1">Leagues</p>
            <p className="text-3xl font-bold text-rink-500">{leagueIds.length}</p>
          </div>
        </div>

        {/* Staff by League */}
        {leagueIds.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-12 text-center">
            <Users className="w-16 h-16 text-rink-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Leagues Yet</h3>
            <p className="text-neutral-400">Create a league to start adding staff members.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(leagues ?? []).map((league: any) => {
              const leagueStaff = byLeague.get(league.id) || [];
              return (
                <div key={league.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: league.primary_color || '#22D3EE' }}
                    >
                      {league.name.slice(0, 2).toUpperCase()}
                    </div>
                    <h2 className="text-lg font-bold text-white">{league.name}</h2>
                    <span className="text-sm text-neutral-500">
                      {leagueStaff.length} {leagueStaff.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  {leagueStaff.length === 0 ? (
                    <p className="text-sm text-neutral-500 pl-11">
                      No staff members assigned to this league.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {leagueStaff.map((sk: any) => (
                        <div
                          key={sk.id}
                          className={cn(
                            'flex items-center gap-4 p-4 rounded-xl border transition-colors',
                            sk.is_active
                              ? 'bg-white/[0.04] border-white/10'
                              : 'bg-white/[0.02] border-white/[0.04] opacity-60'
                          )}
                        >
                          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-300">
                            {(sk.display_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {sk.display_name || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-neutral-500">
                              {sk.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="w-3 h-3" />
                                  {sk.email}
                                </span>
                              )}
                              {sk.total_assignments > 0 && (
                                <span className="flex items-center gap-1">
                                  <ClipboardList className="w-3 h-3" />
                                  {sk.completed_assignments}/{sk.total_assignments}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
                              sk.is_active
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-neutral-500/20 text-neutral-400'
                            )}
                          >
                            {sk.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
