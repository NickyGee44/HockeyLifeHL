import { test, expect } from '@playwright/test';

const LEAGUE_SLUG = process.env.LEAGUE_SITES_TEST_SLUG || 'tnhc';

test.describe('League Site Responsive Regression', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'small-desktop', width: 1024, height: 768 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`homepage has no horizontal overflow (${viewport.name})`, async ({ browser }) => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(`/${LEAGUE_SLUG}`, { waitUntil: 'networkidle' });

      const metrics = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
      await context.close();
    });
  }

  test('homepage keeps news module visible with fallback', async ({ page }) => {
    await page.goto(`/${LEAGUE_SLUG}`, { waitUntil: 'networkidle' });
    const hasNewsHeading = await page.locator('text=Around The League').first().isVisible().catch(() => false);
    const hasFallback = await page.locator('text=No News Yet').first().isVisible().catch(() => false);

    expect(hasNewsHeading || hasFallback).toBeTruthy();
  });
});
