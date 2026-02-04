/**
 * Subscription Email Notifications
 *
 * Email templates and sending functions for subscription lifecycle events.
 * Uses Resend for email delivery. Falls back to console logging if not configured.
 */

import { Resend } from 'resend';
import type { SubscriptionTier } from '@/lib/types/subscription';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@beerleaguehockey.ca';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// ============================================================================
// Email Sending Utility
// ============================================================================

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  // If Resend is not configured, log to console
  if (!resend) {
    console.log('[Email] Would send email:', {
      to: params.to,
      subject: params.subject,
      html: params.html.substring(0, 200) + '...',
    });
    return { success: true };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    console.log('[Email] Sent email to:', params.to);
    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Email Templates
// ============================================================================

function getEmailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Beer League Hockey</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .highlight {
      background-color: #f0f7ff;
      padding: 15px;
      border-left: 4px solid #0066cc;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Beer League Hockey</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Beer League Hockey. All rights reserved.</p>
      <p><a href="${SITE_URL}/settings/subscription">Manage Subscription</a> | <a href="${SITE_URL}/support">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// 1. Welcome Email (on subscription created)
// ============================================================================

export async function sendWelcomeEmail(params: {
  to: string;
  organizationName: string;
  tier: SubscriptionTier;
  trialEndsAt?: Date;
}): Promise<{ success: boolean; error?: string }> {
  const { to, organizationName, tier, trialEndsAt } = params;

  const content = `
    <h1>Welcome to Beer League Hockey!</h1>
    <p>Hi there,</p>
    <p>Thank you for subscribing to Beer League Hockey's <strong>${tier.charAt(0).toUpperCase() + tier.slice(1)} plan</strong> for your organization <strong>${organizationName}</strong>.</p>

    ${
      trialEndsAt
        ? `
    <div class="highlight">
      <p><strong>Your free trial</strong></p>
      <p>You're currently on a 14-day free trial that ends on <strong>${trialEndsAt.toLocaleDateString()}</strong>. You won't be charged until the trial ends.</p>
    </div>
    `
        : ''
    }

    <h2>What's next?</h2>
    <ul>
      <li>Create your first league</li>
      <li>Invite team members and administrators</li>
      <li>Explore advanced features and statistics</li>
      <li>Set up your organization's branding</li>
    </ul>

    <a href="${SITE_URL}/dashboard" class="button">Go to Dashboard</a>

    <p>If you have any questions, our support team is here to help!</p>
    <p>Best regards,<br>The Beer League Hockey Team</p>
  `;

  return sendEmail({
    to,
    subject: `Welcome to Beer League Hockey ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 2. Trial Ending Soon Email
// ============================================================================

export async function sendTrialEndingEmail(params: {
  to: string;
  organizationName: string;
  trialEndsAt: Date;
  daysRemaining: number;
}): Promise<{ success: boolean; error?: string }> {
  const { to, organizationName, trialEndsAt, daysRemaining } = params;

  const content = `
    <h1>Your Trial is Ending Soon</h1>
    <p>Hi there,</p>
    <p>Your free trial for <strong>${organizationName}</strong> will end in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong> on ${trialEndsAt.toLocaleDateString()}.</p>

    <div class="highlight">
      <p><strong>What happens next?</strong></p>
      <p>After your trial ends, you'll be charged for your subscription. You can cancel anytime before then to avoid being charged.</p>
    </div>

    <h2>Make sure your payment method is ready</h2>
    <p>To continue enjoying Beer League Hockey without interruption, please ensure you have a valid payment method on file.</p>

    <a href="${SITE_URL}/dashboard/settings/subscription" class="button">Manage Subscription</a>

    <p>Best regards,<br>The Beer League Hockey Team</p>
  `;

  return sendEmail({
    to,
    subject: `Your Beer League Hockey trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 3. Payment Success Email
// ============================================================================

export async function sendPaymentSuccessEmail(params: {
  to: string;
  organizationName: string;
  amount: number;
  invoiceUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, organizationName, amount, invoiceUrl } = params;

  const content = `
    <h1>Payment Received</h1>
    <p>Hi there,</p>
    <p>We've successfully processed your payment for <strong>${organizationName}</strong>.</p>

    <div class="highlight">
      <p><strong>Payment Details</strong></p>
      <p>Amount: <strong>$${(amount / 100).toFixed(2)}</strong></p>
      <p>Date: ${new Date().toLocaleDateString()}</p>
    </div>

    ${
      invoiceUrl
        ? `<a href="${invoiceUrl}" class="button">View Invoice</a>`
        : ''
    }

    <p>Thank you for being a valued Beer League Hockey customer!</p>
    <p>Best regards,<br>The Beer League Hockey Team</p>
  `;

  return sendEmail({
    to,
    subject: 'Payment Received - Beer League Hockey',
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 4. Payment Failed Email
// ============================================================================

export async function sendPaymentFailedEmail(params: {
  to: string;
  organizationName: string;
  amount: number;
  attemptCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const { to, organizationName, amount, attemptCount } = params;

  const content = `
    <h1>Payment Failed</h1>
    <p>Hi there,</p>
    <p>We were unable to process your payment for <strong>${organizationName}</strong>.</p>

    <div class="highlight">
      <p><strong>Payment Details</strong></p>
      <p>Amount: <strong>$${(amount / 100).toFixed(2)}</strong></p>
      <p>Attempt: ${attemptCount} of 3</p>
    </div>

    <h2>What you need to do</h2>
    <p>Please update your payment method to continue using Beer League Hockey without interruption. We'll automatically retry the payment in a few days.</p>

    ${
      attemptCount >= 3
        ? `<p style="color: #cc0000;"><strong>Important:</strong> This was our final payment attempt. Your subscription will be downgraded to the free tier if payment is not received soon.</p>`
        : ''
    }

    <a href="${SITE_URL}/dashboard/settings/subscription" class="button">Update Payment Method</a>

    <p>If you believe this is an error, please contact your bank or our support team.</p>
    <p>Best regards,<br>The Beer League Hockey Team</p>
  `;

  return sendEmail({
    to,
    subject: 'Payment Failed - Action Required',
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 5. Subscription Upgraded Email
// ============================================================================

export async function sendSubscriptionUpgradedEmail(params: {
  to: string;
  organizationName: string;
  fromTier: SubscriptionTier;
  toTier: SubscriptionTier;
}): Promise<{ success: boolean; error?: string }> {
  const { to, organizationName, fromTier, toTier } = params;

  const content = `
    <h1>Subscription Upgraded!</h1>
    <p>Hi there,</p>
    <p>You've successfully upgraded <strong>${organizationName}</strong> from the <strong>${fromTier.charAt(0).toUpperCase() + fromTier.slice(1)} plan</strong> to the <strong>${toTier.charAt(0).toUpperCase() + toTier.slice(1)} plan</strong>!</p>

    <h2>What's new?</h2>
    <p>You now have access to:</p>
    <ul>
      <li>Advanced statistics and analytics</li>
      <li>Custom branding options</li>
      <li>API access for integrations</li>
      <li>Priority support</li>
      ${toTier === 'enterprise' ? '<li>White-label options</li><li>Custom integrations</li>' : ''}
    </ul>

    <a href="${SITE_URL}/dashboard" class="button">Explore New Features</a>

    <p>Best regards,<br>The Beer League Hockey Team</p>
  `;

  return sendEmail({
    to,
    subject: 'Subscription Upgraded - Beer League Hockey',
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 6. Subscription Downgraded Email
// ============================================================================

export async function sendSubscriptionDowngradedEmail(params: {
  to: string;
  organizationName: string;
  fromTier: SubscriptionTier;
  toTier: SubscriptionTier;
  effectiveDate: Date;
}): Promise<{ success: boolean; error?: string }> {
  const { to, organizationName, fromTier, toTier, effectiveDate } = params;

  const content = `
    <h1>Subscription Downgrade Scheduled</h1>
    <p>Hi there,</p>
    <p>You've scheduled a downgrade for <strong>${organizationName}</strong> from the <strong>${fromTier.charAt(0).toUpperCase() + fromTier.slice(1)} plan</strong> to the <strong>${toTier.charAt(0).toUpperCase() + toTier.slice(1)} plan</strong>.</p>

    <div class="highlight">
      <p><strong>Effective Date:</strong> ${effectiveDate.toLocaleDateString()}</p>
      <p>You'll continue to have access to all your current features until then.</p>
    </div>

    <h2>What changes?</h2>
    <p>After the downgrade takes effect, some features will no longer be available:</p>
    <ul>
      <li>Advanced statistics</li>
      <li>Custom branding</li>
      <li>API access</li>
    </ul>

    <p><strong>Change your mind?</strong> You can cancel this downgrade anytime before ${effectiveDate.toLocaleDateString()}.</p>

    <a href="${SITE_URL}/dashboard/settings/subscription" class="button">Manage Subscription</a>

    <p>Best regards,<br>The Beer League Hockey Team</p>
  `;

  return sendEmail({
    to,
    subject: 'Subscription Downgrade Scheduled - Beer League Hockey',
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 7. Subscription Cancelled Email
// ============================================================================

export async function sendSubscriptionCancelledEmail(params: {
  to: string;
  organizationName: string;
  effectiveDate: Date;
  immediate: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { to, organizationName, effectiveDate, immediate } = params;

  const content = `
    <h1>Subscription ${immediate ? 'Cancelled' : 'Cancellation Scheduled'}</h1>
    <p>Hi there,</p>
    <p>We've received your request to cancel the subscription for <strong>${organizationName}</strong>.</p>

    <div class="highlight">
      ${
        immediate
          ? '<p>Your subscription has been cancelled immediately.</p>'
          : `<p><strong>Cancellation Date:</strong> ${effectiveDate.toLocaleDateString()}</p><p>You'll continue to have access to all features until then.</p>`
      }
    </div>

    <h2>We're sorry to see you go!</h2>
    <p>If you have a moment, we'd love to hear your feedback on how we can improve.</p>

    <p>Your organization's data will be preserved, and you can reactivate your subscription at any time.</p>

    ${
      !immediate
        ? `<p><strong>Changed your mind?</strong> You can reactivate your subscription anytime before ${effectiveDate.toLocaleDateString()}.</p>`
        : ''
    }

    <a href="${SITE_URL}/dashboard/settings/subscription" class="button">Manage Subscription</a>

    <p>Best regards,<br>The Beer League Hockey Team</p>
  `;

  return sendEmail({
    to,
    subject: 'Subscription Cancelled - Beer League Hockey',
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 8. Subscription Reactivated Email
// ============================================================================

export async function sendSubscriptionReactivatedEmail(params: {
  to: string;
  organizationName: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, organizationName } = params;

  const content = `
    <h1>Welcome Back!</h1>
    <p>Hi there,</p>
    <p>You've successfully reactivated your subscription for <strong>${organizationName}</strong>!</p>

    <div class="highlight">
      <p>Your subscription will continue as normal, and you'll retain access to all your features.</p>
    </div>

    <p>We're glad to have you back!</p>

    <a href="${SITE_URL}/dashboard" class="button">Go to Dashboard</a>

    <p>Best regards,<br>The Beer League Hockey Team</p>
  `;

  return sendEmail({
    to,
    subject: 'Subscription Reactivated - Beer League Hockey',
    html: getEmailLayout(content),
  });
}
