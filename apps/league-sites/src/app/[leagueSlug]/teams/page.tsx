import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLeagueBySlug, getTeams, getDivisions } from '@/lib/data';
import { TeamsGrid } from './TeamsGrid';

interface TeamsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export const metadata: Metadata = {
  title: 'Teams',
  description: 'View all teams in the league',
};

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const [teams, divisions] = await Promise.all([
    getTeams(league.id),
    getDivisions(league.id),
  ]);

  return (
    <TeamsGrid
      teams={teams}
      divisions={divisions}
      leagueSlug={leagueSlug}
    />
  );
}
