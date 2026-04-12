import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCronSecret } from '@/lib/api/guards';
import { sendScorekeeperDailyReminder } from '@/lib/email/scorekeeper-emails';
import { format } from 'date-fns';

/**
 * Vercel Cron route: Send day-of reminder emails to assigned scorekeepers.
 * Schedule: 8:00 AM daily (0 8 * * *)
 *
 * For each game today that has an active scorekeeper_session:
 * - Looks up the scorekeeper via league_scorekeepers
 * - Sends a reminder email with the token-embedded access link
 * - Groups multiple games per scorekeeper into a single email
 */
export async function GET(request: NextRequest) {
  const auth = requireCronSecret(request);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date();

    // Build today's date window (start of day to end of day in UTC)
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Find all games today that have active scorekeeper sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('scorekeeper_sessions')
      .select(`
        id,
        token,
        game_id,
        league_id,
        league_scorekeeper_id,
        scorekeeper_id,
        games!inner(
          id,
          scheduled_at,
          location,
          status,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name),
          league:leagues!games_league_id_fkey(name)
        )
      `)
      .eq('is_active', true)
      .gte('expires_at', now.toISOString());

    if (sessionsError) {
      console.error('[cron/scorekeeper-reminders] Error fetching sessions:', sessionsError.message);
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        sent: 0,
        skipped: 0,
        errors: 0,
        message: 'No active scorekeeper sessions found',
        timestamp: now.toISOString(),
      });
    }

    // Filter to only games scheduled today
    const todaySessions = (sessions as any[]).filter((s) => {
      const game = s.games;
      if (!game || game.status !== 'scheduled') return false;
      const scheduledAt = new Date(game.scheduled_at);
      return scheduledAt >= todayStart && scheduledAt <= todayEnd;
    });

    if (todaySessions.length === 0) {
      return NextResponse.json({
        sent: 0,
        skipped: 0,
        errors: 0,
        message: 'No games scheduled for today',
        timestamp: now.toISOString(),
      });
    }

    // Collect all league_scorekeeper_ids and scorekeeper_ids to look up emails
    const leagueScorekeeperIds = [
      ...new Set(todaySessions.map((s) => s.league_scorekeeper_id).filter(Boolean)),
    ];
    const scorekeeperProfileIds = [
      ...new Set(todaySessions.map((s) => s.scorekeeper_id).filter(Boolean)),
    ];

    // Fetch league_scorekeepers for email/name
    const scorekeeperMap = new Map<string, { email: string; name: string }>();

    if (leagueScorekeeperIds.length > 0) {
      const { data: leagueSks } = await supabase
        .from('league_scorekeepers')
        .select('id, email, display_name, scorekeeper_id')
        .in('id', leagueScorekeeperIds);

      for (const sk of (leagueSks ?? []) as any[]) {
        if (sk.email) {
          scorekeeperMap.set(sk.id, {
            email: sk.email,
            name: sk.display_name || 'Scorekeeper',
          });
        }
      }
    }

    // Fallback: fetch profile emails for sessions linked by scorekeeper_id
    if (scorekeeperProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', scorekeeperProfileIds);

      for (const p of (profiles ?? []) as any[]) {
        // Store with profile id prefix to distinguish from league_scorekeeper ids
        scorekeeperMap.set(`profile:${p.id}`, {
          email: p.email,
          name: p.full_name || 'Scorekeeper',
        });
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Group sessions by scorekeeper email so we can send one email per person
    const emailGroups = new Map<
      string,
      {
        name: string;
        leagueName: string;
        games: Array<{
          homeTeamName: string;
          awayTeamName: string;
          gameTime: string;
          venue: string;
          accessLink: string;
        }>;
      }
    >();

    let skipped = 0;

    for (const session of todaySessions) {
      const game = session.games as any;

      // Resolve scorekeeper contact info
      let contact: { email: string; name: string } | undefined;
      if (session.league_scorekeeper_id) {
        contact = scorekeeperMap.get(session.league_scorekeeper_id);
      }
      if (!contact && session.scorekeeper_id) {
        contact = scorekeeperMap.get(`profile:${session.scorekeeper_id}`);
      }

      if (!contact?.email) {
        skipped++;
        continue;
      }

      const scheduledAt = new Date(game.scheduled_at);
      const accessLink = `${siteUrl}/en/scorekeeper?token=${session.token}`;

      const gameEntry = {
        homeTeamName: game.home_team?.name || 'Home',
        awayTeamName: game.away_team?.name || 'Away',
        gameTime: format(scheduledAt, 'h:mm a'),
        venue: game.location || 'TBD',
        accessLink,
      };

      const existing = emailGroups.get(contact.email);
      if (existing) {
        existing.games.push(gameEntry);
      } else {
        emailGroups.set(contact.email, {
          name: contact.name,
          leagueName: game.league?.name || 'Beer League Hockey',
          games: [gameEntry],
        });
      }
    }

    // Send grouped emails
    let sent = 0;
    let errors = 0;
    const formattedDate = format(now, 'EEEE, MMMM d, yyyy');

    for (const [email, group] of emailGroups) {
      const result = await sendScorekeeperDailyReminder({
        to: email,
        scorekeeperName: group.name,
        leagueName: group.leagueName,
        gameDate: formattedDate,
        games: group.games,
      });

      if (result.success) {
        sent++;
      } else {
        errors++;
        console.warn('[cron/scorekeeper-reminders] Failed to send to scorekeeper:', result.error);
      }
    }

    console.log(
      `[cron/scorekeeper-reminders] Done: ${sent} sent, ${skipped} skipped (no email), ${errors} errors`
    );

    return NextResponse.json({
      sent,
      skipped,
      errors,
      gamesFound: todaySessions.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[cron/scorekeeper-reminders] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
