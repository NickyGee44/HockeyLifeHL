import { notFound } from 'next/navigation';
import { SubscriptionWall } from '@/components/shared';
import { getLeagueBySlug, getTeams, getDivisions } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { User, Users } from 'lucide-react';
import { PlayerDirectoryFilters } from '@/components/players/PlayerDirectoryFilters';
import { PlayerGrid } from '@/components/players/PlayerGrid';
import { resolvePlayerPhotoUrl } from '@/lib/player-photo';
import type { Metadata } from 'next';

interface PlayersPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ team?: string; position?: string; search?: string; division?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Players | League Not Found' };
  }

  return {
    title: `Players | ${league.name}`,
    description: `View all players in ${league.name}`,
  };
}

interface PlayerWithTeam {
  id: string;
  jersey_number: number | null;
  position: string | null;
  leadership_role: 'captain' | 'alternate_captain' | null;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    photo_url?: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    division_id: string | null;
  } | null;
}

async function getPlayers(
  leagueId: string,
  filters?: { teamId?: string; position?: string; search?: string; divisionId?: string }
): Promise<PlayerWithTeam[]> {
  const supabase = await createClient();

  // Get teams in this league, optionally filtered by division
  let teamsQuery = supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId);

  if (filters?.divisionId) {
    teamsQuery = teamsQuery.eq('division_id', filters.divisionId);
  }

  const { data: teams } = await teamsQuery;

  if (!teams || teams.length === 0) {
    return [];
  }

  const teamIds = teams.map((t) => t.id);

  let query = supabase
    .from('team_rosters')
    .select(`
      id,
      jersey_number,
      position,
      leadership_role,
      profile:profiles(id, full_name, avatar_url, photo_url),
      team:teams(id, name, slug, logo_url, division_id)
    `)
    .in('team_id', teamIds);

  if (filters?.teamId) {
    query = query.eq('team_id', filters.teamId);
  }

  if (filters?.position) {
    query = query.eq('position', filters.position);
  }

  const { data, error } = await query.order('jersey_number', { ascending: true });

  if (error || !data) {
    return [];
  }

  // Transform rows, then dedupe by profile so one player only appears once
  const rosterRows: PlayerWithTeam[] = data.map((p: any) => {
    const rawTeam = Array.isArray(p.team) ? p.team[0] : p.team;
    const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile;

    return {
      ...p,
      id: profile?.id || p.id,
      profile: profile ? {
        ...profile,
        avatar_url: resolvePlayerPhotoUrl(profile),
      } : null,
      team: rawTeam ? { ...rawTeam, logo: rawTeam.logo_url } : null,
    };
  });

  const uniquePlayers = new Map<string, PlayerWithTeam>();
  for (const player of rosterRows) {
    const dedupeKey = player.profile?.id || player.id;
    if (!uniquePlayers.has(dedupeKey)) {
      uniquePlayers.set(dedupeKey, player);
    }
  }

  let players = Array.from(uniquePlayers.values());

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    players = players.filter((p) => {
      const name = (p.profile?.full_name || '').toLowerCase();
      const jersey = String(p.jersey_number || '').toLowerCase();
      return name.includes(searchLower) || jersey.includes(searchLower);
    });
  }

  return players;
}

export default async function PlayersPage({ params, searchParams }: PlayersPageProps) {
  const { leagueSlug } = await params;
  const { team, position, search, division: divisionFilter } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const [allTeams, divisions, players] = await Promise.all([
    getTeams(league.id),
    getDivisions(league.id),
    getPlayers(league.id, { teamId: team, position, search, divisionId: divisionFilter }),
  ]);

  // Filter the teams dropdown to match the selected division
  const filteredTeams = divisionFilter
    ? allTeams.filter((t: any) => t.division_id === divisionFilter)
    : allTeams;

  // Get unique positions
  const positions = [...new Set(players.map((p) => p.position).filter(Boolean))] as string[];

  return (
    <SubscriptionWall>
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--league-primary)_14%,transparent),color-mix(in_srgb,var(--color-surface)_92%,transparent))]">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/10 flex items-center justify-center lg:h-14 lg:w-14 lg:rounded-2xl lg:border lg:border-[var(--league-primary)]/20">
              <Users className="w-5 h-5 text-[var(--league-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] lg:text-4xl lg:font-black">
              Player Directory
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            {players.length} players across {filteredTeams.length} teams
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
          <PlayerDirectoryFilters
            teams={filteredTeams}
            divisions={divisions}
            positions={positions}
            selectedTeam={team}
            selectedPosition={position}
            selectedDivision={divisionFilter}
            searchQuery={search}
            leagueSlug={leagueSlug}
          />

          <div>
            <div className="mb-4 hidden items-center justify-between gap-4 lg:flex">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Roster browser
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
                  {players.length} active listing{players.length === 1 ? '' : 's'}
                </h2>
              </div>
              <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/72 px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)]">
                Dense list view
              </div>
            </div>

            {players.length === 0 ? (
              <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)]/68 py-16 text-center">
                <User className="w-16 h-16 mx-auto text-[var(--color-text-muted)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  No players found
                </h3>
                <p className="text-[var(--color-text-secondary)]">
                  {search
                    ? `No players match "${search}"`
                    : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <PlayerGrid players={players} leagueSlug={leagueSlug} />
            )}
          </div>
        </div>
      </div>
    </div>
    </SubscriptionWall>
  );
}
