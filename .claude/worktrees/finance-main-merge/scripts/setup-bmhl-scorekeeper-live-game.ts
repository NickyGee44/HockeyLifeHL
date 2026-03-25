/**
 * BMHL scorekeeper test setup
 *
 * Creates or reuses:
 * - a scorekeeper auth user + profile
 * - league membership + league_scorekeepers entry for BMHL
 * - a live BMHL game
 * - a game_scorekeeper_assignments row for that user
 *
 * Usage:
 *   pnpm exec tsx scripts/setup-bmhl-scorekeeper-live-game.ts
 *   pnpm exec tsx scripts/setup-bmhl-scorekeeper-live-game.ts <email> <password> <full name>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const emailArg = process.argv[2];
const passwordArg = process.argv[3];
const nameArg = process.argv[4];

const scorekeeperEmail = emailArg || 'bmhl.scorekeeper@hockeylifehl.local';
const scorekeeperPassword = passwordArg || 'BmhlScorekeeper123!';
const scorekeeperName = nameArg || 'BMHL Scorekeeper';
const platformAdminEmail = 'grossi16n@hotmail.com';

type LeagueRow = {
  id: string;
  name: string;
  slug: string;
};

async function getBmhlLeague(): Promise<LeagueRow> {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', 'bmhl')
    .single();

  if (error || !data) {
    throw new Error(`BMHL league not found: ${error?.message || 'unknown error'}`);
  }

  return data;
}

async function ensureScorekeeperUser() {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', scorekeeperEmail)
    .maybeSingle();

  if (existingProfile?.id) {
    await supabase
      .from('profiles')
      .update({ full_name: scorekeeperName })
      .eq('id', existingProfile.id);
    return existingProfile.id;
  }

  const { data: createdAuth, error: createError } = await supabase.auth.admin.createUser({
    email: scorekeeperEmail,
    password: scorekeeperPassword,
    email_confirm: true,
    user_metadata: { full_name: scorekeeperName },
  });

  if (createError || !createdAuth?.user?.id) {
    throw new Error(`Failed creating scorekeeper auth user: ${createError?.message || 'unknown error'}`);
  }

  const userId = createdAuth.user.id;

  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profileCheck?.id) {
    const { error: insertProfileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: scorekeeperEmail,
        full_name: scorekeeperName,
      });

    if (insertProfileError) {
      throw new Error(`Failed creating scorekeeper profile: ${insertProfileError.message}`);
    }
  }

  return userId;
}

async function resolveAssignedByUser(leagueId: string, fallbackUserId: string): Promise<string> {
  const { data: platformAdmin } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', platformAdminEmail)
    .maybeSingle();

  if (platformAdmin?.id) {
    return platformAdmin.id;
  }

  const { data: ownerMembership } = await supabase
    .from('league_memberships')
    .select('user_id')
    .eq('league_id', leagueId)
    .eq('role', 'owner')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  return ownerMembership?.user_id || fallbackUserId;
}

async function ensureScorekeeperMembership(leagueId: string, userId: string, assignedBy: string) {
  const membershipPayload = {
    league_id: leagueId,
    user_id: userId,
    role: 'scorekeeper',
    status: 'active',
    invited_by: assignedBy,
  };

  const { error: membershipError } = await supabase
    .from('league_memberships')
    .upsert(membershipPayload, { onConflict: 'league_id,user_id' });

  if (membershipError) {
    throw new Error(`Failed upserting league_memberships: ${membershipError.message}`);
  }

  const scorekeeperPayload = {
    league_id: leagueId,
    scorekeeper_id: userId,
    status: 'active',
    hourly_rate: 30,
    can_edit_games: true,
    can_verify_games: false,
  };

  const { error: scorekeeperError } = await supabase
    .from('league_scorekeepers')
    .upsert(scorekeeperPayload, { onConflict: 'league_id,scorekeeper_id' });

  if (scorekeeperError) {
    throw new Error(`Failed upserting league_scorekeepers: ${scorekeeperError.message}`);
  }
}

async function getActiveSeasonId(leagueId: string): Promise<string> {
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id, status, start_date')
    .eq('league_id', leagueId)
    .in('status', ['active', 'playoffs', 'draft'])
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSeason?.id) {
    return activeSeason.id;
  }

  const { data: anySeason } = await supabase
    .from('seasons')
    .select('id, start_date')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anySeason?.id) {
    throw new Error('No BMHL season found. Create a season first.');
  }

  return anySeason.id;
}

async function getPlayableTeams(leagueId: string) {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .order('name', { ascending: true })
    .limit(2);

  if (error || !teams || teams.length < 2) {
    throw new Error(`Need at least 2 BMHL teams to create a game: ${error?.message || 'not enough teams'}`);
  }

  return teams;
}

async function ensureLiveGame(leagueId: string, seasonId: string, teamAId: string, teamBId: string) {
  const { data: existingLive } = await supabase
    .from('games')
    .select('id, scheduled_at, home_team_id, away_team_id')
    .eq('league_id', leagueId)
    .eq('status', 'in_progress')
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingLive?.id) {
    return existingLive.id;
  }

  const scheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data: createdGame, error: createGameError } = await supabase
    .from('games')
    .insert({
      league_id: leagueId,
      season_id: seasonId,
      home_team_id: teamAId,
      away_team_id: teamBId,
      scheduled_at: scheduledAt,
      status: 'in_progress',
      location: 'BMHL Test Rink',
      home_score: 0,
      away_score: 0,
    })
    .select('id')
    .single();

  if (createGameError || !createdGame?.id) {
    throw new Error(`Failed creating BMHL live game: ${createGameError?.message || 'unknown error'}`);
  }

  return createdGame.id;
}

async function ensureAssignment(gameId: string, leagueId: string, scorekeeperId: string, assignedBy: string) {
  const { data: existingAssignment } = await supabase
    .from('game_scorekeeper_assignments')
    .select('id, scorekeeper_id')
    .eq('game_id', gameId)
    .maybeSingle();

  const nowIso = new Date().toISOString();

  if (existingAssignment?.id) {
    const { error: updateError } = await supabase
      .from('game_scorekeeper_assignments')
      .update({
        scorekeeper_id: scorekeeperId,
        league_id: leagueId,
        assigned_by: assignedBy,
        checked_in_at: nowIso,
        started_at: nowIso,
        completed_at: null,
        duration_minutes: null,
        payment_status: 'pending',
      })
      .eq('id', existingAssignment.id);

    if (updateError) {
      throw new Error(`Failed updating assignment: ${updateError.message}`);
    }

    return existingAssignment.id;
  }

  const { data: assignment, error: insertError } = await supabase
    .from('game_scorekeeper_assignments')
    .insert({
      game_id: gameId,
      league_id: leagueId,
      scorekeeper_id: scorekeeperId,
      assigned_by: assignedBy,
      checked_in_at: nowIso,
      started_at: nowIso,
      payment_status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !assignment?.id) {
    throw new Error(`Failed creating assignment: ${insertError?.message || 'unknown error'}`);
  }

  return assignment.id;
}

async function main() {
  console.log('Setting up BMHL scorekeeper live-game test flow...');

  const league = await getBmhlLeague();
  const scorekeeperId = await ensureScorekeeperUser();
  const assignedBy = await resolveAssignedByUser(league.id, scorekeeperId);

  await ensureScorekeeperMembership(league.id, scorekeeperId, assignedBy);

  const seasonId = await getActiveSeasonId(league.id);
  const teams = await getPlayableTeams(league.id);
  const gameId = await ensureLiveGame(league.id, seasonId, teams[0].id, teams[1].id);
  const assignmentId = await ensureAssignment(gameId, league.id, scorekeeperId, assignedBy);

  console.log('');
  console.log('BMHL scorekeeper setup complete.');
  console.log(`League: ${league.name} (${league.slug})`);
  console.log(`Scorekeeper email: ${scorekeeperEmail}`);
  console.log(`Scorekeeper password: ${scorekeeperPassword}`);
  console.log(`Live game id: ${gameId}`);
  console.log(`Assignment id: ${assignmentId}`);
  console.log(`Scorekeeper dashboard: /scorekeeper/dashboard`);
  console.log(`Live entry URL: /scorekeeper/live-entry/${gameId}`);
  console.log(`Public BMHL page: /bmhl`);
}

main().catch((error) => {
  console.error('BMHL scorekeeper setup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
