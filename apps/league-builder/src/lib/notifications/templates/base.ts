/**
 * Base Email Template with BRAND-KIT Styling
 *
 * Uses gold (#D4AF37) and black (#0a0a0a) brand colors
 * Renders correctly on mobile with responsive design
 * Includes unsubscribe link for compliance
 */

export interface BaseEmailTemplateProps {
  title: string;
  preheader?: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
  unsubscribeUrl?: string;
  leagueName?: string;
  leagueLogo?: string;
  /** Physical postal address for CAN-SPAM/CASL compliance */
  postalAddress?: string;
}

// Default postal address for CAN-SPAM/CASL compliance
// This should be set via environment variable in production
const DEFAULT_POSTAL_ADDRESS = process.env.COMPANY_POSTAL_ADDRESS || 'HockeyLifeHL, Toronto, ON, Canada';

const BRAND_COLORS = {
  gold: '#D4AF37',
  goldLight: '#FFD54F',
  goldDark: '#9A7B00',
  black: '#0a0a0a',
  darkGray: '#1a1a1a',
  mediumGray: '#404040',
  lightGray: '#a3a3a3',
  white: '#fafafa',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
};

export function getBaseEmailTemplate({
  title,
  preheader,
  content,
  buttonText,
  buttonUrl,
  footerNote,
  unsubscribeUrl,
  leagueName = 'HockeyLifeHL',
  leagueLogo,
  postalAddress = DEFAULT_POSTAL_ADDRESS,
}: BaseEmailTemplateProps): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hockeylifehl.com';
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  ${preheader ? `<meta name="description" content="${preheader}">` : ''}
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }

    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: ${BRAND_COLORS.black};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${BRAND_COLORS.white};
    }

    /* Container */
    .email-wrapper {
      width: 100%;
      background-color: ${BRAND_COLORS.black};
      padding: 40px 20px;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${BRAND_COLORS.darkGray};
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(212, 175, 55, 0.2);
    }

    /* Header */
    .email-header {
      background: linear-gradient(135deg, ${BRAND_COLORS.gold} 0%, ${BRAND_COLORS.goldDark} 100%);
      padding: 32px 40px;
      text-align: center;
    }

    .email-logo {
      font-size: 28px;
      font-weight: 800;
      color: ${BRAND_COLORS.black};
      text-decoration: none;
      letter-spacing: -0.5px;
    }

    .email-title {
      margin: 16px 0 0 0;
      font-size: 24px;
      font-weight: 700;
      color: ${BRAND_COLORS.black};
      line-height: 1.3;
    }

    /* Content */
    .email-content {
      padding: 40px;
      color: ${BRAND_COLORS.white};
    }

    .email-content h1, .email-content h2, .email-content h3 {
      color: ${BRAND_COLORS.white};
      margin: 0 0 16px 0;
    }

    .email-content p {
      margin: 0 0 16px 0;
      color: ${BRAND_COLORS.lightGray};
    }

    .email-content a {
      color: ${BRAND_COLORS.gold};
      text-decoration: none;
    }

    .email-content a:hover {
      text-decoration: underline;
    }

    /* Info Box */
    .info-box {
      background-color: rgba(212, 175, 55, 0.1);
      border-left: 4px solid ${BRAND_COLORS.gold};
      border-radius: 0 8px 8px 0;
      padding: 20px;
      margin: 24px 0;
    }

    .info-box p {
      margin: 0;
      color: ${BRAND_COLORS.white};
    }

    .info-box strong {
      color: ${BRAND_COLORS.gold};
    }

    /* Details List */
    .details-list {
      background-color: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }

    .details-list table {
      width: 100%;
      border-collapse: collapse;
    }

    .details-list td {
      padding: 8px 0;
      vertical-align: top;
    }

    .details-list .label {
      color: ${BRAND_COLORS.lightGray};
      font-size: 14px;
      width: 120px;
    }

    .details-list .value {
      color: ${BRAND_COLORS.white};
      font-weight: 500;
    }

    /* Button */
    .button-container {
      text-align: center;
      margin: 32px 0;
    }

    .button {
      display: inline-block;
      background: linear-gradient(135deg, ${BRAND_COLORS.gold} 0%, ${BRAND_COLORS.goldDark} 100%);
      color: ${BRAND_COLORS.black} !important;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .button:hover {
      box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
    }

    /* Footer */
    .email-footer {
      background-color: ${BRAND_COLORS.black};
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid rgba(212, 175, 55, 0.2);
    }

    .footer-note {
      font-size: 14px;
      color: ${BRAND_COLORS.lightGray};
      margin: 0 0 16px 0;
    }

    .footer-links {
      margin: 0 0 16px 0;
    }

    .footer-links a {
      color: ${BRAND_COLORS.lightGray};
      text-decoration: none;
      margin: 0 12px;
      font-size: 13px;
    }

    .footer-links a:hover {
      color: ${BRAND_COLORS.gold};
    }

    .footer-copyright {
      font-size: 12px;
      color: ${BRAND_COLORS.mediumGray};
      margin: 0;
    }

    .unsubscribe {
      font-size: 12px;
      color: ${BRAND_COLORS.mediumGray};
      margin: 16px 0 0 0;
    }

    .unsubscribe a {
      color: ${BRAND_COLORS.mediumGray};
      text-decoration: underline;
    }

    /* Status badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-success {
      background-color: rgba(34, 197, 94, 0.2);
      color: ${BRAND_COLORS.success};
    }

    .badge-warning {
      background-color: rgba(234, 179, 8, 0.2);
      color: ${BRAND_COLORS.warning};
    }

    .badge-error {
      background-color: rgba(239, 68, 68, 0.2);
      color: ${BRAND_COLORS.error};
    }

    .badge-gold {
      background-color: rgba(212, 175, 55, 0.2);
      color: ${BRAND_COLORS.gold};
    }

    /* Mobile responsive */
    @media screen and (max-width: 600px) {
      .email-wrapper {
        padding: 20px 10px !important;
      }

      .email-header {
        padding: 24px 20px !important;
      }

      .email-content {
        padding: 24px 20px !important;
      }

      .email-footer {
        padding: 24px 20px !important;
      }

      .email-title {
        font-size: 20px !important;
      }

      .button {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
      }

      .details-list .label {
        display: block !important;
        width: 100% !important;
        margin-bottom: 4px;
      }

      .details-list .value {
        display: block !important;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: ${BRAND_COLORS.black} !important;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  ` : ''}

  <div class="email-wrapper">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="email-container">
            <!-- Header -->
            <div class="email-header">
              ${leagueLogo
                ? `<img src="${leagueLogo}" alt="${leagueName}" height="48" style="height: 48px; width: auto;">`
                : `<a href="${siteUrl}" class="email-logo">${leagueName}</a>`
              }
              <h1 class="email-title">${title}</h1>
            </div>

            <!-- Content -->
            <div class="email-content">
              ${content}

              ${buttonText && buttonUrl ? `
              <div class="button-container">
                <a href="${buttonUrl}" class="button">${buttonText}</a>
              </div>
              ` : ''}

              ${footerNote ? `
              <p style="font-size: 14px; color: ${BRAND_COLORS.mediumGray}; margin-top: 24px;">
                ${footerNote}
              </p>
              ` : ''}
            </div>

            <!-- Footer -->
            <div class="email-footer">
              <p class="footer-note">
                This is an automated notification from ${leagueName}.
              </p>
              <div class="footer-links">
                <a href="${siteUrl}/dashboard">Dashboard</a>
                <a href="${siteUrl}/settings/notifications">Notification Settings</a>
                <a href="${siteUrl}/support">Help</a>
              </div>
              <p class="footer-copyright">
                &copy; ${year} ${leagueName}. All rights reserved.
              </p>
              <p style="font-size: 11px; color: ${BRAND_COLORS.mediumGray}; margin: 8px 0 0 0;">
                ${postalAddress}
              </p>
              ${unsubscribeUrl ? `
              <p class="unsubscribe">
                <a href="${unsubscribeUrl}">Unsubscribe</a> from these notifications
              </p>
              ` : ''}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Create an info box for highlighting important information
 */
export function createInfoBox(content: string): string {
  return `<div class="info-box">${content}</div>`;
}

/**
 * Create a details list for key-value pairs
 */
export function createDetailsList(details: Array<{ label: string; value: string }>): string {
  const rows = details
    .map(({ label, value }) => `
      <tr>
        <td class="label">${label}</td>
        <td class="value">${value}</td>
      </tr>
    `)
    .join('');

  return `
    <div class="details-list">
      <table>
        ${rows}
      </table>
    </div>
  `;
}

/**
 * Create a status badge
 */
export function createBadge(text: string, type: 'success' | 'warning' | 'error' | 'gold' = 'gold'): string {
  return `<span class="badge badge-${type}">${text}</span>`;
}
