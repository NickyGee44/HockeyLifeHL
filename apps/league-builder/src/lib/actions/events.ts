'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

export type EventType = 'general' | 'practice' | 'tournament' | 'social' | 'meeting' | 'fundraiser';

export interface LeagueEvent {
  id: string;
  league_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  location: string | null;
  start_time: string;
  end_time: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all events for a league, ordered by start_time
 */
export async function getLeagueEvents(leagueId: string): Promise<{
  success: boolean;
  data?: LeagueEvent[];
  error?: string;
}> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('league_events') as any)
    .select('*')
    .eq('league_id', leagueId)
    .order('start_time', { ascending: false });

  if (error) {
    if (isDevelopment) console.error('Error fetching events:', error);
    return { success: false, error: 'Failed to fetch events' };
  }

  return { success: true, data: data || [] };
}

/**
 * Create a new league event
 */
export async function createEvent(params: {
  leagueId: string;
  title: string;
  description?: string;
  eventType: EventType;
  location?: string;
  startTime: string;
  endTime?: string;
}): Promise<{ success: boolean; data?: LeagueEvent; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('league_events') as any)
    .insert({
      league_id: params.leagueId,
      title: params.title,
      description: params.description || null,
      event_type: params.eventType,
      location: params.location || null,
      start_time: params.startTime,
      end_time: params.endTime || null,
      is_published: false,
    })
    .select()
    .single();

  if (error) {
    if (isDevelopment) console.error('Error creating event:', error);
    return { success: false, error: 'Failed to create event' };
  }

  revalidatePath(`/dashboard/leagues/${params.leagueId}/events`);
  return { success: true, data };
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  updates: {
    title?: string;
    description?: string;
    eventType?: EventType;
    location?: string;
    startTime?: string;
    endTime?: string;
    isPublished?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: event } = await (supabase
    .from('league_events') as any)
    .select('league_id')
    .eq('id', eventId)
    .single();

  if (!event) return { success: false, error: 'Event not found' };

  const access = await verifyLeagueOwnerAccess(event.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.eventType !== undefined) updateData.event_type = updates.eventType;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
  if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
  if (updates.isPublished !== undefined) updateData.is_published = updates.isPublished;

  const { error } = await (supabase
    .from('league_events') as any)
    .update(updateData)
    .eq('id', eventId);

  if (error) {
    if (isDevelopment) console.error('Error updating event:', error);
    return { success: false, error: 'Failed to update event' };
  }

  revalidatePath(`/dashboard/leagues/${event.league_id}/events`);
  return { success: true };
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: event } = await (supabase
    .from('league_events') as any)
    .select('league_id')
    .eq('id', eventId)
    .single();

  if (!event) return { success: false, error: 'Event not found' };

  const access = await verifyLeagueOwnerAccess(event.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const { error } = await (supabase
    .from('league_events') as any)
    .delete()
    .eq('id', eventId);

  if (error) {
    if (isDevelopment) console.error('Error deleting event:', error);
    return { success: false, error: 'Failed to delete event' };
  }

  revalidatePath(`/dashboard/leagues/${event.league_id}/events`);
  return { success: true };
}
