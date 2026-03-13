import { test, expect, type Browser, type Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TestDataSeeder } from '../fixtures/test-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUILDER_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

async function seedCookieConsent(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('cookie-consent-given', 'true');
    window.localStorage.setItem(
      'cookie-consent-preferences',
      JSON.stringify({
        essential: true,
        analytics: false,
        functional: false,
      }),
    );
  });
}

async function dismissCookieBanner(page: Page) {
  const acceptEssential = page.getByRole('button', { name: 'Accept essential cookies only' });
  if (await acceptEssential.isVisible().catch(() => false)) {
    await acceptEssential.click();
  }
}

async function loginBuilder(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await seedCookieConsent(page);
  await page.goto(`${BUILDER_URL}/en/login`);
  await dismissCookieBanner(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /log in|login|sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  return { context, page };
}

async function writeCsvFile(outputDir: string, filename: string, contents: string) {
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, contents, 'utf8');
  return filePath;
}

test.describe.serial('Builder owner ops smoke tests', () => {
  let seeder: TestDataSeeder;
  let supabase: SupabaseClient;
  let organizerUserId: string | null = null;
  let leagueId = '';
  let seasonId = '';
  let teamId = '';
  let seededTeamIds: string[] = [];
  let ownerCredentials: { email: string; password: string };
  let extraUserIds: string[] = [];

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are required for builder owner ops smoke tests.');
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    seeder = new TestDataSeeder();
    const env = await seeder.seedCompleteEnvironment();
    organizerUserId = env.user.id;
    ownerCredentials = env.user;
    leagueId = env.league.id;
    seasonId = env.season.id;
    teamId = env.teams[0].id;
    seededTeamIds = env.teams.map((team) => team.id);

    const { error: seasonError } = await supabase
      .from('seasons')
      .update({
        status: 'active',
        registration_type: 'open_registration',
        registration_opens_at: new Date(Date.now() - 86400000).toISOString(),
        registration_closes_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .eq('id', seasonId);

    if (seasonError) {
      throw new Error(`Failed to activate season: ${seasonError.message}`);
    }

    const { error: participationError } = await supabase
      .from('team_schedule_preferences')
      .insert(
        seededTeamIds.map((seededTeamId) => ({
          league_id: leagueId,
          team_id: seededTeamId,
          season_id: seasonId,
          home_venue_id: null,
          seniority_level: 5,
          preferred_game_times: [],
          avoided_game_times: [],
          preferred_days: [],
          avoided_days: [],
          max_late_night_games: null,
          max_early_morning_games: null,
          weekend_preference: 0.5,
          min_hours_between_games: 24,
          notes: null,
          created_by: env.user.id,
        })),
      );

    if (participationError) {
      throw new Error(`Failed to seed season participation: ${participationError.message}`);
    }
  });

  test.afterAll(async () => {
    for (const userId of extraUserIds) {
      await supabase.auth.admin.deleteUser(userId);
    }

    if (organizerUserId) {
      await seeder.cleanup(organizerUserId);
    }
  });

  test('owner can import CSV templates across venues, schedule, teams, scorekeepers, and goalie pool', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240000);

    const outputDir = testInfo.outputDir;
    const venueName = 'Western Fair Sports Center';
    const importedTeamName = 'CSV Thunder';
    const existingTeamName = 'E2E Test Bears';

    const venueCsv = await writeCsvFile(
      outputDir,
      'venues.csv',
      ['name,address,city,province,postal_code,number_of_rinks', `${venueName},865 Florence St,London,ON,N5W 6G6,2`].join('\n'),
    );

    const weeklyScheduleCsv = await writeCsvFile(
      outputDir,
      'weekly-schedule.csv',
      ['venue_name,day_of_week,start_time,end_time,max_games', `${venueName},Tuesday,19:00,20:30,1`].join('\n'),
    );

    const blackoutCsv = await writeCsvFile(
      outputDir,
      'blackouts.csv',
      ['venue_name,date,reason', `${venueName},2026-07-01,Holiday Closure`].join('\n'),
    );

    const teamsCsv = await writeCsvFile(
      outputDir,
      'teams.csv',
      ['team_name,division,color,captain_email', `${importedTeamName},,#1a56db,`].join('\n'),
    );

    const gamesCsv = await writeCsvFile(
      outputDir,
      'games.csv',
      ['date,time,home_team,away_team,venue', `2026-07-08,19:30,${importedTeamName},${existingTeamName},${venueName}`].join('\n'),
    );

    const scorekeepersCsv = await writeCsvFile(
      outputDir,
      'scorekeepers.csv',
      ['email,name,hourlyRate', 'csv-scorekeeper@hockeylife.test,CSV Scorekeeper,26.50'].join('\n'),
    );

    const goaliesCsv = await writeCsvFile(
      outputDir,
      'goalies.csv',
      ['name,email,phone,skill_level,rate_per_game', 'CSV Goalie,csv-goalie@hockeylife.test,555-1234,advanced,55'].join('\n'),
    );

    const ownerSession = await loginBuilder(browser, ownerCredentials.email, ownerCredentials.password);

    await ownerSession.page.goto(`${BUILDER_URL}/en/dashboard/leagues/${leagueId}/settings/venues`);
    await expect(ownerSession.page.getByText('Add Venue')).toBeVisible({ timeout: 20000 });

    await ownerSession.page.locator('input[type="file"]').setInputFiles(venueCsv);
    await expect(ownerSession.page.getByText('1 imported')).toBeVisible({ timeout: 20000 });
    await expect(ownerSession.page.getByText(venueName)).toBeVisible({ timeout: 20000 });

    await ownerSession.page.getByRole('button', { name: 'Weekly Schedule' }).click();
    await ownerSession.page.locator('input[type="file"]').setInputFiles(weeklyScheduleCsv);
    await expect(ownerSession.page.getByText('1 imported')).toBeVisible({ timeout: 20000 });
    await expect(ownerSession.page.locator('body')).toContainText('19:00', { timeout: 20000 });

    await ownerSession.page.getByRole('button', { name: 'Blackout Dates' }).click();
    await ownerSession.page.locator('input[type="file"]').setInputFiles(blackoutCsv);
    await expect(ownerSession.page.getByText('1 imported')).toBeVisible({ timeout: 20000 });
    await expect(ownerSession.page.locator('body')).toContainText('Holiday Closure', { timeout: 20000 });

    await ownerSession.page.goto(`${BUILDER_URL}/en/dashboard/leagues/${leagueId}/teams`);
    await ownerSession.page.getByRole('button', { name: 'Import CSV' }).click();
    await ownerSession.page.locator('[role="dialog"] input[type="file"]').setInputFiles(teamsCsv);
    await ownerSession.page.getByRole('button', { name: /import .*team/i }).click();
    await expect(ownerSession.page.getByText(/1 team\(s\) created|1 teams created/i)).toBeVisible({ timeout: 20000 });
    await expect(ownerSession.page.locator('body')).toContainText(importedTeamName, { timeout: 20000 });

    await ownerSession.page.goto(`${BUILDER_URL}/en/dashboard/leagues/${leagueId}/schedule?season=${seasonId}`);
    await ownerSession.page.getByRole('button', { name: 'Import CSV' }).click();
    await ownerSession.page.locator('[role="dialog"] input[type="file"]').setInputFiles(gamesCsv);
    await ownerSession.page.getByRole('button', { name: /import .*game/i }).click();
    await expect(ownerSession.page.getByText(/1 game\(s\) imported|1 games imported/i)).toBeVisible({ timeout: 20000 });
    await expect(ownerSession.page.locator('body')).toContainText('Games Scheduled', { timeout: 20000 });
    await expect(ownerSession.page.locator('body')).toContainText('1', { timeout: 20000 });

    await ownerSession.page.goto(`${BUILDER_URL}/en/dashboard/leagues/${leagueId}/settings/scorekeepers`);
    await ownerSession.page.getByRole('button', { name: 'Import CSV' }).click();
    await ownerSession.page.locator('[role="dialog"] input[type="file"]').setInputFiles(scorekeepersCsv);
    await ownerSession.page.getByRole('button', { name: /import .*scorekeeper/i }).click();
    await expect(ownerSession.page.getByText(/1 imported|1 scorekeeper\(s\) imported|1 imported successfully/i)).toBeVisible({ timeout: 20000 });
    await expect(ownerSession.page.locator('body')).toContainText('CSV Scorekeeper', { timeout: 20000 });

    await ownerSession.page.goto(`${BUILDER_URL}/en/dashboard/leagues/${leagueId}/settings/goalie-pool`);
    await ownerSession.page.locator('input[type="file"][accept=".csv,text/csv"]').setInputFiles(goaliesCsv);
    await expect(ownerSession.page.locator('body')).toContainText(/Imported 1 goalies?|1 imported/i, {
      timeout: 20000,
    });
    await ownerSession.page.getByRole('button', { name: 'Refresh' }).click();
    await expect(ownerSession.page.locator('body')).toContainText('CSV Goalie', { timeout: 20000 });

    await ownerSession.context.close();
  });

  test('owner can invite players by email with new, duplicate, and existing-account paths', async ({
    browser,
  }) => {
    test.setTimeout(180000);

    const existingPlayer = await seeder.createUser({
      email: 'existing-team-invite@hockeylife.test',
      password: 'TestPassword123!',
      fullName: 'Existing Invite Player',
    });
    extraUserIds.push(existingPlayer.id);

    const ownerSession = await loginBuilder(browser, ownerCredentials.email, ownerCredentials.password);
    await ownerSession.page.goto(`${BUILDER_URL}/en/dashboard/teams/${teamId}`);
    await expect(ownerSession.page.getByRole('button', { name: /add player/i })).toBeVisible({
      timeout: 20000,
    });

    await ownerSession.page.getByRole('button', { name: /add player/i }).click();
    await ownerSession.page.getByRole('button', { name: /invite new player/i }).click();
    await ownerSession.page.getByPlaceholder('player@example.com').fill('brand-new-invite@hockeylife.test');
    await ownerSession.page.getByRole('button', { name: 'Send Invite' }).click();
    await expect(ownerSession.page.getByText('Invite email sent successfully.')).toBeVisible({
      timeout: 20000,
    });

    await ownerSession.page.getByPlaceholder('player@example.com').fill('brand-new-invite@hockeylife.test');
    await ownerSession.page.getByRole('button', { name: 'Send Invite' }).click();
    await expect(ownerSession.page.getByText(/already pending/i)).toBeVisible({ timeout: 20000 });

    await ownerSession.page.getByPlaceholder('player@example.com').fill(existingPlayer.email);
    await ownerSession.page.getByRole('button', { name: 'Send Invite' }).click();

    await ownerSession.page.reload();
    await expect(ownerSession.page.locator('body')).toContainText(existingPlayer.fullName, {
      timeout: 20000,
    });

    await ownerSession.page.getByRole('button', { name: /add player/i }).click();
    await ownerSession.page.getByRole('button', { name: /invite new player/i }).click();
    await ownerSession.page.getByPlaceholder('player@example.com').fill(existingPlayer.email);
    await ownerSession.page.getByRole('button', { name: 'Send Invite' }).click();
    await expect(ownerSession.page.getByText(/already on the roster/i)).toBeVisible({
      timeout: 20000,
    });

    await ownerSession.context.close();
  });
});
