import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications/email-service';
import { getGameReminderEmail } from '@/lib/notifications/templates/game-reminder';
import { format } from 'date-fns';

/**
 * Vercel Cron route: Send 24-hour game reminders to players.
 * Schedule: Every hour on the hour (0 * * * *)
 *
 * Finds games scheduled 23–25 hours from now, fetches rostered players,
 * and sends reminder emails. Uses a sent_at column on games to avoid
 * double-sending — since we don't have that column yet, we use a simple
 * notification_sent flag via game metadata or just accept that running
 * every hour for a 2-hour window may send at most 2 reminders.
 *
 * Actually: we query games in the 23h–25h window and check a
 * game_reminder_sent_at column. If it's null, we send and mark it.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25h from now

    // Find scheduled games in the 24h window that haven't had reminders sent
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select(`
        id,
        scheduled_at,
        location,
        league_id,
        home_team_id,
        away_team_id,
        home_team:teams!games_home_team_id_fkey(name, slug),
        away_team:teams!games_away_team_id_fkey(name, slug),
        league:leagues!games_league_id_fkey(name, slug, status),
        reminder_sent_at
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', windowEnd.toISOString())
      .is('reminder_sent_at', null);

    if (gamesError) {
      console.error('[cron/send-game-reminders] Error fetching games:', gamesError.message);
      return NextResponse.json({ error: gamesError.message }, { status: 500 });
    }

    if (!games || games.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No games in reminder window', timestamp: now.toISOString() });
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const game of games as any[]) {
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      const league = game.league;

      // Skip if league is not active
      if (league?.status !== 'active') continue;

      const gameDate = new Date(game.scheduled_at);
      const hoursUntil = Math.round((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      const formattedDate = format(gameDate, 'EEEE, MMMM d, yyyy');
      const formattedTime = format(gameDate, 'h:mm a');

      // Get rostered players for both teams with email addresses
      const { data: rosters } = await supabase
        .from('team_rosters')
        .select(`
          team_id,
          profiles!team_rosters_player_id_fkey(full_name, email)
        `)
        .in('team_id', [game.home_team_id, game.away_team_id].filter(Boolean))
        .eq('league_id', game.league_id)
        .is('end_date', null);

      if (!rosters || rosters.length === 0) continue;

      const siteUrl = process.env.NEXT_PUBLIC_SITES_URL || 'https://beerleaguehockey.ca';
      const leagueSlug = league?.slug;

      for (const roster of rosters as any[]) {
        const profile = roster.profiles;
        if (!profile?.email || !profile?.full_name) continue;

        const isHomeTeam = roster.team_id === game.home_team_id;
        const myTeamName = isHomeTeam ? homeTeam?.name : awayTeam?.name;
        const opponentName = isHomeTeam ? awayTeam?.name : homeTeam?.name;

        if (!myTeamName || !opponentName) continue;

        const dashboardUrl = leagueSlug
          ? `${siteUrl}/${leagueSlug}/me`
          : siteUrl;

        const unsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(profile.email)}`;

        const html = getGameReminderEmail({
          playerName: profile.full_name,
          teamName: myTeamName,
          opponentName,
          gameDate: formattedDate,
          gameTime: formattedTime,
          venueName: game.location || 'TBD',
          hoursUntilGame: hoursUntil,
          dashboardUrl,
          unsubscribeUrl,
          leagueName: league?.name,
        });

        const result = await sendEmail({
          to: profile.email,
          subject: `Game Reminder: ${myTeamName} vs ${opponentName} — ${formattedDate}`,
          html,
          tags: [
            { name: 'type', value: 'game-reminder' },
            { name: 'league_id', value: game.league_id },
            { name: 'game_id', value: game.id },
          ],
        });

        if (result.success) {
          totalSent++;
        } else {
          totalFailed++;
          console.warn('[cron/send-game-reminders] Failed to send to', profile.email, result.error);
        }
      }

      // Mark game as reminder-sent to prevent duplicates
      await supabase
        .from('games')
        .update({ reminder_sent_at: now.toISOString() })
        .eq('id', game.id);
    }

    console.log(`[cron/send-game-reminders] Processed ${games.length} games, sent ${totalSent}, failed ${totalFailed}`);
    return NextResponse.json({
      gamesProcessed: games.length,
      emailsSent: totalSent,
      emailsFailed: totalFailed,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[cron/send-game-reminders] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
