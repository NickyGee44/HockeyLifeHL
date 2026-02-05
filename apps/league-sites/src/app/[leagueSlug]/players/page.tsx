import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getLeagueBySlug, getTeams } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { User, Users, Search, Filter } from 'lucide-react';
import { PlayerDirectoryFilters } from '@/components/players/PlayerDirectoryFilters';
import { PlayerGrid } from '@/components/players/PlayerGrid';
import type { Metadata } from 'next';

interface PlayersPageProps {
  params: Promise<{ leagueSlug: string }>;
  searchParams: Promise<{ team?: string; position?: string; search?: string }>;
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
  } | null;
  team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
}

async function getPlayers(
  leagueId: string,
  filters?: { teamId?: string; position?: string; search?: string }
): Promise<PlayerWithTeam[]> {
  const supabase = await createClient();

  // Get all teams in this league
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', leagueId);

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
      profile:profiles(id, full_name, avatar_url),
      team:teams(id, name, slug, logo)
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

  // Transform and filter
  let players: PlayerWithTeam[] = data.map((p: any) => ({
    ...p,
    profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
    team: Array.isArray(p.team) ? p.team[0] : p.team,
  }));

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
  const { team, position, search } = await searchParams;

  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const [teams, players] = await Promise.all([
    getTeams(league.id),
    getPlayers(league.id, { teamId: team, position, search }),
  ]);

  // Get unique positions
  const positions = [...new Set(players.map((p) => p.position).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[var(--league-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Player Directory
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            {players.length} players across {teams.length} teams
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <PlayerDirectoryFilters
          teams={teams}
          positions={positions}
          selectedTeam={team}
          selectedPosition={position}
          searchQuery={search}
          leagueSlug={leagueSlug}
        />

        {/* Players Grid */}
        {players.length === 0 ? (
          <div className="text-center py-16">
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
  );
}
