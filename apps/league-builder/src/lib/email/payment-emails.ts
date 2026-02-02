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

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@hockeylifehl.com';
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
    console.log('[Payment Email] Would send email:', {
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

    console.log('[Payment Email] Sent email to:', params.to);
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
  <title>HockeyLifeHL</title>
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
      background-color: #d4af37;
      color: #000000;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-weight: bold;
      margin: 20px 0;
    }
    .button-secondary {
      background-color: #333;
      color: #ffffff;
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
      background-color: #fff8e6;
      padding: 15px;
      border-left: 4px solid #d4af37;
      margin: 20px 0;
    }
    .warning {
      background-color: #fff3f3;
      padding: 15px;
      border-left: 4px solid #cc0000;
      margin: 20px 0;
    }
    .success {
      background-color: #f0fff0;
      padding: 15px;
      border-left: 4px solid #00cc00;
      margin: 20px 0;
    }
    .payment-details {
      background-color: #f9f9f9;
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
      color: #666;
    }
    .payment-details .value {
      text-align: right;
      font-weight: bold;
    }
    .amount-due {
      font-size: 24px;
      color: #d4af37;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">HockeyLifeHL</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HockeyLifeHL. All rights reserved.</p>
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
          <td class="value" style="color: #cc0000;">+$${(lateFeeApplied / 100).toFixed(2)}</td>
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
