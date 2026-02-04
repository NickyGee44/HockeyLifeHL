/**
 * Password Reset Email Template
 *
 * Sent when a user requests a password reset
 */

import { getBaseEmailTemplate, createInfoBox } from './base';

export interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
  userAgent?: string;
  leagueName?: string;
}

export function getPasswordResetEmail(props: PasswordResetEmailProps): string {
  const {
    userName,
    resetUrl,
    expiresIn,
    ipAddress,
    userAgent,
    leagueName = 'Beer League Hockey',
  } = props;

  const greeting = userName ? `Hi ${userName},` : 'Hi there,';

  const content = `
    ${greeting}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>Password Reset Request</strong>
    </p>

    <p>
      We received a request to reset your password. If you made this request,
      click the button below to create a new password.
    </p>

    ${createInfoBox(`
      <strong>This link expires in ${expiresIn}</strong><br>
      For security reasons, this password reset link will only work for a limited time.
    `)}

    <p style="color: #a3a3a3; margin-top: 24px;">
      <strong>Didn't request this?</strong>
    </p>
    <p style="color: #a3a3a3;">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will remain unchanged.
    </p>

    ${ipAddress || userAgent ? `
    <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="color: #737373; font-size: 12px; margin: 0 0 8px 0;">
        <strong>Request Details</strong>
      </p>
      ${ipAddress ? `<p style="color: #525252; font-size: 12px; margin: 4px 0;">IP Address: ${ipAddress}</p>` : ''}
      ${userAgent ? `<p style="color: #525252; font-size: 12px; margin: 4px 0;">Device: ${userAgent}</p>` : ''}
    </div>
    ` : ''}

    <p style="color: #737373; font-size: 12px; margin-top: 24px;">
      If you're having trouble with the button above, copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: #22D3EE; word-break: break-all; font-size: 11px;">${resetUrl}</a>
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Reset Your Password',
    preheader: 'Password reset request - this link expires soon',
    content,
    buttonText: 'Reset Password',
    buttonUrl: resetUrl,
    footerNote: 'For security reasons, we do not include your password in emails.',
    leagueName,
  });
}
