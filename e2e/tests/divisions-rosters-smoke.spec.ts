import { test, expect } from '@playwright/test';

import { TestDataSeeder } from '../fixtures/test-data';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('League builder divisions and rosters smoke', () => {
  test.describe.configure({ mode: 'serial' });

  let seeder: TestDataSeeder;
  let testEnv: Awaited<ReturnType<TestDataSeeder['seedCompleteEnvironment']>>;

  test.beforeAll(async () => {
    seeder = new TestDataSeeder();
    testEnv = await seeder.seedCompleteEnvironment();
  });

  test.afterAll(async () => {
    if (testEnv?.user?.id) {
      await seeder.cleanup(testEnv.user.id);
    }
  });

  test('league admin can create a division from the divisions page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testEnv.user.email);
    await page.fill('input[type="password"]', testEnv.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    await page.goto(`/en/dashboard/leagues/${testEnv.league.id}/divisions`);

    await page.getByRole('button', { name: /create division/i }).click();
    await page.getByLabel(/division name/i).fill('Smoke Division');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByText('Smoke Division')).toBeVisible();
  });

  test('season roster cards open the admin team roster with season context', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testEnv.user.email);
    await page.fill('input[type="password"]', testEnv.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    await page.goto(
      `/en/dashboard/leagues/${testEnv.league.id}/seasons/${testEnv.season.id}/rosters`
    );

    await page.getByRole('link', { name: new RegExp(escapeRegExp(testEnv.teams[0].name), 'i') }).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/en/dashboard/teams/${testEnv.teams[0].id}\\?tab=roster&leagueId=${testEnv.league.id}&seasonId=${testEnv.season.id}&from=season-rosters`
      )
    );
    await expect(page.getByText('Team Roster')).toBeVisible();
    await expect(page.getByRole('link', { name: /back to rosters/i })).toBeVisible();
  });
});
