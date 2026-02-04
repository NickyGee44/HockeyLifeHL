import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { getLeagueBySlug, getTeamBySlug, getTeamRoster } from '@/lib/data';
import type { Player } from '@/lib/types';
import { notFound } from 'next/navigation';

interface TeamPageProps {
  params: Promise<{ leagueSlug: string; teamSlug: string }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { leagueSlug, teamSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) return { title: 'Team Not Found' };

  const team = await getTeamBySlug(league.id, teamSlug);
  if (!team) return { title: 'Team Not Found' };

  return {
    title: team.name,
    description: `${team.name} roster and team information`,
  };
}

// Note: Team pages are generated on-demand with ISR
// We can't use generateStaticParams for nested routes that depend on parent data
// because cookies() isn't available during build time
// Teams will be dynamically rendered with 60s revalidation
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

export default async function TeamPage({ params }: TeamPageProps) {
  const { leagueSlug, teamSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) return null;

  const team = await getTeamBySlug(league.id, teamSlug);
  if (!team) {
    notFound();
  }

  const roster = await getTeamRoster(team.id);

  // Separate players by position
  const goalies = roster.filter((p) => p.position === 'G');
  const defensemen = roster.filter((p) => p.position === 'D');
  const forwards = roster.filter((p) => ['C', 'LW', 'RW'].includes(p.position || ''));
  const other = roster.filter(
    (p) => !p.position || !['G', 'D', 'C', 'LW', 'RW'].includes(p.position)
  );

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Back Link */}
      <Link
        href={`/${leagueSlug}/teams`}
        className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Teams
      </Link>

      {/* Team Header */}
      <div className="card p-8 mb-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Team Logo */}
          {team.logo ? (
            <Image
              src={team.logo}
              alt={team.name}
              width={120}
              height={120}
              className="rounded-2xl"
            />
          ) : (
            <div
              className="w-28 h-28 rounded-2xl flex items-center justify-center text-4xl font-bold"
              style={{
                backgroundColor: team.colors || 'var(--league-primary)',
                color: 'var(--color-background)',
              }}
            >
              {team.name.charAt(0)}
            </div>
          )}

          {/* Team Info */}
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{team.name}</h1>
            {team.division && (
              <p className="text-[var(--color-text-secondary)]">
                {team.division.name} Division
              </p>
            )}
          </div>

          {/* Team Stats */}
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--league-primary)]">
                {roster.length}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)]">Players</div>
            </div>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Users className="w-6 h-6 text-[var(--league-primary)]" />
          Roster
        </h2>

        {roster.length > 0 ? (
          <div className="space-y-8">
            {/* Goalies */}
            {goalies.length > 0 && (
              <RosterSection title="Goaltenders" players={goalies} />
            )}

            {/* Defensemen */}
            {defensemen.length > 0 && (
              <RosterSection title="Defensemen" players={defensemen} />
            )}

            {/* Forwards */}
            {forwards.length > 0 && (
              <RosterSection title="Forwards" players={forwards} />
            )}

            {/* Other */}
            {other.length > 0 && (
              <RosterSection title="Players" players={other} />
            )}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Users className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
            <p className="text-[var(--color-text-secondary)]">
              The roster will appear here once players are added.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RosterSection({ title, players }: { title: string; players: Player[] }) {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-secondary)]">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </section>
  );
}

function PlayerCard({ player }: { player: Player }) {
  const fullName = player.profile
    ? `${player.profile.first_name} ${player.profile.last_name}`
    : 'Unknown Player';

  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        {/* Jersey Number */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
          style={{
            backgroundColor: 'var(--league-primary)',
            color: 'var(--color-background)',
          }}
        >
          {player.jersey_number || '-'}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold truncate">{fullName}</h4>
            {player.is_captain && (
              <span className="text-xs bg-gold-500/20 text-gold-500 px-1.5 py-0.5 rounded font-medium">
                C
              </span>
            )}
            {player.is_alternate && !player.is_captain && (
              <span className="text-xs bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded font-medium">
                A
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {getPositionLabel(player.position)}
          </p>
        </div>
      </div>
    </div>
  );
}

function getPositionLabel(position: string | null): string {
  const positions: Record<string, string> = {
    C: 'Center',
    LW: 'Left Wing',
    RW: 'Right Wing',
    D: 'Defense',
    G: 'Goaltender',
  };
  return positions[position || ''] || 'Player';
}
