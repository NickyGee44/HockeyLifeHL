import { notFound } from 'next/navigation';
import { Calendar, MapPin, Clock, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import { getLeagueBySlug } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

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
  if (!league) return { title: 'Events' };
  return {
    title: `Events | ${league.name}`,
    description: `Upcoming events, tournaments, and league activities for ${league.name}`,
  };
}

interface LeagueEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  start_time: string;
  end_time: string | null;
  is_published: boolean;
}

const EVENT_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  general: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'General' },
  practice: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Practice' },
  tournament: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Tournament' },
  social: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Social' },
  meeting: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Meeting' },
  fundraiser: { bg: 'bg-pink-500/10', text: 'text-pink-400', label: 'Fundraiser' },
};

async function getPublishedEvents(leagueId: string): Promise<LeagueEvent[]> {
  const supabase = await createClient();
  const { data } = await (supabase
    .from('league_events') as any)
    .select('id, title, description, event_type, location, start_time, end_time, is_published')
    .eq('league_id', leagueId)
    .eq('is_published', true)
    .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // show events from last week onward
    .order('start_time', { ascending: true });
  return (data ?? []) as LeagueEvent[];
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { leagueSlug } = await params;
  const league = await getLeagueBySlug(leagueSlug);
  if (!league) notFound();

  const events = await getPublishedEvents(league.id);

  // Group into upcoming and past
  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.start_time) >= now);
  const recent = events.filter((e) => new Date(e.start_time) < now);

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-6 h-6 text-[var(--league-primary)]" />
            <h1 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
              Events
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">{league.name}</p>
        </div>

        {events.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-secondary)] opacity-30" />
            <p className="text-lg font-semibold text-[var(--color-text-secondary)]">
              No upcoming events
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] opacity-60 mt-1">
              Check back soon for announcements.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">
                  Upcoming
                </h2>
                <div className="space-y-4">
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent / Past */}
            {recent.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-4">
                  Recent
                </h2>
                <div className="space-y-4 opacity-60">
                  {recent.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function EventCard({ event }: { event: LeagueEvent }) {
  const typeStyle = EVENT_TYPE_STYLES[event.event_type] ?? EVENT_TYPE_STYLES.general;
  const start = new Date(event.start_time);
  const end = event.end_time ? new Date(event.end_time) : null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--league-primary)]/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] truncate">
            {event.title}
          </h3>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
          <Tag className="w-3 h-3" />
          {typeStyle.label}
        </span>
      </div>

      {event.description && (
        <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
          {event.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {format(start, 'EEEE, MMMM d, yyyy · h:mm a')}
          {end && ` – ${format(end, 'h:mm a')}`}
        </span>
        {event.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {event.location}
          </span>
        )}
      </div>
    </div>
  );
}
