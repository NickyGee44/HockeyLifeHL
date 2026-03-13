import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { TestDataSeeder } from '../fixtures/test-data';

type SeededPlayer = {
  id: string;
  fullName: string;
  jerseyNumber: number;
  teamId: string;
  position: 'Forward' | 'Defense' | 'Goalie';
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LEAGUE_SITES_URL = process.env.LEAGUE_SITES_URL || 'http://localhost:3001';

async function dismissCookieBanner(page: import('@playwright/test').Page) {
  const acceptEssential = page.getByRole('button', { name: 'Accept essential cookies only' });
  if (await acceptEssential.isVisible().catch(() => false)) {
    await acceptEssential.click();
  }
}

async function seedCookieConsent(page: import('@playwright/test').Page) {
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

test.describe.serial('League Sites Scorekeeper Live Flow', () => {
  let seeder: TestDataSeeder;
  let organizerUserId: string | null = null;
  const extraUserIds: string[] = [];
  let leagueSlug = '';
  let gameId = '';
  let token = '';
  let awayTeamName = '';
  let homeTeamName = '';

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are required for league site scorekeeper smoke tests.');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    seeder = new TestDataSeeder();
    const env = await seeder.seedCompleteEnvironment();
    organizerUserId = env.user.id;
    leagueSlug = env.league.slug;
    awayTeamName = env.teams[1].name;
    homeTeamName = env.teams[0].name;

    const createPlayer = async (
      fullName: string,
      jerseyNumber: number,
      teamId: string,
      position: 'Forward' | 'Defense' | 'Goalie'
    ): Promise<SeededPlayer> => {
      const emailBase = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.');
      const user = await seeder.createUser({
        email: `${emailBase}@hockeylife.test`,
        password: 'TestPassword123!',
        fullName,
      });
      extraUserIds.push(user.id);
      return { id: user.id, fullName, jerseyNumber, teamId, position };
    };

    const players: SeededPlayer[] = [
      await createPlayer('Home Seven', 7, env.teams[0].id, 'Forward'),
      await createPlayer('Home Goalie', 30, env.teams[0].id, 'Goalie'),
      await createPlayer('Away Seventeen', 17, env.teams[1].id, 'Forward'),
      await createPlayer('Away Goalie', 31, env.teams[1].id, 'Goalie'),
    ];

    const rosterRows = players.map((player) => ({
      team_id: player.teamId,
      season_id: env.season.id,
      player_id: player.id,
      jersey_number: player.jerseyNumber,
      position: player.position,
      status: 'active',
    }));

    const { error: rosterError } = await supabase.from('team_rosters').insert(rosterRows);
    if (rosterError) {
      throw new Error(`Failed to seed team rosters: ${rosterError.message}`);
    }

    await supabase
      .from('teams')
      .update({ captain_id: players[0].id })
      .eq('id', env.teams[0].id);

    await supabase
      .from('teams')
      .update({ captain_id: players[2].id })
      .eq('id', env.teams[1].id);

    const game = await seeder.createGame({
      seasonId: env.season.id,
      homeTeamId: env.teams[0].id,
      awayTeamId: env.teams[1].id,
      status: 'in_progress',
      scheduledAt: new Date().toISOString(),
    });
    gameId = game.id;

    const { error: gameUpdateError } = await supabase
      .from('games')
      .update({
        status: 'in_progress',
        current_period: 1,
        timer_elapsed_seconds: 0,
        timer_running: false,
      })
      .eq('id', gameId);

    if (gameUpdateError) {
      throw new Error(`Failed to initialize game timer state: ${gameUpdateError.message}`);
    }

    token = `SK${Date.now().toString(36).toUpperCase()}`;
    const { error: sessionError } = await supabase.from('scorekeeper_sessions').insert({
      game_id: gameId,
      league_id: env.league.id,
      token,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_by: env.user.id,
      session_type: 'single',
      is_active: true,
    });

    if (sessionError) {
      throw new Error(`Failed to seed scorekeeper session: ${sessionError.message}`);
    }
  });

  test.afterAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (organizerUserId) {
      await seeder.cleanup(organizerUserId);
    }

    for (const userId of extraUserIds) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  test('power-play goal clears the active minor and public live game updates', async ({ page, browser }) => {
    test.setTimeout(180000);

    const publicPage = await browser.newPage();
    await seedCookieConsent(publicPage);
    await seedCookieConsent(page);

    await publicPage.goto(`${LEAGUE_SITES_URL}/${leagueSlug}/games/${gameId}`);
    await dismissCookieBanner(publicPage);
    await expect(publicPage.getByText('Live Game')).toBeVisible({ timeout: 20000 });

    await page.goto(`${LEAGUE_SITES_URL}/${leagueSlug}/scorekeeper?token=${token}`);
    await dismissCookieBanner(page);
    await page.waitForURL(new RegExp(`/${leagueSlug}/scorekeeper/game/${gameId}`), { timeout: 20000 });
    await expect(page.getByRole('button', { name: '+ Goal' }).first()).toBeVisible({ timeout: 20000 });

    // Home penalty (#7) should create an active manpower disadvantage.
    await page.getByRole('button', { name: '+ Penalty' }).first().click();
    await page.getByRole('button').filter({ hasText: 'Seven' }).click();
    await page.getByRole('button', { name: 'Tripping' }).click();

    await expect(page.getByText('PENALTY - Tripping')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/4v5|5v4/)).toBeVisible({ timeout: 15000 });
    await expect(publicPage.getByText(new RegExp(`${homeTeamName} penalties`, 'i'))).toBeVisible({ timeout: 15000 });

    // Away power-play goal (#17) should clear the active minor.
    await page.getByRole('button', { name: '+ Goal' }).nth(1).click();
    await page.getByRole('button').filter({ hasText: 'Seventeen' }).click();
    await page.getByRole('button', { name: 'Unassisted Goal' }).click();

    await expect(page.getByText('Saving goal...')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText(/4v5|5v4/)).toHaveCount(0, { timeout: 15000 });

    const awayGoalsCard = publicPage.locator('div').filter({
      has: publicPage.getByText(`${awayTeamName} Goals`, { exact: true }),
    }).first();
    await expect(awayGoalsCard).toContainText('1', { timeout: 15000 });
    await expect(publicPage.getByText(new RegExp(`${homeTeamName} penalties`, 'i'))).toHaveCount(0, { timeout: 15000 });
    await expect(publicPage.getByText('Goal', { exact: true })).toBeVisible({ timeout: 15000 });

    // Undo the goal and confirm both score + active penalty replay correctly.
    await page.getByLabel('Undo event').first().click({ force: true });

    await expect(page.getByText(/4v5|5v4/)).toBeVisible({ timeout: 15000 });
    await expect(publicPage.getByText(new RegExp(`${homeTeamName} penalties`, 'i'))).toBeVisible({ timeout: 15000 });
    await expect(awayGoalsCard).toContainText('0', { timeout: 15000 });

    await publicPage.reload();
    await expect(publicPage.getByText(new RegExp(`${homeTeamName} penalties`, 'i'))).toBeVisible({ timeout: 15000 });
    await expect(awayGoalsCard).toContainText('0', { timeout: 15000 });

    await publicPage.close();
  });
});
