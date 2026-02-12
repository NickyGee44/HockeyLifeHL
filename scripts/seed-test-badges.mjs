import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set them in .env.local or pass them inline: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-test-badges.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const LEAGUE_ID = 'b0000000-0000-0000-0000-000000000002';
const SEASON_ID = 'b0000000-0000-0000-0000-000000000003';

async function main() {
  // Step 1: Check if player_badges table exists
  const { data: tableCheck, error: tableError } = await supabase
    .from('player_badges')
    .select('id')
    .limit(1);

  if (tableError) {
    console.log('player_badges table error:', tableError.message);
    console.log('Migration may not be applied yet. Applying via SQL...');
    return;
  }
  console.log('player_badges table exists');

  // Step 2: Get teams
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, slug')
    .eq('league_id', LEAGUE_ID)
    .order('name');

  if (teamsError || !teams || teams.length === 0) {
    console.log('No teams found:', teamsError?.message);
    return;
  }
  console.log(`Found ${teams.length} teams`);

  // Step 3: Get top scorers from player_season_stats
  const { data: scorers } = await supabase
    .from('player_season_stats')
    .select('player_id, full_name, team_id, team_name, goals, assists, points, games_played')
    .eq('season_id', SEASON_ID)
    .order('points', { ascending: false })
    .limit(20);

  console.log(`\nTop scorers found: ${scorers?.length || 0}`);
  scorers?.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.full_name} - ${s.points}pts (${s.goals}g ${s.assists}a) - ${s.team_name}`);
  });

  // Step 4: Get goalies
  const { data: goalieRows } = await supabase
    .from('goalie_stats')
    .select('player_id, team_id, saves, goals_against, game_result, player:profiles(full_name)')
    .eq('season_id', SEASON_ID);

  const goalieMap = {};
  for (const g of goalieRows || []) {
    const pid = g.player_id;
    if (!goalieMap[pid]) {
      const profile = Array.isArray(g.player) ? g.player[0] : g.player;
      goalieMap[pid] = { name: profile?.full_name, team_id: g.team_id, gp: 0, saves: 0, ga: 0, wins: 0 };
    }
    goalieMap[pid].gp++;
    goalieMap[pid].saves += g.saves || 0;
    goalieMap[pid].ga += g.goals_against || 0;
    if (g.game_result === 'W') goalieMap[pid].wins++;
  }

  const goalies = Object.entries(goalieMap).map(([pid, g]) => ({
    player_id: pid,
    ...g,
    sv_pct: g.saves + g.ga > 0 ? g.saves / (g.saves + g.ga) : 0,
    gaa: g.gp > 0 ? g.ga / g.gp : 99,
  }));
  goalies.sort((a, b) => b.sv_pct - a.sv_pct);

  console.log(`\nGoalies found: ${goalies.length}`);
  goalies.slice(0, 3).forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.name} - SV% ${g.sv_pct.toFixed(3)} GAA ${g.gaa.toFixed(2)} (${g.gp}gp) - tid:${g.team_id}`);
  });

  // Step 5: Get roster entries for iron man candidates
  const { data: rosterEntries } = await supabase
    .from('team_rosters')
    .select('player_id, team_id')
    .eq('season_id', SEASON_ID)
    .in('team_id', teams.map(t => t.id));

  console.log(`\nRoster entries: ${rosterEntries?.length || 0}`);

  // Step 6: Build badge inserts
  const badges = [];

  // Championship: Pick a random team and give all their players championship badges
  const champTeam = teams[Math.floor(Math.random() * teams.length)];
  console.log(`\nChampionship team: ${champTeam.name}`);
  const champRoster = rosterEntries?.filter(r => r.team_id === champTeam.id) || [];
  for (const player of champRoster) {
    badges.push({
      player_id: player.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: champTeam.id,
      badge_type: 'championship',
      metadata: { team_name: champTeam.name },
    });
  }
  console.log(`  -> ${champRoster.length} championship badges`);

  // Top Scorer: Player with most goals
  if (scorers && scorers.length > 0) {
    const topGoalScorer = [...scorers].sort((a, b) => b.goals - a.goals)[0];
    badges.push({
      player_id: topGoalScorer.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: topGoalScorer.team_id,
      badge_type: 'top_scorer',
      metadata: { goals: topGoalScorer.goals, games_played: topGoalScorer.games_played },
    });
    console.log(`Top Scorer: ${topGoalScorer.full_name} (${topGoalScorer.goals}g)`);

    // Points Leader: Player with most points
    const pointsLeader = scorers[0];
    badges.push({
      player_id: pointsLeader.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: pointsLeader.team_id,
      badge_type: 'points_leader',
      metadata: { points: pointsLeader.points, goals: pointsLeader.goals, assists: pointsLeader.assists },
    });
    console.log(`Points Leader: ${pointsLeader.full_name} (${pointsLeader.points}pts)`);

    // Also give a few more players some extra badges for variety
    // Give 2nd and 3rd place some badges too for visual testing
    if (scorers.length >= 3) {
      badges.push({
        player_id: scorers[1].player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: scorers[1].team_id,
        badge_type: 'iron_man',
        metadata: { games_played: scorers[1].games_played },
      });
      console.log(`Iron Man (extra): ${scorers[1].full_name} (${scorers[1].games_played}gp)`);

      badges.push({
        player_id: scorers[2].player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: scorers[2].team_id,
        badge_type: 'iron_man',
        metadata: { games_played: scorers[2].games_played },
      });
      console.log(`Iron Man (extra): ${scorers[2].full_name} (${scorers[2].games_played}gp)`);
    }

    // Give the top scorer iron man too (multiple badges on one player)
    badges.push({
      player_id: topGoalScorer.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: topGoalScorer.team_id,
      badge_type: 'iron_man',
      metadata: { games_played: topGoalScorer.games_played },
    });
    console.log(`Iron Man (extra for top scorer): ${topGoalScorer.full_name}`);

    // Give points leader a championship too if they're on champ team
    // Otherwise give random extra badges to more players
    for (let i = 3; i < Math.min(8, scorers.length); i++) {
      badges.push({
        player_id: scorers[i].player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: scorers[i].team_id,
        badge_type: 'iron_man',
        metadata: { games_played: scorers[i].games_played },
      });
    }
    console.log(`Iron Man badges for players ranked 4-8`);
  }

  // Top Goalie
  if (goalies.length > 0) {
    const topGoalie = goalies[0];
    badges.push({
      player_id: topGoalie.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: topGoalie.team_id,
      badge_type: 'top_goalie',
      metadata: { save_percentage: topGoalie.sv_pct, goals_against_average: topGoalie.gaa, games_played: topGoalie.gp },
    });
    console.log(`Top Goalie: ${topGoalie.name} (SV% ${topGoalie.sv_pct.toFixed(3)})`);

    // Give second goalie iron_man for variety
    if (goalies.length >= 2) {
      badges.push({
        player_id: goalies[1].player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: goalies[1].team_id,
        badge_type: 'iron_man',
        metadata: { games_played: goalies[1].gp },
      });
      console.log(`Iron Man (goalie): ${goalies[1].name}`);
    }
  }

  // Step 7: Insert all badges
  console.log(`\n--- Inserting ${badges.length} badges ---`);

  const { data: inserted, error: insertError } = await supabase
    .from('player_badges')
    .upsert(badges, { onConflict: 'player_id,season_id,badge_type' })
    .select();

  if (insertError) {
    console.log('Insert error:', insertError.message);
    console.log('Details:', JSON.stringify(insertError, null, 2));
    return;
  }

  console.log(`Successfully inserted ${inserted?.length || 0} badges!`);

  // Step 8: Verify
  const { data: allBadges } = await supabase
    .from('player_badges')
    .select('badge_type, player_id, team_id, metadata, player:profiles(full_name), team:teams(name)')
    .eq('league_id', LEAGUE_ID)
    .eq('season_id', SEASON_ID);

  console.log(`\n--- All badges in BMHL (${allBadges?.length || 0} total) ---`);
  const byType = {};
  for (const b of allBadges || []) {
    if (!byType[b.badge_type]) byType[b.badge_type] = [];
    const profile = Array.isArray(b.player) ? b.player[0] : b.player;
    const team = Array.isArray(b.team) ? b.team[0] : b.team;
    byType[b.badge_type].push(`${profile?.full_name} (${team?.name})`);
  }
  for (const [type, players] of Object.entries(byType)) {
    console.log(`\n${type} (${players.length}):`);
    players.forEach(p => console.log(`  - ${p}`));
  }
}

main().catch(console.error);
