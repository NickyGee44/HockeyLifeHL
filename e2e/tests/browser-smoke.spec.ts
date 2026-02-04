import { test, expect } from '@playwright/test';

/**
 * Browser Smoke Tests
 * Simple tests to verify each browser can:
 * 1. Launch successfully
 * 2. Navigate to a page
 * 3. Interact with basic elements
 * 4. Handle JavaScript execution
 */

test.describe('Browser Smoke Tests', () => {
  test('should launch browser and load page', async ({ page, browserName }) => {
    // Navigate to a data URL (no server needed)
    await page.goto('data:text/html,<html><body><h1 id="title">Browser Test</h1><button id="btn">Click Me</button></body></html>');

    // Verify page loaded
    const title = await page.textContent('#title');
    expect(title).toBe('Browser Test');

    console.log(`✅ ${browserName} loaded page successfully`);
  });

  test('should handle clicks and DOM manipulation', async ({ page, browserName }) => {
    await page.goto('data:text/html,<html><body><button id="btn">Click Me</button><div id="result"></div><script>document.getElementById("btn").onclick = () => { document.getElementById("result").textContent = "Clicked!"; }</script></body></html>');

    // Click button
    await page.click('#btn');

    // Verify JavaScript executed
    await expect(page.locator('#result')).toHaveText('Clicked!');

    console.log(`✅ ${browserName} handled click event successfully`);
  });

  test('should navigate to external site', async ({ page, browserName }) => {
    // Navigate to a reliable external site
    await page.goto('https://playwright.dev/');

    // Verify navigation
    await expect(page).toHaveTitle(/Playwright/);

    console.log(`✅ ${browserName} navigated to external site successfully`);
  });

  test('should handle localStorage', async ({ page, browserName }) => {
    await page.goto('data:text/html,<html><body><h1>Storage Test</h1></body></html>');

    // Set localStorage
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value');
    });

    // Read localStorage
    const value = await page.evaluate(() => {
      return localStorage.getItem('test-key');
    });

    expect(value).toBe('test-value');

    console.log(`✅ ${browserName} handled localStorage successfully`);
  });

  test('should support CSS and rendering', async ({ page, browserName }) => {
    await page.goto('data:text/html,<html><head><style>body { background-color: rgb(255, 0, 0); }</style></head><body><div id="test">Test</div></body></html>');

    // Check computed styles
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bgColor).toBe('rgb(255, 0, 0)');

    console.log(`✅ ${browserName} rendered CSS correctly`);
  });
});

/**
 * Cross-Browser Compatibility Tests
 * Verify behavior is consistent across browsers
 */
test.describe('Cross-Browser Compatibility', () => {
  test('should have consistent viewport dimensions', async ({ page, browserName }) => {
    await page.goto('data:text/html,<html><body>Test</body></html>');

    const viewport = page.viewportSize();
    expect(viewport).toBeDefined();
    expect(viewport?.width).toBe(1280);
    expect(viewport?.height).toBe(720);

    console.log(`✅ ${browserName} viewport: ${viewport?.width}x${viewport?.height}`);
  });

  test('should handle async operations', async ({ page, browserName }) => {
    await page.goto('data:text/html,<html><body><div id="result">Loading...</div><script>setTimeout(() => { document.getElementById("result").textContent = "Loaded!"; }, 1000);</script></body></html>');

    // Wait for async operation
    await expect(page.locator('#result')).toHaveText('Loaded!', { timeout: 5000 });

    console.log(`✅ ${browserName} handled async operation successfully`);
  });

  test('should support modern JavaScript features', async ({ page, browserName }) => {
    await page.goto('data:text/html,<html><body><div id="result"></div></body></html>');

    const result = await page.evaluate(() => {
      // Test ES6+ features
      const arr = [1, 2, 3];
      const doubled = arr.map(x => x * 2);
      const sum = doubled.reduce((a, b) => a + b, 0);
      const obj = { sum, doubled };
      return JSON.stringify(obj);
    });

    const parsed = JSON.parse(result);
    expect(parsed.sum).toBe(12);
    expect(parsed.doubled).toEqual([2, 4, 6]);

    console.log(`✅ ${browserName} supports modern JavaScript`);
  });
});
