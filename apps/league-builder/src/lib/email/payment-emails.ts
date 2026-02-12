/**
 * Player Payment Email Notifications
 *
 * Email templates and sending functions for player fee collection.
 * Uses Resend for email delivery. Falls back to console logging if not configured.
 */

import { Resend } from 'resend';

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
    console.info('[email:payment] Would send email:', {
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

    console.info('[email:payment] Sent email to:', params.to);
    return { success: true };
  } catch (error) {
    console.error('[Payment Email] Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Email Template Layout
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
      color: #a3a3a3;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #070A0F;
    }
    .container {
      background-color: #0f172a;
      border-radius: 8px;
      padding: 40px;
      border: 1px solid rgba(255, 255, 255, 0.10);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1e293b;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #fafafa;
    }
    .content {
      margin-bottom: 30px;
    }
    .content h1 {
      color: #fafafa;
    }
    .button {
      display: inline-block;
      background: linear-gradient(to right, #22D3EE, #3B82F6);
      color: #070A0F;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-weight: bold;
      margin: 20px 0;
    }
    .button-secondary {
      background-color: #1e293b;
      color: #fafafa;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 12px;
      color: #404040;
    }
    .footer a {
      color: #22D3EE;
    }
    .highlight {
      background-color: rgba(34, 211, 238, 0.1);
      padding: 15px;
      border-left: 4px solid #22D3EE;
      margin: 20px 0;
    }
    .warning {
      background-color: rgba(251, 113, 133, 0.1);
      padding: 15px;
      border-left: 4px solid #FB7185;
      margin: 20px 0;
    }
    .success {
      background-color: rgba(52, 211, 153, 0.1);
      padding: 15px;
      border-left: 4px solid #34D399;
      margin: 20px 0;
    }
    .payment-details {
      background-color: rgba(0, 0, 0, 0.3);
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .payment-details table {
      width: 100%;
      border-collapse: collapse;
    }
    .payment-details td {
      padding: 8px 0;
    }
    .payment-details .label {
      color: #a3a3a3;
    }
    .payment-details .value {
      text-align: right;
      font-weight: bold;
      color: #fafafa;
    }
    .amount-due {
      font-size: 24px;
      color: #22D3EE;
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
      <p><a href="${SITE_URL}/support">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// 1. Payment Confirmation Email
// ============================================================================

export async function sendPaymentConfirmationEmail(params: {
  to: string;
  playerName: string;
  leagueName: string;
  feeName: string;
  amountPaid: number;
  remainingBalance: number;
  installmentNumber: number;
  totalInstallments: number;
  paymentUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    playerName,
    leagueName,
    feeName,
    amountPaid,
    remainingBalance,
    installmentNumber,
    totalInstallments,
    paymentUrl,
  } = params;

  const isFullyPaid = remainingBalance <= 0;

  const content = `
    <h1>Payment Received!</h1>
    <p>Hi ${playerName},</p>
    <p>Thank you for your payment to <strong>${leagueName}</strong>.</p>

    <div class="payment-details">
      <table>
        <tr>
          <td class="label">Fee</td>
          <td class="value">${feeName}</td>
        </tr>
        <tr>
          <td class="label">Amount Paid</td>
          <td class="value">$${(amountPaid / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Payment</td>
          <td class="value">${installmentNumber} of ${totalInstallments}</td>
        </tr>
        ${
          !isFullyPaid
            ? `
        <tr>
          <td class="label">Remaining Balance</td>
          <td class="value amount-due">$${(remainingBalance / 100).toFixed(2)}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    ${
      isFullyPaid
        ? `
    <div class="success">
      <p><strong>Congratulations!</strong> Your fees are now paid in full. Thank you!</p>
    </div>
    `
        : `
    <p>You have <strong>${totalInstallments - installmentNumber} payment(s) remaining</strong>.</p>
    ${paymentUrl ? `<a href="${paymentUrl}" class="button">Make Next Payment</a>` : ''}
    `
    }

    <p>Best regards,<br>The ${leagueName} Team</p>
  `;

  return sendEmail({
    to,
    subject: `Payment Received - ${feeName}`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 2. Payment Reminder Email
// ============================================================================

export async function sendPaymentReminderEmail(params: {
  to: string;
  playerName: string;
  leagueName: string;
  feeName: string;
  amountDue: number;
  dueDate: string | null;
  paymentUrl: string;
  reminderNumber: number;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    playerName,
    leagueName,
    feeName,
    amountDue,
    dueDate,
    paymentUrl,
    reminderNumber,
  } = params;

  const isUrgent = reminderNumber >= 3;

  const content = `
    <h1>Payment Reminder${isUrgent ? ' - Action Required' : ''}</h1>
    <p>Hi ${playerName},</p>
    <p>This is a friendly reminder that you have an outstanding payment for <strong>${leagueName}</strong>.</p>

    <div class="payment-details">
      <table>
        <tr>
          <td class="label">Fee</td>
          <td class="value">${feeName}</td>
        </tr>
        <tr>
          <td class="label">Amount Due</td>
          <td class="value amount-due">$${(amountDue / 100).toFixed(2)}</td>
        </tr>
        ${
          dueDate
            ? `
        <tr>
          <td class="label">Due Date</td>
          <td class="value">${new Date(dueDate).toLocaleDateString()}</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    ${
      isUrgent
        ? `
    <div class="warning">
      <p><strong>Important:</strong> This is your ${reminderNumber}${reminderNumber === 2 ? 'nd' : reminderNumber === 3 ? 'rd' : 'th'} reminder. Please complete your payment as soon as possible to avoid any issues with your league participation.</p>
    </div>
    `
        : `
    <div class="highlight">
      <p>Please complete your payment at your earliest convenience to ensure uninterrupted participation.</p>
    </div>
    `
    }

    <a href="${paymentUrl}" class="button">Pay Now</a>

    <p>If you've already made this payment, please disregard this reminder.</p>
    <p>Questions? Contact your league administrator.</p>

    <p>Best regards,<br>The ${leagueName} Team</p>
  `;

  return sendEmail({
    to,
    subject: `${isUrgent ? '[Urgent] ' : ''}Payment Reminder - ${feeName}`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 3. Payment Overdue Email
// ============================================================================

export async function sendPaymentOverdueEmail(params: {
  to: string;
  playerName: string;
  leagueName: string;
  feeName: string;
  amountDue: number;
  daysOverdue: number;
  lateFeeApplied: number;
  paymentUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    playerName,
    leagueName,
    feeName,
    amountDue,
    daysOverdue,
    lateFeeApplied,
    paymentUrl,
  } = params;

  const content = `
    <h1>Payment Overdue</h1>
    <p>Hi ${playerName},</p>
    <p>Your payment for <strong>${leagueName}</strong> is now <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</strong>.</p>

    <div class="payment-details">
      <table>
        <tr>
          <td class="label">Fee</td>
          <td class="value">${feeName}</td>
        </tr>
        <tr>
          <td class="label">Original Amount</td>
          <td class="value">$${((amountDue - lateFeeApplied) / 100).toFixed(2)}</td>
        </tr>
        ${
          lateFeeApplied > 0
            ? `
        <tr>
          <td class="label">Late Fee</td>
          <td class="value" style="color: #FB7185;">+$${(lateFeeApplied / 100).toFixed(2)}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td class="label"><strong>Total Due</strong></td>
          <td class="value amount-due">$${(amountDue / 100).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="warning">
      <p><strong>Important:</strong> Please settle your outstanding balance immediately to avoid further late fees and potential restrictions on your league participation.</p>
    </div>

    <a href="${paymentUrl}" class="button">Pay Now</a>

    <p>If you're experiencing difficulties making this payment, please contact your league administrator to discuss payment options.</p>

    <p>Best regards,<br>The ${leagueName} Team</p>
  `;

  return sendEmail({
    to,
    subject: `[OVERDUE] Payment Required - ${feeName}`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 4. Refund Processed Email
// ============================================================================

export async function sendRefundProcessedEmail(params: {
  to: string;
  playerName: string;
  leagueName: string;
  feeName: string;
  refundAmount: number;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, playerName, leagueName, feeName, refundAmount, reason } = params;

  const content = `
    <h1>Refund Processed</h1>
    <p>Hi ${playerName},</p>
    <p>A refund has been processed for your payment to <strong>${leagueName}</strong>.</p>

    <div class="payment-details">
      <table>
        <tr>
          <td class="label">Fee</td>
          <td class="value">${feeName}</td>
        </tr>
        <tr>
          <td class="label">Refund Amount</td>
          <td class="value">$${(refundAmount / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Reason</td>
          <td class="value">${reason}</td>
        </tr>
      </table>
    </div>

    <div class="highlight">
      <p>The refund will be credited to your original payment method within 5-10 business days, depending on your bank.</p>
    </div>

    <p>If you have any questions about this refund, please contact your league administrator.</p>

    <p>Best regards,<br>The ${leagueName} Team</p>
  `;

  return sendEmail({
    to,
    subject: `Refund Processed - ${feeName}`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 5. Upcoming Payment Reminder Email
// ============================================================================

export async function sendUpcomingPaymentEmail(params: {
  to: string;
  playerName: string;
  leagueName: string;
  feeName: string;
  amountDue: number;
  dueDate: string;
  daysUntilDue: number;
  paymentUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    playerName,
    leagueName,
    feeName,
    amountDue,
    dueDate,
    daysUntilDue,
    paymentUrl,
  } = params;

  const content = `
    <h1>Upcoming Payment</h1>
    <p>Hi ${playerName},</p>
    <p>This is a reminder that your next payment for <strong>${leagueName}</strong> is due in <strong>${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</strong>.</p>

    <div class="payment-details">
      <table>
        <tr>
          <td class="label">Fee</td>
          <td class="value">${feeName}</td>
        </tr>
        <tr>
          <td class="label">Amount Due</td>
          <td class="value amount-due">$${(amountDue / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Due Date</td>
          <td class="value">${new Date(dueDate).toLocaleDateString()}</td>
        </tr>
      </table>
    </div>

    <div class="highlight">
      <p>Complete your payment before the due date to avoid any late fees.</p>
    </div>

    <a href="${paymentUrl}" class="button">Pay Now</a>

    <p>Best regards,<br>The ${leagueName} Team</p>
  `;

  return sendEmail({
    to,
    subject: `Payment Due Soon - ${feeName}`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 6. Chargeback Alert Email (Admin Notification)
// ============================================================================

export async function sendChargebackAlertEmail(params: {
  to: string;
  adminName: string;
  leagueName: string;
  playerName: string;
  playerEmail: string;
  feeName: string;
  disputeAmount: number;
  disputeReason: string;
  evidenceDueBy: string | null;
  disputeId: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    adminName,
    leagueName,
    playerName,
    playerEmail,
    feeName,
    disputeAmount,
    disputeReason,
    evidenceDueBy,
    disputeId,
    dashboardUrl,
  } = params;

  const formatDisputeReason = (reason: string): string => {
    const reasonMap: Record<string, string> = {
      duplicate: 'Duplicate charge',
      fraudulent: 'Fraudulent transaction',
      subscription_canceled: 'Subscription was canceled',
      product_unacceptable: 'Product/service unacceptable',
      product_not_received: 'Product/service not received',
      unrecognized: 'Unrecognized charge',
      credit_not_processed: 'Credit not processed',
      general: 'General dispute',
    };
    return reasonMap[reason] || reason;
  };

  const evidenceDate = evidenceDueBy
    ? new Date(evidenceDueBy).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not specified';

  const daysUntilDue = evidenceDueBy
    ? Math.ceil((new Date(evidenceDueBy).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const content = `
    <h1 style="color: #FB7185;">Chargeback Alert</h1>
    <p>Hi ${adminName},</p>
    <p>A chargeback has been filed against a payment in <strong>${leagueName}</strong>. Immediate action may be required.</p>

    <div class="warning">
      <p><strong>Important:</strong> You may need to submit evidence to dispute this chargeback. ${
        daysUntilDue !== null && daysUntilDue > 0
          ? `You have <strong>${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</strong> to respond.`
          : 'Check your Stripe dashboard for the deadline.'
      }</p>
    </div>

    <div class="payment-details">
      <table>
        <tr>
          <td class="label">Dispute Amount</td>
          <td class="value" style="color: #FB7185; font-size: 20px;">$${(disputeAmount / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Reason</td>
          <td class="value">${formatDisputeReason(disputeReason)}</td>
        </tr>
        <tr>
          <td class="label">Evidence Due By</td>
          <td class="value">${evidenceDate}</td>
        </tr>
        <tr>
          <td class="label">Fee</td>
          <td class="value">${feeName}</td>
        </tr>
        <tr>
          <td class="label">Player</td>
          <td class="value">${playerName}</td>
        </tr>
        <tr>
          <td class="label">Player Email</td>
          <td class="value">${playerEmail}</td>
        </tr>
        <tr>
          <td class="label">Dispute ID</td>
          <td class="value" style="font-family: monospace; font-size: 12px;">${disputeId}</td>
        </tr>
      </table>
    </div>

    <h2>Recommended Actions</h2>
    <ol style="color: #a3a3a3;">
      <li><strong>Review the dispute</strong> in your Stripe dashboard</li>
      <li><strong>Gather evidence</strong> - registration confirmation, communication with player, proof of service</li>
      <li><strong>Submit evidence</strong> before the deadline to contest the chargeback</li>
      <li><strong>Contact the player</strong> if appropriate to resolve the issue directly</li>
    </ol>

    <a href="${dashboardUrl}" class="button">View in Dashboard</a>
    <a href="https://dashboard.stripe.com/disputes/${disputeId}" class="button button-secondary" style="margin-left: 10px;">View in Stripe</a>

    <div class="highlight" style="margin-top: 30px;">
      <p><strong>What happens next?</strong></p>
      <p>If you don't respond, the chargeback will automatically be ruled in the customer's favor, and the disputed amount plus a chargeback fee will be deducted from your account.</p>
    </div>

    <p>Best regards,<br>The HockeyLife Team</p>
  `;

  return sendEmail({
    to,
    subject: `[ACTION REQUIRED] Chargeback Filed - ${leagueName} ($${(disputeAmount / 100).toFixed(2)})`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 7. Chargeback Resolution Email (Admin Notification)
// ============================================================================

export async function sendChargebackResolutionEmail(params: {
  to: string;
  adminName: string;
  leagueName: string;
  playerName: string;
  disputeAmount: number;
  outcome: 'won' | 'lost';
  disputeId: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    adminName,
    leagueName,
    playerName,
    disputeAmount,
    outcome,
    disputeId,
  } = params;

  const isWon = outcome === 'won';

  const content = `
    <h1>${isWon ? 'Chargeback Won' : 'Chargeback Lost'}</h1>
    <p>Hi ${adminName},</p>
    <p>The chargeback dispute for <strong>${leagueName}</strong> has been resolved.</p>

    ${
      isWon
        ? `
    <div class="success">
      <p><strong>Good news!</strong> You won this dispute. The funds have been returned to your account.</p>
    </div>
    `
        : `
    <div class="warning">
      <p><strong>Unfortunately,</strong> this dispute was ruled in the customer's favor. The disputed amount and chargeback fee have been deducted from your account.</p>
    </div>
    `
    }

    <div class="payment-details">
      <table>
        <tr>
          <td class="label">Dispute Amount</td>
          <td class="value">$${(disputeAmount / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Outcome</td>
          <td class="value" style="color: ${isWon ? '#34D399' : '#FB7185'};">${isWon ? 'Won' : 'Lost'}</td>
        </tr>
        <tr>
          <td class="label">Player</td>
          <td class="value">${playerName}</td>
        </tr>
        <tr>
          <td class="label">Dispute ID</td>
          <td class="value" style="font-family: monospace; font-size: 12px;">${disputeId}</td>
        </tr>
      </table>
    </div>

    ${
      !isWon
        ? `
    <h2>Preventing Future Chargebacks</h2>
    <ul style="color: #a3a3a3;">
      <li>Ensure clear communication about fees and policies during registration</li>
      <li>Send payment confirmations promptly</li>
      <li>Respond quickly to player inquiries about charges</li>
      <li>Keep records of all player communications</li>
    </ul>
    `
        : ''
    }

    <p>Best regards,<br>The HockeyLife Team</p>
  `;

  return sendEmail({
    to,
    subject: `Chargeback ${isWon ? 'Won' : 'Lost'} - ${leagueName} ($${(disputeAmount / 100).toFixed(2)})`,
    html: getEmailLayout(content),
  });
}

// ============================================================================
// 8. Payout Failure Alert Email (Admin Notification)
// ============================================================================

export async function sendPayoutFailureAlertEmail(params: {
  to: string;
  adminName: string;
  leagueName: string;
  payoutAmount: number;
  currency: string;
  failureCode: string | null;
  failureMessage: string | null;
  payoutId: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    adminName,
    leagueName,
    payoutAmount,
    currency,
    failureCode,
    failureMessage,
    payoutId,
  } = params;

  const formatFailureCode = (code: string | null): string => {
    if (!code) return 'Unknown';
    const codeMap: Record<string, string> = {
      account_closed: 'Bank account closed',
      account_frozen: 'Bank account frozen',
      bank_account_restricted: 'Bank account restricted',
      bank_ownership_changed: 'Bank ownership changed',
      could_not_process: 'Could not process',
      debit_not_authorized: 'Debit not authorized',
      declined: 'Declined by bank',
      insufficient_funds: 'Insufficient funds',
      invalid_account_number: 'Invalid account number',
      incorrect_account_holder_name: 'Incorrect account holder name',
      invalid_currency: 'Invalid currency',
      no_account: 'No account found',
      unsupported_card: 'Unsupported card',
    };
    return codeMap[code] || code;
  };

  const currencySymbol = currency.toUpperCase() === 'CAD' ? 'CA$' : '$';

  const content = `
    <h1 style="color: #FB7185;">Payout Failed</h1>
    <p>Hi ${adminName},</p>
    <p>A payout to your bank account for <strong>${leagueName}</strong> has failed. Please review the details below and take action.</p>

    <div class="warning">
      <p><strong>Important:</strong> Your funds are safe and still in your Stripe account. However, you may need to update your bank information to receive future payouts.</p>
    </div>

    <div class="payment-details">
      <table>
        <tr>
          <td class="label">Payout Amount</td>
          <td class="value" style="color: #FB7185; font-size: 20px;">${currencySymbol}${(payoutAmount / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td class="label">Failure Reason</td>
          <td class="value">${formatFailureCode(failureCode)}</td>
        </tr>
        ${failureMessage ? `
        <tr>
          <td class="label">Details</td>
          <td class="value">${failureMessage}</td>
        </tr>
        ` : ''}
        <tr>
          <td class="label">Payout ID</td>
          <td class="value" style="font-family: monospace; font-size: 12px;">${payoutId}</td>
        </tr>
      </table>
    </div>

    <h2>Recommended Actions</h2>
    <ol style="color: #a3a3a3;">
      <li><strong>Check your bank details</strong> in the Stripe dashboard — ensure account number and routing number are correct</li>
      <li><strong>Contact your bank</strong> to ensure the account can receive deposits</li>
      <li><strong>Update bank information</strong> if needed via your Stripe Express dashboard</li>
      <li><strong>Contact support</strong> if the issue persists</li>
    </ol>

    <a href="https://dashboard.stripe.com/payouts/${payoutId}" class="button">View in Stripe</a>

    <div class="highlight" style="margin-top: 30px;">
      <p><strong>What happens next?</strong></p>
      <p>Stripe will automatically retry the payout. If it continues to fail, you will need to update your bank account information in your Stripe Express dashboard.</p>
    </div>

    <p>Best regards,<br>The HockeyLife Team</p>
  `;

  return sendEmail({
    to,
    subject: `[ACTION REQUIRED] Payout Failed - ${leagueName} (${currencySymbol}${(payoutAmount / 100).toFixed(2)})`,
    html: getEmailLayout(content),
  });
}
