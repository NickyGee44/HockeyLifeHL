import { notFound } from 'next/navigation';
import { getLeagueBySlug } from '@/lib/data';
import { GoalieRegistrationForm } from '@/components/goalies/GoalieRegistrationForm';

interface Props {
  params: Promise<{ leagueSlug: string }>;
}

export default async function GoalieRegisterPage({ params }: Props) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <GoalieRegistrationForm leagueSlug={leagueSlug} />
    </div>
  );
}
