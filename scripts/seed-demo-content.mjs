/**
 * Seed Demo Content: Sponsors, News Articles, and Scorekeepers
 *
 * Adds supporting content to the existing demo league (slug="demo")
 * to make the site feel alive.
 *
 * Usage:
 *   node scripts/seed-demo-content.mjs           # Create (skip if exists)
 *   node scripts/seed-demo-content.mjs --reset    # Delete and recreate
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Also try .env.local (Next.js convention)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const RESET = process.argv.includes('--reset');

// ---------------------------------------------------------------------------
// Data definitions
// ---------------------------------------------------------------------------

const sponsors = [
  {
    name: 'Tim Hortons',
    tier: 'gold',
    display_order: 1,
    description: 'Official coffee partner',
    website_url: 'https://timhortons.ca',
    is_active: true,
  },
  {
    name: 'Pro Hockey Life',
    tier: 'silver',
    display_order: 2,
    description: 'Equipment supplier for Halifax hockey',
    website_url: 'https://prohockeylife.com',
    is_active: true,
  },
  {
    name: "Alexander Keith's",
    tier: 'bronze',
    display_order: 3,
    description: 'Post-game refreshments',
    website_url: 'https://keiths.ca',
    is_active: true,
  },
];

const articles = [
  {
    title: 'Winter 2026 Season Kicks Off!',
    slug: 'winter-2026-season-kicks-off',
    excerpt:
      'The puck has dropped on another exciting season of beer league hockey in Halifax. Eight teams are ready to battle it out for the championship.',
    content: `<p>The wait is finally over! The Winter 2026 season of Hockey Life HL officially kicked off this week with a full slate of opening night games at the Halifax Forum. All eight teams took to the ice, and right from the first faceoff it was clear this season is going to be a battle.</p>
<p>The Mooseheads made an early statement with a dominant 5-1 victory over the Sackville Storm, while the Harbour Wolves and Citadel Knights played a thrilling back-and-forth affair that ended 4-3 in overtime. The North End Bruins looked sharp in their opener, edging the Dartmouth Destroyers 3-2 on a late third-period goal. Meanwhile, the Bedford Blizzard and Cole Harbour Comets skated to a hard-fought 2-2 tie.</p>
<p>With new faces on every roster and some key off-season acquisitions, the race for the playoffs promises to be tighter than ever. Mark your calendars, grab your gear, and get ready for another great season of hockey.</p>`,
    type: 'news',
    published: true,
    published_at: '2026-01-05T19:00:00-04:00',
  },
  {
    title: 'Week 3 Recap: Mooseheads Surge to Top',
    slug: 'week-3-recap-mooseheads-surge-to-top',
    excerpt:
      'Three weeks in and the Mooseheads have established themselves as the team to beat, riding a five-game winning streak to the top of the standings.',
    content: `<p>Through three weeks of play, the Mooseheads have been the class of the league. Their 5-0-1 record puts them firmly atop the standings, powered by a balanced attack that has been nearly impossible to contain. Their top line has combined for 22 points, and their goaltending has been rock solid with a league-best 1.83 goals-against average.</p>
<p>The Harbour Wolves are nipping at their heels in second place, thanks largely to a four-game winning streak of their own. The Citadel Knights and North End Bruins round out the top four, both sitting at 3-2-1. In the middle of the pack, the Dartmouth Destroyers and Bedford Blizzard are locked in a tight battle for playoff positioning, separated by just one point.</p>
<p>Down at the bottom, the Sackville Storm are looking to right the ship after a tough 1-4-1 start, while the Cole Harbour Comets have shown flashes of brilliance but lack consistency. With plenty of hockey left to play, no team is out of the race just yet.</p>`,
    type: 'game_recap',
    published: true,
    published_at: '2026-01-22T20:30:00-04:00',
  },
  {
    title: 'North End Bruins Mount Comeback',
    slug: 'north-end-bruins-mount-comeback',
    excerpt:
      'Down 4-1 heading into the third period, the North End Bruins staged a miraculous comeback against the Dartmouth Destroyers.',
    content: `<p>In what might already be the game of the season, the North End Bruins erased a three-goal deficit in the third period to stun the Dartmouth Destroyers 5-4 in overtime. Trailing 4-1 after two periods, the Bruins looked all but finished. Then the third period happened.</p>
<p>It started with a quick wrist shot from the slot that beat the Destroyers goalie glove side just 47 seconds into the period. Two minutes later, a scramble in front of the net resulted in another Bruins goal, cutting the lead to one. The Destroyers tried to lock things down defensively, but the Bruins pressure was relentless. With 3:12 left in regulation and the goalie pulled, the Bruins tied it up on a one-timer from the left circle.</p>
<p>In overtime, it took just 1:23 for the Bruins to complete the comeback. A beautiful cross-ice pass set up a tap-in at the back door, and the Halifax Forum erupted. The Bedford Blizzard and Citadel Knights, watching from the stands between games, could only shake their heads. The Sackville Storm and Cole Harbour Comets will want to take notes on that kind of never-say-die effort when they face the Bruins later this month.</p>`,
    type: 'game_recap',
    published: true,
    published_at: '2026-02-05T21:00:00-04:00',
  },
  {
    title: 'All-Star Weekend Announcement',
    slug: 'all-star-weekend-announcement',
    excerpt:
      'Hockey Life HL is proud to announce the first-ever All-Star Weekend, featuring a skills competition and an all-star game at the Halifax Forum.',
    content: `<p>Hockey Life HL is thrilled to announce that we will be hosting our inaugural All-Star Weekend on February 28th and March 1st at the Halifax Forum. This two-day event will showcase the best talent from all eight teams in the league and promises to be a celebration of everything that makes beer league hockey great.</p>
<p>Saturday evening will feature a skills competition including fastest skater, hardest shot, accuracy shooting, and a relay race. On Sunday afternoon, Team Gold will take on Team Blue in the All-Star Game itself. Captains from the Mooseheads and Harbour Wolves will draft their squads from a pool of the league's top players, with representatives from every team including the Citadel Knights, North End Bruins, Dartmouth Destroyers, Bedford Blizzard, Sackville Storm, and Cole Harbour Comets.</p>
<p>Fan voting for All-Star selections opens next week on our website. Each team is guaranteed at least two representatives, so make sure to vote for your favourites. Post-game festivities will be held at a local pub downtown, because what's an all-star weekend without some post-game refreshments?</p>`,
    type: 'news',
    published: true,
    published_at: '2026-02-15T12:00:00-04:00',
  },
  {
    title: 'Trade Deadline Shakeup',
    slug: 'trade-deadline-shakeup',
    excerpt:
      'Several blockbuster trades reshuffled rosters across the league as teams gear up for the playoff push.',
    content: `<p>The trade deadline came and went this week, and several teams made bold moves to bolster their rosters for the stretch run. The biggest splash came from the Harbour Wolves, who acquired a top-six forward from the Sackville Storm in exchange for a depth defenseman and future draft considerations. The move immediately strengthens the Wolves' offence as they look to challenge the Mooseheads for first place.</p>
<p>The Citadel Knights made a shrewd pickup, adding a steady shutdown defenseman from the Cole Harbour Comets. The Knights have been strong offensively all season but needed help on the back end, and this addition could be the missing piece. Meanwhile, the Dartmouth Destroyers swung a deal with the Bedford Blizzard, swapping forwards in a move that both teams hope will spark their respective lineups.</p>
<p>The North End Bruins stood pat at the deadline, confident that their current roster has what it takes to make a deep playoff run. The Mooseheads also held firm, content with their league-leading roster. With four weeks of regular season play remaining, the stage is set for a dramatic finish. Every game matters from here on out.</p>`,
    type: 'news',
    published: true,
    published_at: '2026-03-01T18:00:00-04:00',
  },
  {
    title: 'Playoff Race Heats Up',
    slug: 'playoff-race-heats-up',
    excerpt:
      'With just two weeks left in the regular season, six teams are still alive in the fight for four playoff spots.',
    content: `<p>The playoff picture is coming into focus, but nothing is settled yet. The Mooseheads have clinched first place and home-ice advantage throughout, while the Harbour Wolves have locked up a top-two seed. After that, it gets interesting. The Citadel Knights, North End Bruins, Dartmouth Destroyers, and Bedford Blizzard are separated by just three points in the battle for the final two playoff spots.</p>
<p>The Citadel Knights currently hold third place but have a brutal remaining schedule that includes games against the Mooseheads and Harbour Wolves. The North End Bruins are just one point back in fourth and have momentum on their side after winning four of their last five. The Dartmouth Destroyers are clinging to life in fifth, needing wins in both of their remaining games to have any chance. Even the Bedford Blizzard, sitting two points out of a playoff spot, still have a mathematical shot.</p>
<p>The Sackville Storm and Cole Harbour Comets have been eliminated from contention but are playing spoiler, and neither team will make it easy for the contenders. Last week, the Storm shocked the Citadel Knights with a 3-1 upset, throwing the playoff race into further chaos. Stay tuned to our schedule page for all the action as the regular season winds down.</p>`,
    type: 'news',
    published: true,
    published_at: '2026-03-10T19:30:00-04:00',
  },
];

const scorekeeperUsers = [
  {
    email: 'scorekeeper1@demo.hockeylifehl.com',
    full_name: 'Mike Chen',
    display_name: 'Mike Chen',
    preferred_days: ['tuesday', 'thursday'],
  },
  {
    email: 'scorekeeper2@demo.hockeylifehl.com',
    full_name: 'Sarah MacDonald',
    display_name: 'Sarah MacDonald',
    preferred_days: ['tuesday', 'thursday'],
  },
  {
    email: 'scorekeeper3@demo.hockeylifehl.com',
    full_name: 'Alex Murphy',
    display_name: 'Alex Murphy',
    preferred_days: ['tuesday', 'thursday'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up the demo league by slug */
async function findDemoLeague() {
  const { data, error } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', 'demo')
    .single();

  if (error || !data) {
    console.error('Demo league not found. Run seed-demo-league.mjs first.');
    process.exit(1);
  }
  return data;
}

/** Look up the active season for the demo league */
async function findActiveSeason(leagueId) {
  const { data } = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

// ---------------------------------------------------------------------------
// Seed: Sponsors
// ---------------------------------------------------------------------------

async function seedSponsors(leagueId) {
  console.log('\n--- Sponsors ---');

  // Check existing
  const { data: existing } = await supabase
    .from('league_sponsors')
    .select('id, name')
    .eq('league_id', leagueId);

  const existingNames = (existing || []).map((s) => s.name);

  if (RESET && existing && existing.length > 0) {
    console.log('  Deleting %d existing sponsors...', existing.length);
    const { error: delErr } = await supabase
      .from('league_sponsors')
      .delete()
      .eq('league_id', leagueId);
    if (delErr) {
      console.error('  Failed to delete sponsors:', delErr);
      return { created: 0, skipped: 0, errors: 1 };
    }
    existingNames.length = 0;
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const sponsor of sponsors) {
    if (existingNames.includes(sponsor.name)) {
      console.log('  [SKIP] %s (already exists)', sponsor.name);
      skipped++;
      continue;
    }

    const { error } = await supabase.from('league_sponsors').insert({
      league_id: leagueId,
      ...sponsor,
    });

    if (error) {
      console.error('  [ERROR] %s: %s', sponsor.name, error.message);
      errors++;
    } else {
      console.log('  [OK] %s (%s)', sponsor.name, sponsor.tier);
      created++;
    }
  }

  return { created, skipped, errors };
}

// ---------------------------------------------------------------------------
// Seed: Articles
// ---------------------------------------------------------------------------

async function seedArticles(leagueId, seasonId) {
  console.log('\n--- News Articles ---');

  // Check existing
  const { data: existing } = await supabase
    .from('articles')
    .select('id, slug')
    .eq('league_id', leagueId);

  const existingSlugs = (existing || []).map((a) => a.slug);

  if (RESET && existing && existing.length > 0) {
    console.log('  Deleting %d existing articles...', existing.length);
    const { error: delErr } = await supabase
      .from('articles')
      .delete()
      .eq('league_id', leagueId);
    if (delErr) {
      console.error('  Failed to delete articles:', delErr);
      return { created: 0, skipped: 0, errors: 1 };
    }
    existingSlugs.length = 0;
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const article of articles) {
    if (existingSlugs.includes(article.slug)) {
      console.log('  [SKIP] %s (already exists)', article.title);
      skipped++;
      continue;
    }

    const insertData = {
      league_id: leagueId,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      type: article.type,
      published: article.published,
      published_at: article.published_at,
    };

    if (seasonId) {
      insertData.season_id = seasonId;
    }

    const { error } = await supabase.from('articles').insert(insertData);

    if (error) {
      console.error('  [ERROR] %s: %s', article.title, error.message);
      errors++;
    } else {
      console.log('  [OK] %s (%s)', article.title, article.type);
      created++;
    }
  }

  return { created, skipped, errors };
}

// ---------------------------------------------------------------------------
// Seed: Scorekeepers
// ---------------------------------------------------------------------------

async function seedScorekeepers(leagueId) {
  console.log('\n--- Scorekeepers ---');

  // Check existing scorekeeper entries for this league
  const { data: existingSk } = await supabase
    .from('league_scorekeepers')
    .select('id, email, scorekeeper_id')
    .eq('league_id', leagueId);

  const existingEmails = (existingSk || []).map((s) => s.email);

  if (RESET && existingSk && existingSk.length > 0) {
    console.log('  Deleting %d existing league_scorekeepers...', existingSk.length);
    const { error: delErr } = await supabase
      .from('league_scorekeepers')
      .delete()
      .eq('league_id', leagueId);
    if (delErr) {
      console.error('  Failed to delete league_scorekeepers:', delErr);
      return { created: 0, skipped: 0, errors: 1 };
    }
    existingEmails.length = 0;

    // Also remove auth users + profiles for the demo scorekeepers
    for (const sk of existingSk) {
      if (sk.scorekeeper_id) {
        // Delete profile
        await supabase.from('profiles').delete().eq('id', sk.scorekeeper_id);
        // Delete auth user
        await supabase.auth.admin.deleteUser(sk.scorekeeper_id);
        console.log('  Deleted auth user + profile for %s', sk.scorekeeper_id);
      }
    }
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const skUser of scorekeeperUsers) {
    if (existingEmails.includes(skUser.email)) {
      console.log('  [SKIP] %s (already exists)', skUser.email);
      skipped++;
      continue;
    }

    // Step 1: Check if auth user already exists (by email)
    let userId;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find((u) => u.email === skUser.email);

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      console.log('  Auth user already exists for %s (%s)', skUser.email, userId);
    } else {
      // Create auth user
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: skUser.email,
        password: 'DemoScorekeeper2026!',
        email_confirm: true,
        user_metadata: {
          full_name: skUser.full_name,
        },
      });

      if (authErr) {
        console.error('  [ERROR] Failed to create auth user %s: %s', skUser.email, authErr.message);
        errors++;
        continue;
      }

      userId = authData.user.id;
      console.log('  Auth user created: %s (%s)', skUser.email, userId);
    }

    // Step 2: Ensure profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: userId,
        email: skUser.email,
        full_name: skUser.full_name,
        role: 'scorekeeper',
      });

      if (profileErr) {
        console.error(
          '  [ERROR] Failed to create profile for %s: %s',
          skUser.email,
          profileErr.message
        );
        errors++;
        continue;
      }
      console.log('  Profile created for %s', skUser.email);
    } else {
      console.log('  Profile already exists for %s', skUser.email);
    }

    // Step 3: Create league_scorekeepers entry
    const { error: skErr } = await supabase.from('league_scorekeepers').insert({
      league_id: leagueId,
      scorekeeper_id: userId,
      display_name: skUser.display_name,
      email: skUser.email,
      status: 'active',
      is_active: true,
      can_edit_games: true,
      can_verify_games: true,
      max_games_per_week: 4,
      preferred_days: skUser.preferred_days,
      hired_date: '2026-01-01',
    });

    if (skErr) {
      console.error(
        '  [ERROR] Failed to create league_scorekeeper for %s: %s',
        skUser.email,
        skErr.message
      );
      errors++;
    } else {
      console.log('  [OK] %s (%s)', skUser.display_name, skUser.email);
      created++;
    }
  }

  return { created, skipped, errors };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedDemoContent() {
  console.log('=== Seed Demo Content: Sponsors, Articles, Scorekeepers ===');
  if (RESET) console.log('  (--reset mode: existing data will be deleted)\n');

  // Find the demo league
  const league = await findDemoLeague();
  console.log('Demo league found: %s', league.id);

  // Find active season (for articles)
  const season = await findActiveSeason(league.id);
  if (season) {
    console.log('Active season found: %s', season.id);
  } else {
    console.log('No active season found (articles will be created without season_id)');
  }

  // Seed each content type
  const sponsorResult = await seedSponsors(league.id);
  const articleResult = await seedArticles(league.id, season?.id);
  const scorekeeperResult = await seedScorekeepers(league.id);

  // Print summary
  console.log('\n=== Summary ===');
  console.log(
    '  Sponsors:      %d created, %d skipped, %d errors',
    sponsorResult.created,
    sponsorResult.skipped,
    sponsorResult.errors
  );
  console.log(
    '  Articles:      %d created, %d skipped, %d errors',
    articleResult.created,
    articleResult.skipped,
    articleResult.errors
  );
  console.log(
    '  Scorekeepers:  %d created, %d skipped, %d errors',
    scorekeeperResult.created,
    scorekeeperResult.skipped,
    scorekeeperResult.errors
  );

  const totalErrors =
    sponsorResult.errors + articleResult.errors + scorekeeperResult.errors;
  const totalCreated =
    sponsorResult.created + articleResult.created + scorekeeperResult.created;

  if (totalErrors > 0) {
    console.log('\n  WARNING: %d errors occurred. Check output above.', totalErrors);
  }

  if (totalCreated === 0 && totalErrors === 0) {
    console.log('\n  All content already exists. Use --reset to recreate.');
  } else {
    console.log('\n=== Done! ===');
  }
}

try {
  await seedDemoContent();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
