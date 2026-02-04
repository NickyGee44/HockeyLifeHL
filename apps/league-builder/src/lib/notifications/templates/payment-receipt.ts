/**
 * Payment Receipt Email Template
 *
 * Sent when a fee payment is confirmed
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface PaymentReceiptEmailProps {
  playerName: string;
  amount: number;
  description: string;
  transactionId: string;
  paymentDate: string;
  paymentMethod?: string;
  seasonName?: string;
  invoiceUrl?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
  leagueName?: string;
}

export function getPaymentReceiptEmail(props: PaymentReceiptEmailProps): string {
  const {
    playerName,
    amount,
    description,
    transactionId,
    paymentDate,
    paymentMethod,
    seasonName,
    invoiceUrl,
    dashboardUrl,
    unsubscribeUrl,
    leagueName = 'Beer League Hockey',
  } = props;

  const formattedAmount = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);

  const details = [
    { label: 'Amount', value: `<strong style="color: #22c55e;">${formattedAmount}</strong>` },
    { label: 'Description', value: description },
    { label: 'Date', value: paymentDate },
    { label: 'Transaction ID', value: `<code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${transactionId}</code>` },
  ];

  if (paymentMethod) {
    details.push({ label: 'Payment Method', value: paymentMethod });
  }

  if (seasonName) {
    details.push({ label: 'Season', value: seasonName });
  }

  const content = `
    <p>Hi ${playerName},</p>

    ${createBadge('Payment Confirmed', 'success')}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>Thank you for your payment!</strong>
    </p>

    <p>
      We've successfully processed your payment of ${formattedAmount}.
      This email serves as your receipt.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(`
      <strong>Keep this receipt</strong><br>
      Save this email for your records. You may need it for reimbursement or tax purposes.
    `)}

    ${invoiceUrl ? `
    <p style="text-align: center; margin-top: 24px;">
      <a href="${invoiceUrl}" style="color: #22D3EE; text-decoration: none;">
        Download PDF Invoice &rarr;
      </a>
    </p>
    ` : ''}

    <p style="color: #a3a3a3;">
      Questions about your payment? Contact your league administrator or reply to this email.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Payment Receipt',
    preheader: `Payment of ${formattedAmount} confirmed - Transaction ${transactionId}`,
    content,
    buttonText: 'View Payment History',
    buttonUrl: dashboardUrl,
    footerNote: 'This is an automated receipt. Please keep it for your records.',
    unsubscribeUrl,
    leagueName,
  });
}
