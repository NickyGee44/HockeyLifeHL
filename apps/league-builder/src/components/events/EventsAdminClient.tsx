'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cn } from '@hockey-life/ui';
import { Plus, Trash2, Eye, EyeOff, Calendar, MapPin, Pencil, X } from 'lucide-react';
import { createEvent, updateEvent, deleteEvent, type EventType } from '@/lib/actions/events';

interface LeagueEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  location: string | null;
  start_time: string;
  end_time: string | null;
  is_published: boolean;
}

interface EventsAdminClientProps {
  leagueId: string;
  locale: string;
  events: LeagueEvent[];
}

const EVENT_TYPES: EventType[] = ['general', 'practice', 'tournament', 'social', 'meeting', 'fundraiser'];

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  general: 'bg-blue-500/10 text-blue-400',
  practice: 'bg-green-500/10 text-green-400',
  tournament: 'bg-purple-500/10 text-purple-400',
  social: 'bg-yellow-500/10 text-yellow-400',
  meeting: 'bg-orange-500/10 text-orange-400',
  fundraiser: 'bg-pink-500/10 text-pink-400',
};

export function EventsAdminClient({ leagueId, locale, events }: EventsAdminClientProps) {
  const t = useTranslations('events');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('general');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  function resetForm() {
    setTitle('');
    setDescription('');
    setEventType('general');
    setLocation('');
    setStartTime('');
    setEndTime('');
    setShowForm(false);
    setEditingId(null);
  }

  function startEditing(event: LeagueEvent) {
    setTitle(event.title);
    setDescription(event.description || '');
    setEventType(event.event_type);
    setLocation(event.location || '');
    setStartTime(event.start_time.slice(0, 16)); // Format for datetime-local
    setEndTime(event.end_time?.slice(0, 16) || '');
    setEditingId(event.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim() || !startTime) return;

    startTransition(async () => {
      if (editingId) {
        await updateEvent(editingId, {
          title: title.trim(),
          description: description.trim() || undefined,
          eventType,
          location: location.trim() || undefined,
          startTime: new Date(startTime).toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
        });
      } else {
        await createEvent({
          leagueId,
          title: title.trim(),
          description: description.trim() || undefined,
          eventType,
          location: location.trim() || undefined,
          startTime: new Date(startTime).toISOString(),
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
        });
      }
      resetForm();
      router.refresh();
    });
  }

  async function handleDelete(eventId: string) {
    if (!confirm(t('confirmDelete'))) return;

    startTransition(async () => {
      await deleteEvent(eventId);
      router.refresh();
    });
  }

  async function handleTogglePublish(eventId: string, currentlyPublished: boolean) {
    startTransition(async () => {
      await updateEvent(eventId, { isPublished: !currentlyPublished });
      router.refresh();
    });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div>
      {/* Actions */}
      <div className="mb-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            <Plus className="w-4 h-4" />
            {t('newEvent')}
          </button>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? t('editEvent') : t('newEvent')}
              </h3>
              <button onClick={resetForm} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('eventTitle')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('eventType')}</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('location')}</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('startTime')}</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('endTime')}</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-white focus:ring-2 focus:ring-rink-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isPending || !title.trim() || !startTime}
                className="px-5 py-2 rounded-lg font-semibold text-sm bg-rink-500 text-black hover:bg-rink-400 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create Event'}
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-2 rounded-lg font-semibold text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">{t('noEvents')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold truncate">{event.title}</h3>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', EVENT_TYPE_COLORS[event.event_type])}>
                      {t(event.event_type)}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full shrink-0',
                        event.is_published
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-neutral-700 text-neutral-400'
                      )}
                    >
                      {event.is_published ? t('published') : 'Draft'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateTime(event.start_time)}
                    </span>
                    {event.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{event.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTogglePublish(event.id, event.is_published)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    {event.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEditing(event)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
