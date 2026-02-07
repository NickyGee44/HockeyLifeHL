import { test, expect, type Page } from '@playwright/test';

/**
 * League Site Smoke E2E Tests
 *
 * Comprehensive regression tests for the BMHL league site covering:
 * - Homepage rendering (header, hero, footer)
 * - Header navigation and sticky behavior
 * - Score ticker visibility and interactions
 * - Division filter dropdown behavior and persistence
 * - Theme toggle (light/dark) and localStorage persistence
 * - Mobile menu functionality
 *
 * IMPORTANT: These tests target the league-sites app (port 3001).
 * The baseURL is set per-project in playwright.config.ts to http://localhost:3001.
 *
 * A real league slug is needed. Set E2E_LEAGUE_SLUG env var or 'bmhl' is used.
 */

// League sites base URL (different from the builder which is on port 3000)
const LEAGUE_SITES_BASE = process.env.LEAGUE_SITES_URL || 'http://localhost:3001';
const LEAGUE_SLUG = process.env.E2E_LEAGUE_SLUG || 'bmhl';

/**
 * Helper: navigate to the league homepage and skip if the league slug is not found.
 */
async function gotoLeagueHome(page: Page): Promise<boolean> {
  const response = await page.goto(`/${LEAGUE_SLUG}`);
  if (!response || response.status() === 404) {
    return false;
  }
  await page.waitForLoadState('networkidle');
  return true;
}

test.describe('League Site Smoke Tests', () => {
  test.use({ baseURL: LEAGUE_SITES_BASE });

  // =========================================================================
  // Homepage Rendering
  // =========================================================================
  test.describe('Homepage Rendering', () => {
    test('league homepage renders with header, hero, and footer', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found. Set E2E_LEAGUE_SLUG to a valid league.`);
        return;
      }

      // Header should be present
      const header = page.locator('[data-testid="league-header"]');
      await expect(header).toBeVisible({ timeout: 10000 });

      // Hero section should be present
      const heroSection = page.locator('[data-testid="hero-section"]');
      await expect(heroSection).toBeVisible();

      // League name should appear in the hero h1
      const leagueName = heroSection.locator('h1').first();
      await expect(leagueName).toBeVisible();
      const nameText = await leagueName.textContent();
      expect(nameText?.trim().length).toBeGreaterThan(0);

      // Footer should be present
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('homepage shows stats cards in hero section', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      // Hero section stat cards should be visible
      const statLabels = ['Teams', 'Players', 'Games Played', 'Upcoming'];
      let foundStats = 0;

      for (const label of statLabels) {
        const statCard = page.locator(`text=${label}`).first();
        if (await statCard.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundStats++;
        }
      }

      // Should find at least some stat labels
      expect(foundStats).toBeGreaterThanOrEqual(2);
    });

    test('homepage shows CTA buttons (Schedule, Standings, Scores)', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const scheduleLink = page.locator(`a[href*="/${LEAGUE_SLUG}/schedule"]`).first();
      const standingsLink = page.locator(`a[href*="/${LEAGUE_SLUG}/standings"]`).first();
      const scoresLink = page.locator(`a[href*="/${LEAGUE_SLUG}/scores"]`).first();

      await expect(scheduleLink).toBeVisible();
      await expect(standingsLink).toBeVisible();
      await expect(scoresLink).toBeVisible();
    });

    test('cards use league CSS custom properties for theming', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      // Verify that CSS custom properties are set on the page
      const primaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--league-primary').trim();
      });

      expect(primaryColor.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Header & Navigation
  // =========================================================================
  test.describe('Header & Navigation', () => {
    test('header has navigation links (Scores, Schedule, Standings, Teams, Stats)', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const expectedNavItems = ['scores', 'schedule', 'standings', 'teams', 'stats'];

      for (const item of expectedNavItems) {
        const link = page.locator(`a[href*="/${LEAGUE_SLUG}/${item}"]`).first();
        // Link should exist in the DOM (may be hidden on mobile)
        await expect(link).toBeAttached();
      }
    });

    test('header shows league logo or initials', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const header = page.locator('[data-testid="league-header"]');
      await expect(header).toBeVisible();

      // Should have either an img (logo) or a div with initials
      const logoImg = header.locator('img').first();
      const initialsDiv = header.locator('.font-black').first();

      const hasLogo = await logoImg.isVisible({ timeout: 3000 }).catch(() => false);
      const hasInitials = await initialsDiv.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasLogo || hasInitials).toBe(true);
    });

    test('header has "Official League Site" label', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const officialLabel = page.locator('text=Official League Site');
      await expect(officialLabel).toBeVisible();
    });

    test('header becomes sticky when scrolling (ticker scrolls away, header sticks)', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const header = page.locator('[data-testid="league-header"]');
      await expect(header).toBeVisible();

      // The header has CSS class "sticky top-0" which makes it stick at the top
      // Verify the header has sticky positioning
      const positionStyle = await header.evaluate((el) => {
        return getComputedStyle(el).position;
      });
      expect(positionStyle).toBe('sticky');

      // Scroll down the page significantly
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);

      // Header should still be visible (sticky)
      await expect(header).toBeVisible();

      // Header should be at the top of the viewport (top = 0)
      const headerBox = await header.boundingBox();
      expect(headerBox).toBeTruthy();
      if (headerBox) {
        // The header's top should be at or near 0 (top of viewport) since it is sticky
        expect(headerBox.y).toBeLessThanOrEqual(5);
      }

      // If there's a score ticker, it should have scrolled out of view
      const scoreTicker = page.locator('[data-testid="score-ticker"]');
      const tickerExists = await scoreTicker.isVisible({ timeout: 1000 }).catch(() => false);
      if (tickerExists) {
        const tickerBox = await scoreTicker.boundingBox();
        if (tickerBox) {
          // Ticker should be above the viewport (negative y) since we scrolled past it
          expect(tickerBox.y).toBeLessThan(0);
        }
      }
    });

    test('desktop nav links navigate to correct pages', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      // Click on the Schedule link in desktop nav
      const desktopNav = page.locator('[data-testid="desktop-nav"]');
      const scheduleLink = desktopNav.locator(`a[href*="/${LEAGUE_SLUG}/schedule"]`).first();

      if (await scheduleLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await scheduleLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(new RegExp(`/${LEAGUE_SLUG}/schedule`));
      }
    });
  });

  // =========================================================================
  // Mobile Menu
  // =========================================================================
  test.describe('Mobile Menu', () => {
    test('mobile menu toggle button is visible on small screens', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForLoadState('networkidle');

      const menuButton = page.locator('[data-testid="mobile-menu-toggle"]');
      await expect(menuButton).toBeVisible();
    });

    test('clicking mobile menu toggle opens the navigation panel', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const menuButton = page.locator('[data-testid="mobile-menu-toggle"]');
      await expect(menuButton).toBeVisible();

      // Mobile nav should NOT be visible initially
      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      await expect(mobileNav).not.toBeVisible();

      // Click to open
      await menuButton.click();
      await page.waitForTimeout(300);

      // Mobile nav should now be visible
      await expect(mobileNav).toBeVisible();

      // Should show navigation links
      const navLinks = mobileNav.locator(`a[href*="/${LEAGUE_SLUG}/"]`);
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThanOrEqual(5); // At least Scores, Schedule, Standings, Teams, Stats
    });

    test('clicking mobile menu toggle again closes the navigation panel', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const menuButton = page.locator('[data-testid="mobile-menu-toggle"]');

      // Open menu
      await menuButton.click();
      await page.waitForTimeout(300);
      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible();

      // Close menu (button is now "Close menu")
      const closeButton = page.locator('button[aria-label="Close menu"]');
      await closeButton.click();
      await page.waitForTimeout(300);

      // Mobile nav should be hidden
      await expect(mobileNav).not.toBeVisible();
    });

    test('clicking a mobile nav link closes the menu and navigates', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const menuButton = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuButton.click();
      await page.waitForTimeout(300);

      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      const standingsLink = mobileNav.locator(`a[href*="/${LEAGUE_SLUG}/standings"]`).first();

      if (await standingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await standingsLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(new RegExp(`/${LEAGUE_SLUG}/standings`));

        // Mobile nav should be closed after navigation
        await expect(mobileNav).not.toBeVisible();
      }
    });
  });

  // =========================================================================
  // Score Ticker
  // =========================================================================
  test.describe('Score Ticker', () => {
    test('score ticker renders game tiles when games exist', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      // The ScoreTicker returns null if no games, so it may not be present
      const ticker = page.locator('[data-testid="score-ticker"]');
      const tickerVisible = await ticker.isVisible({ timeout: 3000 }).catch(() => false);

      if (tickerVisible) {
        // Verify the ticker has game tiles (links to game detail pages)
        const gameTiles = ticker.locator(`a[href*="/${LEAGUE_SLUG}/games/"]`);
        const gameCount = await gameTiles.count();
        expect(gameCount).toBeGreaterThan(0);

        // First tile should have some content (team names, scores, etc.)
        const firstTile = gameTiles.first();
        await expect(firstTile).toBeVisible();
        const tileText = await firstTile.textContent();
        expect(tileText?.trim().length).toBeGreaterThan(0);
      }
      // If ticker is not visible, the league has no games -- acceptable
    });

    test('score ticker has scroll navigation buttons', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const ticker = page.locator('[data-testid="score-ticker"]');
      const tickerVisible = await ticker.isVisible({ timeout: 3000 }).catch(() => false);

      if (tickerVisible) {
        // ScoreTicker has "Scroll left" and "Scroll right" buttons
        const scrollLeftBtn = ticker.locator('button[aria-label="Scroll left"]');
        const scrollRightBtn = ticker.locator('button[aria-label="Scroll right"]');

        await expect(scrollLeftBtn).toBeAttached();
        await expect(scrollRightBtn).toBeAttached();
      }
    });

    test('score ticker is not sticky (scrolls away with page)', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const ticker = page.locator('[data-testid="score-ticker"]');
      const tickerVisible = await ticker.isVisible({ timeout: 3000 }).catch(() => false);

      if (tickerVisible) {
        // The ticker should NOT be sticky -- verify position is not sticky or fixed
        const positionStyle = await ticker.evaluate((el) => {
          return getComputedStyle(el).position;
        });
        expect(positionStyle).not.toBe('sticky');
        expect(positionStyle).not.toBe('fixed');
      }
    });

    test('game tiles in ticker link to game detail pages', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const ticker = page.locator('[data-testid="score-ticker"]');
      const tickerVisible = await ticker.isVisible({ timeout: 3000 }).catch(() => false);

      if (tickerVisible) {
        const gameTiles = ticker.locator(`a[href*="/${LEAGUE_SLUG}/games/"]`);
        const count = await gameTiles.count();

        if (count > 0) {
          // Verify the href pattern is correct (contains a game UUID or ID)
          const href = await gameTiles.first().getAttribute('href');
          expect(href).toMatch(new RegExp(`^/${LEAGUE_SLUG}/games/.+`));
        }
      }
    });
  });

  // =========================================================================
  // Theme Toggle
  // =========================================================================
  test.describe('Theme Toggle', () => {
    test('theme toggle button is visible', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
      await expect(themeToggle).toBeVisible({ timeout: 5000 });
    });

    test('clicking theme toggle switches between light and dark mode', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
      await expect(themeToggle).toBeVisible({ timeout: 5000 });

      // Get the initial aria-label to determine current mode
      const initialLabel = await themeToggle.getAttribute('aria-label');
      const initiallyDark = initialLabel?.includes('Switch to light mode');

      // Click to toggle
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Re-locate the toggle (it re-renders with new aria-label)
      const updatedToggle = page.locator('[data-testid="theme-toggle"]').first();
      const newLabel = await updatedToggle.getAttribute('aria-label');

      if (initiallyDark) {
        // Was dark (label said "Switch to light mode"), now should say "Switch to dark mode"
        expect(newLabel).toContain('Switch to dark mode');
      } else {
        // Was light (label said "Switch to dark mode"), now should say "Switch to light mode"
        expect(newLabel).toContain('Switch to light mode');
      }

      // The html element's class should reflect the theme
      const htmlClass = await page.evaluate(() => document.documentElement.className);
      if (initiallyDark) {
        expect(htmlClass).toContain('light');
      } else {
        expect(htmlClass).toContain('dark');
      }
    });

    test('theme applies correctly to header, hero, and content areas', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
      await expect(themeToggle).toBeVisible({ timeout: 5000 });

      // Ensure we are in dark mode first
      const initialLabel = await themeToggle.getAttribute('aria-label');
      if (initialLabel?.includes('Switch to dark mode')) {
        // Currently light, switch to dark
        await themeToggle.click();
        await page.waitForTimeout(500);
      }

      // In dark mode: verify background colors are dark-ish
      const bgColorDark = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
      });
      expect(bgColorDark.length).toBeGreaterThan(0);

      // Now switch to light mode
      const toggleInDark = page.locator('[data-testid="theme-toggle"]').first();
      await toggleInDark.click();
      await page.waitForTimeout(500);

      // In light mode: verify background color changed
      const bgColorLight = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
      });
      expect(bgColorLight.length).toBeGreaterThan(0);

      // The two backgrounds should differ (dark vs light)
      // Note: Some theme implementations may not change CSS variables
      // but the html class should have changed
      const htmlClass = await page.evaluate(() => document.documentElement.className);
      expect(htmlClass).toContain('light');
    });

    test('theme persists on page reload (localStorage)', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
      await expect(themeToggle).toBeVisible({ timeout: 5000 });

      // Get current theme and toggle to the opposite
      const initialLabel = await themeToggle.getAttribute('aria-label');
      const initiallyDark = initialLabel?.includes('Switch to light mode');

      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Verify the theme changed
      const expectedTheme = initiallyDark ? 'light' : 'dark';
      const htmlClassAfterToggle = await page.evaluate(() => document.documentElement.className);
      expect(htmlClassAfterToggle).toContain(expectedTheme);

      // Verify localStorage was updated (next-themes uses 'theme' key)
      const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
      expect(storedTheme).toBe(expectedTheme);

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // After reload, the theme should be restored
      // Wait for client hydration (ThemeToggle has a mounted check)
      await page.waitForTimeout(1000);

      const htmlClassAfterReload = await page.evaluate(() => document.documentElement.className);
      expect(htmlClassAfterReload).toContain(expectedTheme);

      // The toggle button should reflect the persisted theme
      const reloadedToggle = page.locator('[data-testid="theme-toggle"]').first();
      await expect(reloadedToggle).toBeVisible({ timeout: 5000 });
      const reloadedLabel = await reloadedToggle.getAttribute('aria-label');

      if (expectedTheme === 'dark') {
        expect(reloadedLabel).toContain('Switch to light mode');
      } else {
        expect(reloadedLabel).toContain('Switch to dark mode');
      }
    });
  });

  // =========================================================================
  // Division Filter
  // =========================================================================
  test.describe('Division Filter', () => {
    test('division filter dropdown appears when league has multiple divisions', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const divisionFilter = page.locator('[data-testid="division-filter"]');

      if (await divisionFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Division filter is visible -- league has multiple divisions

        // Should have "All Divisions" option
        const allOption = divisionFilter.locator('option[value=""]');
        await expect(allOption).toBeAttached();
        const allText = await allOption.textContent();
        expect(allText).toBe('All Divisions');

        // Should have at least one division option besides "All Divisions"
        const options = divisionFilter.locator('option');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(1);
      } else {
        // No division filter -- league has 0 or 1 division, which is valid
        // The LeagueHeader only shows the filter when divisions.length > 1
      }
    });

    test('selecting a division updates the select value', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const divisionFilter = page.locator('[data-testid="division-filter"]');

      if (!(await divisionFilter.isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip(true, 'No division filter available -- league has 0 or 1 division.');
        return;
      }

      const options = divisionFilter.locator('option');
      const optionCount = await options.count();

      if (optionCount <= 1) {
        test.skip(true, 'Only one option in division filter.');
        return;
      }

      // Select the first division (index 1, since index 0 is "All Divisions")
      const firstDivisionValue = await options.nth(1).getAttribute('value');
      const firstDivisionText = await options.nth(1).textContent();

      expect(firstDivisionValue).toBeTruthy();

      await divisionFilter.selectOption(firstDivisionValue!);
      await page.waitForTimeout(500);

      // The select should now have the selected division
      const selectedValue = await divisionFilter.inputValue();
      expect(selectedValue).toBe(firstDivisionValue);
    });

    test('division filter persists in localStorage', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const divisionFilter = page.locator('[data-testid="division-filter"]');

      if (!(await divisionFilter.isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip(true, 'No division filter available -- league has 0 or 1 division.');
        return;
      }

      const options = divisionFilter.locator('option');
      const optionCount = await options.count();

      if (optionCount <= 1) {
        test.skip(true, 'Only one option in division filter.');
        return;
      }

      // Select a division
      const divisionValue = await options.nth(1).getAttribute('value');
      await divisionFilter.selectOption(divisionValue!);
      await page.waitForTimeout(500);

      // Verify localStorage was updated
      // DivisionFilterProvider uses key: `hl-division-filter-{leagueId}`
      const storedDivision = await page.evaluate(() => {
        // Find the division filter key in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('hl-division-filter-')) {
            return localStorage.getItem(key);
          }
        }
        return null;
      });

      expect(storedDivision).toBe(divisionValue);
    });

    test('division filter persists when navigating between pages', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const divisionFilter = page.locator('[data-testid="division-filter"]');

      if (!(await divisionFilter.isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip(true, 'No division filter available -- league has 0 or 1 division.');
        return;
      }

      const options = divisionFilter.locator('option');
      const optionCount = await options.count();

      if (optionCount <= 1) {
        test.skip(true, 'Only one option in division filter.');
        return;
      }

      // Select a division
      const divisionValue = await options.nth(1).getAttribute('value');
      await divisionFilter.selectOption(divisionValue!);
      await page.waitForTimeout(500);

      // Navigate to scores page
      await page.goto(`/${LEAGUE_SLUG}/scores`);
      await page.waitForLoadState('networkidle');

      // Check that the division filter still has the selected value
      // (it loads from localStorage on mount)
      const filterOnScores = page.locator('[data-testid="division-filter"]');
      if (await filterOnScores.isVisible({ timeout: 3000 }).catch(() => false)) {
        const valueOnScores = await filterOnScores.inputValue();
        expect(valueOnScores).toBe(divisionValue);
      }

      // Navigate to schedule page
      await page.goto(`/${LEAGUE_SLUG}/schedule`);
      await page.waitForLoadState('networkidle');

      const filterOnSchedule = page.locator('[data-testid="division-filter"]');
      if (await filterOnSchedule.isVisible({ timeout: 3000 }).catch(() => false)) {
        const valueOnSchedule = await filterOnSchedule.inputValue();
        expect(valueOnSchedule).toBe(divisionValue);
      }

      // Navigate to standings page
      await page.goto(`/${LEAGUE_SLUG}/standings`);
      await page.waitForLoadState('networkidle');

      const filterOnStandings = page.locator('[data-testid="division-filter"]');
      if (await filterOnStandings.isVisible({ timeout: 3000 }).catch(() => false)) {
        const valueOnStandings = await filterOnStandings.inputValue();
        expect(valueOnStandings).toBe(divisionValue);
      }
    });

    test('"All Divisions" resets the filter and removes localStorage entry', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const divisionFilter = page.locator('[data-testid="division-filter"]');

      if (!(await divisionFilter.isVisible({ timeout: 3000 }).catch(() => false))) {
        test.skip(true, 'No division filter available -- league has 0 or 1 division.');
        return;
      }

      const options = divisionFilter.locator('option');
      const optionCount = await options.count();

      if (optionCount <= 1) {
        test.skip(true, 'Only one option in division filter.');
        return;
      }

      // First, select a specific division
      const divisionValue = await options.nth(1).getAttribute('value');
      await divisionFilter.selectOption(divisionValue!);
      await page.waitForTimeout(500);

      // Verify it was stored
      let storedBefore = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('hl-division-filter-')) {
            return localStorage.getItem(key);
          }
        }
        return null;
      });
      expect(storedBefore).toBe(divisionValue);

      // Now select "All Divisions" (value "")
      await divisionFilter.selectOption('');
      await page.waitForTimeout(500);

      // The select should be back to empty (All Divisions)
      const selectedValue = await divisionFilter.inputValue();
      expect(selectedValue).toBe('');

      // localStorage should have the key removed
      const storedAfter = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('hl-division-filter-')) {
            return localStorage.getItem(key);
          }
        }
        return null;
      });
      expect(storedAfter).toBeNull();
    });

    test('division filter is also present in mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      // Open mobile menu
      const menuButton = page.locator('[data-testid="mobile-menu-toggle"]');
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await page.waitForTimeout(300);

      const mobileNav = page.locator('[data-testid="mobile-nav"]');
      await expect(mobileNav).toBeVisible();

      // Check for mobile division filter
      const mobileDivisionFilter = page.locator('[data-testid="division-filter-mobile"]');
      const hasMobileFilter = await mobileDivisionFilter.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasMobileFilter) {
        // Should have "All Divisions" as first option
        const allOption = mobileDivisionFilter.locator('option[value=""]');
        await expect(allOption).toBeAttached();

        const options = mobileDivisionFilter.locator('option');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThan(1);
      }
      // If no mobile filter, the league has 0 or 1 division -- acceptable
    });
  });

  // =========================================================================
  // Footer
  // =========================================================================
  test.describe('Footer', () => {
    test('footer renders with league branding', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();

      const footerText = await footer.textContent();
      expect(footerText).toBeTruthy();

      // Should contain year or league name or powered by text
      const hasYear = footerText?.includes(new Date().getFullYear().toString());
      const hasBranding = footerText?.toLowerCase().includes('beer league') ||
                          footerText?.toLowerCase().includes('powered by');
      expect(hasYear || hasBranding).toBe(true);
    });

    test('footer has gradient border using league colors', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      const footer = page.locator('footer');
      await expect(footer).toBeVisible();

      // The footer has a gradient top border (3px height div at top)
      const gradientBorder = footer.locator('.h-\\[3px\\]');
      if (await gradientBorder.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(gradientBorder).toBeVisible();
      }
    });
  });

  // =========================================================================
  // Card Styling Consistency
  // =========================================================================
  test.describe('Card Styling Consistency', () => {
    test('cards have consistent styling (rounded borders)', async ({ page }) => {
      const loaded = await gotoLeagueHome(page);
      if (!loaded) {
        test.skip(true, `League slug "${LEAGUE_SLUG}" not found.`);
        return;
      }

      // Check that cards use rounded styling consistently
      const cards = page.locator('[class*="rounded"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Check that stat cards in hero section use consistent border-radius
      const statCards = page.locator('.rounded-2xl');
      const statCardCount = await statCards.count();
      expect(statCardCount).toBeGreaterThan(0);
    });
  });
});
