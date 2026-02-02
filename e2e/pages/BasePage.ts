import { Page, Locator, expect } from '@playwright/test';

// Default locale for URLs
const DEFAULT_LOCALE = 'en';

// Routes that exist under [locale] - add locale prefix
const LOCALE_ROUTES = ['/dashboard', '/login', '/signup'];

/**
 * Base Page Object
 * Contains common methods and utilities used across all pages
 */
export abstract class BasePage {
  readonly page: Page;
  readonly url: string;
  readonly locale: string;

  constructor(page: Page, url: string = '/', locale: string = DEFAULT_LOCALE) {
    this.page = page;
    this.locale = locale;
    // Add locale prefix for routes that require it
    const needsLocale = LOCALE_ROUTES.some(route => url === route || url.startsWith(route + '/'));
    this.url = needsLocale ? `/${locale}${url}` : url;
  }

  /**
   * Navigate to the page
   */
  async goto(): Promise<void> {
    await this.page.goto(this.url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(url?: string | RegExp): Promise<void> {
    if (url) {
      await this.page.waitForURL(url);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Click and wait for navigation
   */
  async clickAndNavigate(locator: Locator, expectedUrl?: string | RegExp): Promise<void> {
    await Promise.all([
      expectedUrl ? this.page.waitForURL(expectedUrl) : this.page.waitForLoadState('networkidle'),
      locator.click(),
    ]);
  }

  /**
   * Fill input field
   */
  async fillInput(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string): Promise<void> {
    await this.page.selectOption(selector, value);
  }

  /**
   * Get text content of element
   */
  async getTextContent(locator: Locator): Promise<string | null> {
    return locator.textContent();
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string): Promise<void> {
    const toast = this.page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 10000 });

    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  /**
   * Wait for success toast
   */
  async waitForSuccessToast(message?: string): Promise<void> {
    await this.waitForToast(message);
  }

  /**
   * Wait for error toast
   */
  async waitForErrorToast(message?: string): Promise<void> {
    await this.waitForToast(message);
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Assert page title
   */
  async assertTitle(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(expected);
  }

  /**
   * Assert current URL
   */
  async assertUrl(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expected);
  }
}
