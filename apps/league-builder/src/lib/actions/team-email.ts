'use server';

import { createClient } from '@/lib/supabase/server';
import { sendBatchEmails, type BatchEmailRecipient } from '@/lib/notifications/email-service';
import { getLeagueAnnouncementEmail } from '@/lib/notifications/templates/league-announcement';

interface SendTeamEmailParams {
  teamId: string;
  subject: string;
  content: string;
  recipientFilter: 'all' | 'captains';
}

interface SendLeagueEmailParams {
  leagueId: string;
  subject: string;
  content: string;
  recipientFilter: 'all' | 'captains';
}

interface EmailResult {
  success: boolean;
  sentCount: number;
  error?: string;
}

/**
 * Send an email blast to all players (or captains only) on a team.
 */
export async function sendTeamEmail(params: SendTeamEmailParams): Promise<EmailResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, sentCount: 0, error: 'Not authenticated' };

  // Get team info
  const { data: team } = await supabase
    .from('teams')
    .select('name, league_id')
    .eq('id', params.teamId)
    .single();

  if (!team) return { success: false, sentCount: 0, error: 'Team not found' };

  // Get league name for branding
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', team.league_id)
    .single();

  // Build roster query with contact info
  let query = supabase
    .from('team_rosters')
    .select('leadership_role, profile:profiles(full_name, email)')
    .eq('team_id', params.teamId)
    .eq('status', 'active');

  if (params.recipientFilter === 'captains') {
    query = query.in('leadership_role', ['captain', 'alternate_captain']);
  }

  const { data: roster, error } = await query;
  if (error || !roster) return { success: false, sentCount: 0, error: 'Failed to fetch roster' };

  // Build recipient list
  const recipients: BatchEmailRecipient[] = [];
  for (const row of roster) {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    if (profile?.email) {
      recipients.push({
        email: profile.email,
        name: profile.full_name || undefined,
      });
    }
  }

  if (recipients.length === 0) {
    return { success: false, sentCount: 0, error: 'No recipients with email addresses found' };
  }

  // Send batch with per-recipient personalized template
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';
  const senderName = `${team.name} via ${league?.name || 'BeerLeagueHockey'}`;

  const result = await sendBatchEmails(
    recipients,
    params.subject,
    (recipient) =>
      getLeagueAnnouncementEmail({
        recipientName: recipient.name || 'Player',
        subject: params.subject,
        content: params.content,
        priority: 'normal',
        senderName,
        dashboardUrl: siteUrl,
        leagueName: league?.name || 'League',
      }),
    {
      tags: [
        { name: 'type', value: 'team-email' },
        { name: 'team_id', value: params.teamId },
      ],
    }
  );

  return {
    success: result.successful > 0,
    sentCount: result.successful,
    error: result.failed > 0 ? `${result.failed} emails failed to send` : undefined,
  };
}

/**
 * Send an email blast to all players (or captains only) across all teams in a league.
 */
export async function sendLeagueEmail(params: SendLeagueEmailParams): Promise<EmailResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, sentCount: 0, error: 'Not authenticated' };

  // Get league info
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', params.leagueId)
    .single();

  if (!league) return { success: false, sentCount: 0, error: 'League not found' };

  // Get all teams in the league
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('league_id', params.leagueId);

  if (!teams || teams.length === 0) {
    return { success: false, sentCount: 0, error: 'No teams found' };
  }

  // Build roster query with contact info
  let query = supabase
    .from('team_rosters')
    .select('leadership_role, profile:profiles(full_name, email)')
    .in(
      'team_id',
      teams.map((t) => t.id)
    )
    .eq('status', 'active');

  if (params.recipientFilter === 'captains') {
    query = query.in('leadership_role', ['captain', 'alternate_captain']);
  }

  const { data: roster, error } = await query;
  if (error || !roster) return { success: false, sentCount: 0, error: 'Failed to fetch rosters' };

  // Deduplicate by email (a player could be on multiple teams)
  const seen = new Set<string>();
  const recipients: BatchEmailRecipient[] = [];
  for (const row of roster) {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    if (profile?.email && !seen.has(profile.email)) {
      seen.add(profile.email);
      recipients.push({
        email: profile.email,
        name: profile.full_name || undefined,
      });
    }
  }

  if (recipients.length === 0) {
    return { success: false, sentCount: 0, error: 'No recipients with email addresses found' };
  }

  // Send batch with per-recipient personalized template
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';

  const result = await sendBatchEmails(
    recipients,
    params.subject,
    (recipient) =>
      getLeagueAnnouncementEmail({
        recipientName: recipient.name || 'Player',
        subject: params.subject,
        content: params.content,
        priority: 'normal',
        senderName: league.name,
        dashboardUrl: siteUrl,
        leagueName: league.name,
      }),
    {
      tags: [
        { name: 'type', value: 'league-email' },
        { name: 'league_id', value: params.leagueId },
      ],
    }
  );

  return {
    success: result.successful > 0,
    sentCount: result.successful,
    error: result.failed > 0 ? `${result.failed} emails failed to send` : undefined,
  };
}
