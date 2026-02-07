import { notFound } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { getLeagueBySlug, getLeagueEvents } from '@/lib/data';
import { EventCalendar } from '@/components/events/EventCalendar';
import type { Metadata } from 'next';

interface EventsPageProps {
  params: Promise<{ leagueSlug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueSlug: string }>;
}): Promise<Metadata> {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) {
    return { title: 'Events | League Not Found' };
  }

  return {
    title: `Events | ${league.name}`,
    description: `Upcoming events for ${league.name}`,
  };
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);

  if (!league) notFound();

  const events = await getLeagueEvents(league.id);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Events
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <EventCalendar events={events} />
      </div>
    </div>
  );
}
