import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';

faker.seed(42);

const leagueId = randomUUID();
const seasonId = randomUUID();
const divisionId = randomUUID();
const orgId = randomUUID();
const ownerId = randomUUID();
const seasonFeeId = randomUUID();

const now = new Date('2026-02-14T01:22:00-05:00');

const teams = [
  { name: 'Toronto Icebreakers', short: 'ICE', primary: '#1E90FF', secondary: '#FFFFFF' },
  { name: 'Scarborough Storm', short: 'STORM', primary: '#4B0082', secondary: '#C0C0C0' },
  { name: 'Mississauga Mavericks', short: 'MAVS', primary: '#B22222', secondary: '#F5F5F5' },
  { name: 'Etobicoke Blizzards', short: 'BLZD', primary: '#00BFFF', secondary: '#0B1F3A' },
  { name: 'North York Knights', short: 'NYK', primary: '#111111', secondary: '#FFD700' },
  { name: 'Brampton Blades', short: 'BLD', primary: '#8B0000', secondary: '#FFFFFF' },
  { name: 'Oakville IceHawks', short: 'HAWK', primary: '#2F4F4F', secondary: '#87CEFA' },
  { name: 'Markham Mustangs', short: 'MUST', primary: '#006400', secondary: '#F0E68C' },
].map((team) => ({ ...team, id: randomUUID() }));

const profiles = [];
profiles.push({
  id: ownerId,
  email: 'owner@gta-beer-league.demo',
  full_name: 'Jordan McKinley',
  role: 'owner',
  city: 'Toronto',
  province: 'ON',
  shot_hand: 'R',
  skill_level: 'advanced',
});

const positions = ['Forward', 'Defense', 'Goalie'];
const rosters = [];
const captains = new Map();

teams.forEach((team) => {
  for (let i = 0; i < 12; i += 1) {
    const profileId = randomUUID();
    const fullName = faker.person.fullName();
    const email = faker.internet.email({ firstName: fullName.split(' ')[0], lastName: fullName.split(' ').slice(-1)[0] }).toLowerCase();
    const position = i === 0 ? 'Goalie' : faker.helpers.arrayElement(positions.slice(0, 2));
    const isGoalie = position === 'Goalie';
    const jersey = faker.number.int({ min: 2, max: 98 });

    profiles.push({
      id: profileId,
      email,
      full_name: fullName,
      role: i === 1 ? 'captain' : 'player',
      city: 'Toronto',
      province: 'ON',
      shot_hand: faker.helpers.arrayElement(['L', 'R']),
      skill_level: faker.helpers.arrayElement(['intermediate', 'advanced']),
      jersey_number: jersey,
      position,
    });

    rosters.push({
      league_id: leagueId,
      season_id: seasonId,
      team_id: team.id,
      player_id: profileId,
      is_goalie: isGoalie,
      joined_at: new Date('2026-01-05T12:00:00-05:00').toISOString(),
    });

    if (i === 1) {
      captains.set(team.id, profileId);
    }
  }
});

const games = [];
const gameStats = [];

const pairings = [];
for (let i = 0; i < teams.length; i += 1) {
  for (let j = i + 1; j < teams.length; j += 1) {
    pairings.push([teams[i], teams[j]]);
  }
}

faker.helpers.shuffle(pairings);
const selectedPairings = pairings.slice(0, 20);

selectedPairings.forEach((pair, idx) => {
  const homeFirst = faker.datatype.boolean();
  const homeTeam = homeFirst ? pair[0] : pair[1];
  const awayTeam = homeFirst ? pair[1] : pair[0];

  const isCompleted = idx < 12;
  const scheduledDate = new Date('2026-01-20T20:30:00-05:00');
  scheduledDate.setDate(scheduledDate.getDate() + idx * 4);

  const homeScore = isCompleted ? faker.number.int({ min: 1, max: 7 }) : null;
  const awayScore = isCompleted
    ? faker.number.int({ min: 0, max: 6 })
    : null;
  const normalizedAwayScore = isCompleted && awayScore === homeScore ? awayScore + 1 : awayScore;

  const gameId = randomUUID();

  games.push({
    id: gameId,
    league_id: leagueId,
    season_id: seasonId,
    division_id: divisionId,
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    scheduled_at: scheduledDate.toISOString(),
    status: isCompleted ? 'completed' : 'scheduled',
    location: 'Scotiabank Pond, Toronto',
    home_score: homeScore,
    away_score: normalizedAwayScore,
    stats_submitted_at: isCompleted ? new Date(scheduledDate.getTime() + 2 * 60 * 60 * 1000).toISOString() : null,
    stats_submitted_by: isCompleted ? ownerId : null,
  });

  if (isCompleted) {
    const totalGoals = homeScore + normalizedAwayScore;
    const homePlayers = rosters.filter((r) => r.team_id === homeTeam.id).map((r) => r.player_id);
    const awayPlayers = rosters.filter((r) => r.team_id === awayTeam.id).map((r) => r.player_id);

    const addStat = (playerId, teamId, teamType, statType, period) => {
      gameStats.push({
        id: randomUUID(),
        entered_by: ownerId,
        game_id: gameId,
        league_id: leagueId,
        period: String(period),
        player_id: playerId,
        stat_type: statType,
        team_id: teamId,
        team_type: teamType,
        timestamp: scheduledDate.toISOString(),
        value: 1,
      });
    };

    for (let g = 0; g < totalGoals; g += 1) {
      const scoringHome = g < homeScore;
      const teamId = scoringHome ? homeTeam.id : awayTeam.id;
      const teamType = scoringHome ? 'home' : 'away';
      const players = scoringHome ? homePlayers : awayPlayers;
      const scorer = faker.helpers.arrayElement(players);
      const assist = faker.helpers.arrayElement(players.filter((p) => p !== scorer));
      const period = faker.helpers.arrayElement([1, 2, 3]);

      addStat(scorer, teamId, teamType, 'goal', period);
      addStat(assist, teamId, teamType, 'assist', period);
    }
  }
});

const seasonFee = {
  id: seasonFeeId,
  league_id: leagueId,
  season_id: seasonId,
  name: 'Winter 2026 Player Fee',
  amount_cents: 32500,
  currency: 'CAD',
  allow_full_payment: true,
  allow_two_pay: true,
  allow_three_pay: false,
  is_active: true,
  payment_deadline: '2026-02-15',
  description: 'Includes ice time, officials, and league operations.',
};

const playerPayments = [];
const paidByTeam = new Map();

rosters.forEach((roster, idx) => {
  const paidRoll = faker.number.int({ min: 1, max: 100 });
  let status = 'pending';
  let amountPaid = 0;
  let paidAt = null;
  let nextPaymentDate = '2026-02-20';

  if (paidRoll <= 60) {
    status = 'paid';
    amountPaid = 32500;
    paidAt = new Date('2026-02-01T10:00:00-05:00').toISOString();
    nextPaymentDate = null;
  } else if (paidRoll <= 85) {
    status = 'partially_paid';
    amountPaid = 16250;
    nextPaymentDate = '2026-02-28';
  } else {
    status = 'overdue';
  }

  const currentTeamPaid = paidByTeam.get(roster.team_id) || 0;
  paidByTeam.set(roster.team_id, currentTeamPaid + amountPaid);

  playerPayments.push({
    id: randomUUID(),
    league_id: leagueId,
    season_id: seasonId,
    season_fee_id: seasonFeeId,
    player_id: roster.player_id,
    team_id: roster.team_id,
    base_amount_cents: 32500,
    discount_cents: 0,
    amount_paid_cents: amountPaid,
    total_amount_cents: 32500,
    payment_plan: 'full',
    status,
    currency: 'CAD',
    paid_at: paidAt,
    next_payment_date: nextPaymentDate,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });
});

const teamInvoices = teams.map((team) => {
  const paidAmount = paidByTeam.get(team.id) || 0;
  let status = 'open';
  if (paidAmount >= 390000) status = 'paid';
  else if (paidAmount > 0) status = 'partial';

  return {
    id: randomUUID(),
    team_id: team.id,
    season_id: seasonId,
    league_id: leagueId,
    total_players: 12,
    fee_per_player_cents: 32500,
    total_amount_cents: 390000,
    amount_paid_cents: paidAmount,
    currency: 'CAD',
    status,
    payment_deadline: '2026-02-15',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
});

const sql = [];
sql.push('-- ============================================================================');
sql.push('-- GTA Beer League Demo - seed data');
sql.push('-- Generated:', now.toISOString());
sql.push('-- ============================================================================');
sql.push('BEGIN;');

sql.push(`INSERT INTO organizations (id, name, slug, owner_user_id, created_at) VALUES`);
sql.push(`  ('${orgId}', 'GTA Beer League Holdings', 'gta-beer-league-holdings', '${ownerId}', '${now.toISOString()}');`);

sql.push(`INSERT INTO profiles (id, email, full_name, role, city, province, shot_hand, skill_level, created_at) VALUES`);
profiles.forEach((profile, idx) => {
  const values = [
    profile.id,
    profile.email,
    profile.full_name,
    profile.role,
    profile.city,
    profile.province,
    profile.shot_hand,
    profile.skill_level,
    now.toISOString(),
  ].map((v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`));

  sql.push(`  (${values.join(', ')})${idx === profiles.length - 1 ? ';' : ','}`);
});

sql.push(`INSERT INTO leagues (id, name, slug, short_name, city, state_province, country, timezone, sport, is_public, created_by, owner_id, primary_color, secondary_color, status) VALUES`);
sql.push(`  ('${leagueId}', 'GTA Beer League Demo', 'gta-beer-league-demo', 'GTA Demo', 'Toronto', 'ON', 'Canada', 'America/Toronto', 'hockey', true, '${ownerId}', '${ownerId}', '#0B1F3A', '#00BFFF', 'active');`);

sql.push(`INSERT INTO divisions (id, league_id, name, skill_level, description, game_duration_minutes, period_count) VALUES`);
sql.push(`  ('${divisionId}', '${leagueId}', 'GTA Premier Division', 'intermediate', 'Single-division showcase for demo league', 60, 3);`);

sql.push(`INSERT INTO seasons (id, league_id, name, start_date, end_date, registration_type, status, games_per_cycle, max_players_per_team, created_at) VALUES`);
sql.push(`  ('${seasonId}', '${leagueId}', 'Winter 2026', '2026-01-15', '2026-04-15', 'open_registration', 'active', 20, 12, '${now.toISOString()}');`);

sql.push(`INSERT INTO teams (id, league_id, name, short_name, primary_color, secondary_color, captain_id, created_at) VALUES`);
teams.forEach((team, idx) => {
  const captainId = captains.get(team.id);
  sql.push(`  ('${team.id}', '${leagueId}', '${team.name.replace(/'/g, "''")}', '${team.short}', '${team.primary}', '${team.secondary}', '${captainId}', '${now.toISOString()}')${idx === teams.length - 1 ? ';' : ','}`);
});

sql.push(`INSERT INTO team_rosters (league_id, season_id, team_id, player_id, is_goalie, joined_at) VALUES`);
rosters.forEach((roster, idx) => {
  sql.push(`  ('${roster.league_id}', '${roster.season_id}', '${roster.team_id}', '${roster.player_id}', ${roster.is_goalie}, '${roster.joined_at}')${idx === rosters.length - 1 ? ';' : ','}`);
});

sql.push(`INSERT INTO league_memberships (league_id, user_id, role, status, joined_at) VALUES`);
sql.push(`  ('${leagueId}', '${ownerId}', 'owner', 'active', '${now.toISOString()}');`);

sql.push(`INSERT INTO league_ownerships (league_id, organization_id, user_id, role, created_at) VALUES`);
sql.push(`  ('${leagueId}', '${orgId}', '${ownerId}', 'owner', '${now.toISOString()}');`);

sql.push(`INSERT INTO season_fees (id, league_id, season_id, name, amount_cents, currency, allow_full_payment, allow_two_pay, allow_three_pay, is_active, payment_deadline, description, created_at, updated_at) VALUES`);
sql.push(`  ('${seasonFee.id}', '${seasonFee.league_id}', '${seasonFee.season_id}', '${seasonFee.name}', ${seasonFee.amount_cents}, '${seasonFee.currency}', ${seasonFee.allow_full_payment}, ${seasonFee.allow_two_pay}, ${seasonFee.allow_three_pay}, ${seasonFee.is_active}, '${seasonFee.payment_deadline}', '${seasonFee.description}', '${now.toISOString()}', '${now.toISOString()}');`);

sql.push(`INSERT INTO player_payments (id, league_id, season_id, season_fee_id, player_id, team_id, base_amount_cents, discount_cents, amount_paid_cents, total_amount_cents, payment_plan, status, currency, paid_at, next_payment_date, created_at, updated_at) VALUES`);
playerPayments.forEach((payment, idx) => {
  const values = [
    payment.id,
    payment.league_id,
    payment.season_id,
    payment.season_fee_id,
    payment.player_id,
    payment.team_id,
    payment.base_amount_cents,
    payment.discount_cents,
    payment.amount_paid_cents,
    payment.total_amount_cents,
    payment.payment_plan,
    payment.status,
    payment.currency,
    payment.paid_at,
    payment.next_payment_date,
    payment.created_at,
    payment.updated_at,
  ].map((v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`));

  sql.push(`  (${values.join(', ')})${idx === playerPayments.length - 1 ? ';' : ','}`);
});

sql.push(`INSERT INTO team_invoices (id, team_id, season_id, league_id, total_players, fee_per_player_cents, total_amount_cents, amount_paid_cents, currency, status, payment_deadline, created_at, updated_at) VALUES`);
teamInvoices.forEach((invoice, idx) => {
  sql.push(`  ('${invoice.id}', '${invoice.team_id}', '${invoice.season_id}', '${invoice.league_id}', ${invoice.total_players}, ${invoice.fee_per_player_cents}, ${invoice.total_amount_cents}, ${invoice.amount_paid_cents}, '${invoice.currency}', '${invoice.status}', '${invoice.payment_deadline}', '${invoice.created_at}', '${invoice.updated_at}')${idx === teamInvoices.length - 1 ? ';' : ','}`);
});

sql.push(`INSERT INTO games (id, league_id, season_id, division_id, home_team_id, away_team_id, scheduled_at, status, location, home_score, away_score, stats_submitted_at, stats_submitted_by, created_at) VALUES`);
games.forEach((game, idx) => {
  const values = [
    game.id,
    game.league_id,
    game.season_id,
    game.division_id,
    game.home_team_id,
    game.away_team_id,
    game.scheduled_at,
    game.status,
    game.location,
    game.home_score,
    game.away_score,
    game.stats_submitted_at,
    game.stats_submitted_by,
    now.toISOString(),
  ].map((v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`));

  sql.push(`  (${values.join(', ')})${idx === games.length - 1 ? ';' : ','}`);
});

sql.push(`INSERT INTO game_stats (id, entered_by, game_id, league_id, period, player_id, stat_type, team_id, team_type, timestamp, value, created_at) VALUES`);
gameStats.forEach((stat, idx) => {
  const values = [
    stat.id,
    stat.entered_by,
    stat.game_id,
    stat.league_id,
    stat.period,
    stat.player_id,
    stat.stat_type,
    stat.team_id,
    stat.team_type,
    stat.timestamp,
    stat.value,
    now.toISOString(),
  ].map((v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`));

  sql.push(`  (${values.join(', ')})${idx === gameStats.length - 1 ? ';' : ','}`);
});

sql.push('COMMIT;');

writeFileSync('/home/b3/HockeyLeague/seed-demo-league.sql', sql.join('\n'));
console.log('Wrote seed-demo-league.sql with', teams.length, 'teams,', profiles.length - 1, 'players,', games.length, 'games.');
