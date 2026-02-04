import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Subscription Page Object Model
 * For organization subscription management
 */
export class SubscriptionPage extends BasePage {
  // Current plan
  readonly currentPlanCard: Locator;
  readonly currentPlanName: Locator;
  readonly currentPlanPrice: Locator;
  readonly currentPlanStatus: Locator;
  readonly upgradeButton: Locator;
  readonly cancelButton: Locator;

  // Plan selection
  readonly planCards: Locator;
  readonly freePlanCard: Locator;
  readonly proPlanCard: Locator;
  readonly enterprisePlanCard: Locator;
  readonly selectPlanButton: Locator;

  // Billing
  readonly billingTab: Locator;
  readonly billingHistoryTable: Locator;
  readonly downloadInvoiceButton: Locator;
  readonly updatePaymentMethodButton: Locator;

  // Cancellation
  readonly cancelSubscriptionDialog: Locator;
  readonly cancelConfirmButton: Locator;
  readonly cancelReasonTextarea: Locator;

  constructor(page: Page) {
    super(page, '/dashboard/settings/subscription');

    // Current plan
    this.currentPlanCard = page.locator('[data-testid="current-plan-card"]');
    this.currentPlanName = page.locator('[data-testid="current-plan-name"]');
    this.currentPlanPrice = page.locator('[data-testid="current-plan-price"]');
    this.currentPlanStatus = page.locator('[data-testid="plan-status"]');
    this.upgradeButton = page.locator('button:has-text("Upgrade"), button:has-text("Change Plan")');
    this.cancelButton = page.locator('button:has-text("Cancel Subscription")');

    // Plans
    this.planCards = page.locator('[data-testid="plan-card"]');
    this.freePlanCard = page.locator('[data-testid="plan-card-free"]');
    this.proPlanCard = page.locator('[data-testid="plan-card-pro"]');
    this.enterprisePlanCard = page.locator('[data-testid="plan-card-enterprise"]');
    this.selectPlanButton = page.locator('button:has-text("Select Plan")');

    // Billing
    this.billingTab = page.locator('button:has-text("Billing"), a:has-text("Billing")');
    this.billingHistoryTable = page.locator('[data-testid="billing-history-table"]');
    this.downloadInvoiceButton = page.locator('button:has-text("Download")');
    this.updatePaymentMethodButton = page.locator('button:has-text("Update Payment Method")');

    // Cancellation
    this.cancelSubscriptionDialog = page.locator('[role="dialog"]:has-text("Cancel")');
    this.cancelConfirmButton = page.locator('button:has-text("Confirm Cancellation")');
    this.cancelReasonTextarea = page.locator('textarea[name="reason"]');
  }

  /**
   * Assert subscription page is loaded
   */
  async assertPageLoaded(): Promise<void> {
    await expect(this.currentPlanCard).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get current plan name
   */
  async getCurrentPlan(): Promise<string> {
    return (await this.currentPlanName.textContent()) || '';
  }

  /**
   * Get current plan status
   */
  async getCurrentStatus(): Promise<string> {
    return (await this.currentPlanStatus.textContent()) || '';
  }

  /**
   * Click upgrade button
   */
  async clickUpgrade(): Promise<void> {
    await this.upgradeButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select a plan
   */
  async selectPlan(planName: 'free' | 'pro' | 'enterprise'): Promise<void> {
    let planCard: Locator;

    switch (planName) {
      case 'free':
        planCard = this.freePlanCard;
        break;
      case 'pro':
        planCard = this.proPlanCard;
        break;
      case 'enterprise':
        planCard = this.enterprisePlanCard;
        break;
    }

    await planCard.scrollIntoViewIfNeeded();
    const selectBtn = planCard.locator('button:has-text("Select")').first();
    await selectBtn.click();
  }

  /**
   * Upgrade to plan and complete Stripe checkout
   */
  async upgradeToPlan(planName: 'pro' | 'enterprise'): Promise<void> {
    await this.clickUpgrade();
    await this.selectPlan(planName);

    // Should redirect to Stripe Checkout
    await this.page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });
  }

  /**
   * Navigate to billing tab
   */
  async goToBilling(): Promise<void> {
    await this.billingTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get billing history count
   */
  async getBillingHistoryCount(): Promise<number> {
    const rows = this.page.locator('[data-testid="billing-row"], tbody tr');
    return rows.count();
  }

  /**
   * Download invoice
   */
  async downloadInvoice(invoiceId: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${invoiceId}")`);
    const downloadBtn = row.locator('button:has-text("Download")').first();
    await downloadBtn.click();
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(reason?: string): Promise<void> {
    await this.cancelButton.click();

    // Wait for dialog
    await expect(this.cancelSubscriptionDialog).toBeVisible();

    // Fill reason if provided
    if (reason && (await this.cancelReasonTextarea.isVisible({ timeout: 2000 }))) {
      await this.cancelReasonTextarea.fill(reason);
    }

    // Confirm cancellation
    await this.cancelConfirmButton.click();
    await this.waitForSuccessToast();
  }

  /**
   * Assert plan is active
   */
  async assertPlanActive(planName: string): Promise<void> {
    await expect(this.currentPlanName).toContainText(planName, { ignoreCase: true });
    await expect(this.currentPlanStatus).toContainText('active', { ignoreCase: true });
  }

  /**
   * Assert plan is cancelled
   */
  async assertPlanCancelled(): Promise<void> {
    await expect(this.currentPlanStatus).toContainText(/cancel|ended/i);
  }
}

/**
 * Stripe Checkout Page Mock Helpers
 */
export class StripeCheckoutHelpers {
  constructor(private page: Page) {}

  /**
   * Check if on Stripe Checkout
   */
  async isOnCheckout(): Promise<boolean> {
    return this.page.url().includes('checkout.stripe.com');
  }

  /**
   * Wait for Stripe Checkout to load
   */
  async waitForCheckout(): Promise<void> {
    await this.page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });
  }

  /**
   * Fill Stripe checkout form (test mode)
   */
  async fillCheckoutForm(cardNumber: string = '4242424242424242'): Promise<void> {
    // Wait for Stripe form to load
    await this.page.waitForLoadState('networkidle');

    // Fill email
    const emailInput = this.page.locator('input[name="email"]');
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill('test@example.com');
    }

    // Fill card details
    const cardInput = this.page.locator('input[name="cardnumber"]');
    if (await cardInput.isVisible({ timeout: 5000 })) {
      await cardInput.fill(cardNumber);

      // Fill expiry
      await this.page.fill('input[name="exp-date"]', '12/30');

      // Fill CVC
      await this.page.fill('input[name="cvc"]', '123');

      // Fill postal code
      await this.page.fill('input[name="postal"]', '12345');
    }
  }

  /**
   * Submit Stripe checkout
   */
  async submitCheckout(): Promise<void> {
    const submitBtn = this.page.locator('button[type="submit"]:has-text("Pay"), button:has-text("Subscribe")');
    await submitBtn.click();

    // Wait for redirect back to app
    await this.page.waitForURL(/\/dashboard/, { timeout: 30000 });
  }
}
