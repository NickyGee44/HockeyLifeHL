import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getLeagueBySlug, getTeams } from '@/lib/data/league';
import { Users, ChevronRight } from 'lucide-react';

type Props = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: 'Teams',
};

export default async function TeamsPage({ params }: Props) {
  const { slug } = await params;
  const league = await getLeagueBySlug(slug);

  if (!league) return null;

  const teams = await getTeams(league.id);
  const basePath = `/league/${slug}`;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-[var(--league-primary)]" />
          Teams
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-1">
          {teams.length} team{teams.length !== 1 ? 's' : ''} in the league
        </p>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <Users className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            No teams available yet
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="group bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--league-primary)]/50 transition-all hover:shadow-lg hover:shadow-[var(--league-primary)]/5"
            >
              {/* Team Header with Color */}
              <div
                className="h-24 relative"
                style={{
                  background: `linear-gradient(135deg, ${team.primaryColor || '#333'} 0%, ${team.secondaryColor || '#000'} 100%)`,
                }}
              >
                {/* Team Logo */}
                <div className="absolute -bottom-8 left-6">
                  {team.logoUrl ? (
                    <Image
                      src={team.logoUrl}
                      alt={team.name}
                      width={64}
                      height={64}
                      className="rounded-xl border-4 border-[var(--color-surface)] shadow-lg"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-xl border-4 border-[var(--color-surface)] shadow-lg flex items-center justify-center text-2xl font-black"
                      style={{
                        backgroundColor: team.primaryColor || '#333',
                        color: team.secondaryColor || '#fff',
                      }}
                    >
                      {team.shortName.substring(0, 2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Team Info */}
              <div className="p-6 pt-12">
                <h2 className="text-xl font-bold mb-1">{team.name}</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {team.shortName}
                </p>

                {/* Color Swatches */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Team Colors:
                  </span>
                  <div
                    className="w-6 h-6 rounded-full border border-[var(--color-border)]"
                    style={{ backgroundColor: team.primaryColor || '#333' }}
                    title="Primary"
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-[var(--color-border)]"
                    style={{ backgroundColor: team.secondaryColor || '#000' }}
                    title="Secondary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
