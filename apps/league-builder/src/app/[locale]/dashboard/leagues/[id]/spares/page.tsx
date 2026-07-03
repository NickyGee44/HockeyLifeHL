import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { addLeagueSpare, removeLeagueSpare } from '@/lib/actions/league-spares';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ q?: string }>;
};

function cleanSearch(value: string | undefined) {
  return (value || '').replace(/[,%]/g, ' ').trim().slice(0, 80);
}

export default async function LeagueSparesPage({ params, searchParams }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  const queryParams = await searchParams;
  const q = cleanSearch(queryParams?.q);
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });
  const serviceSupabase = createServiceRoleClient();

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  const { data: activeSpares } = await (serviceSupabase as any)
    .from('league_spare_pool')
    .select(`
      player_id,
      position,
      updated_at,
      profile:profiles!league_spare_pool_player_id_fkey(id, full_name, email, phone)
    `)
    .eq('league_id', leagueId)
    .eq('active', true)
    .order('updated_at', { ascending: false });

  const activeIds = new Set<string>((activeSpares || []).map((row: any) => row.player_id).filter(Boolean));
  const candidates = q.length >= 2
    ? await loadCandidatePlayers(serviceSupabase, q, activeIds)
    : [];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-rink-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {league.name}
          </Link>

          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: league.primary_color || '#22D3EE' }}
            >
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Active Spares</h1>
              <p className="mt-1 text-neutral-400">
                Control which league-wide spare players captains can invite on Game Day.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">League Spare Pool</h2>
                <p className="text-sm text-neutral-400">Only active players here appear in captain spare search.</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                {(activeSpares || []).length} active
              </span>
            </div>

            <div className="space-y-3">
              {(activeSpares || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-neutral-400">
                  No league spares are active yet.
                </div>
              ) : null}

              {(activeSpares || []).map((row: any) => {
                const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
                return (
                  <div key={row.player_id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{profile?.full_name || 'Unnamed player'}</p>
                      <p className="truncate text-sm text-neutral-400">
                        {[row.position, profile?.email, profile?.phone].filter(Boolean).join(' · ') || 'Active spare'}
                      </p>
                    </div>
                    <form action={removeLeagueSpare}>
                      <input type="hidden" name="leagueId" value={leagueId} />
                      <input type="hidden" name="playerId" value={row.player_id} />
                      <input type="hidden" name="locale" value={locale} />
                      <button className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-400/15">
                        Remove
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-bold text-white">Add Spare</h2>
            <p className="mt-1 text-sm text-neutral-400">Search by name or email, then add the player to the league-wide active pool.</p>

            <form className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search players..."
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-rink-500/60"
                />
              </div>
              <button className="rounded-xl bg-rink-500 px-4 py-2.5 text-sm font-bold text-neutral-950">
                Search
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {q.length > 0 && q.length < 2 ? (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                  Type at least 2 characters.
                </p>
              ) : null}

              {q.length >= 2 && candidates.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
                  No inactive matching players found.
                </p>
              ) : null}

              {candidates.map((player) => (
                <div key={player.id} className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{player.full_name || 'Unnamed player'}</p>
                      <p className="truncate text-sm text-neutral-400">{[player.email, player.phone].filter(Boolean).join(' · ') || 'No contact info'}</p>
                    </div>
                    <form action={addLeagueSpare} className="flex items-center gap-2">
                      <input type="hidden" name="leagueId" value={leagueId} />
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <select name="position" className="hidden rounded-lg border border-white/10 bg-neutral-950 px-2 py-2 text-sm text-white sm:block">
                        <option value="">Any</option>
                        <option value="Forward">Forward</option>
                        <option value="Defense">Defense</option>
                        <option value="Goalie">Goalie</option>
                      </select>
                      <button className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20">
                        <UserPlus className="h-4 w-4" />
                        Add
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

async function loadCandidatePlayers(
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
  query: string,
  activeIds: Set<string>,
) {
  const pattern = `%${query}%`;
  const { data } = await serviceSupabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .order('full_name')
    .limit(20);

  return (data || []).filter((player) => !activeIds.has(player.id));
}
