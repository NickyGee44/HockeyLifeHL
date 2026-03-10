/**
 * Base Email Template with BRAND-KIT Styling
 *
 * Uses cyan (#22D3EE) and Ice Black (#070A0F) brand colors
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
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  /** Physical postal address for CAN-SPAM/CASL compliance */
  postalAddress?: string;
}

// Default postal address for CAN-SPAM/CASL compliance
// This should be set via environment variable in production
const DEFAULT_POSTAL_ADDRESS = process.env.COMPANY_POSTAL_ADDRESS || 'Beer League Hockey, Toronto, ON, Canada';

const BRAND_COLORS = {
  gold: '#22D3EE',
  goldLight: '#3B82F6',
  goldDark: '#0891b2',
  black: '#070A0F',
  darkGray: '#0f172a',
  mediumGray: '#404040',
  lightGray: '#a3a3a3',
  white: '#fafafa',
  success: '#34D399',
  warning: '#F59E0B',
  error: '#FB7185',
};

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export function getBaseEmailTemplate({
  title,
  preheader,
  content,
  buttonText,
  buttonUrl,
  footerNote,
  unsubscribeUrl,
  leagueName = 'Beer League Hockey',
  leagueLogo,
  primaryColor,
  secondaryColor,
  accentColor,
  postalAddress = DEFAULT_POSTAL_ADDRESS,
}: BaseEmailTemplateProps): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';
  const year = new Date().getFullYear();
  const theme = getEmailBrandTheme({
    primaryColor,
    secondaryColor,
    accentColor,
  });

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
      background-color: ${theme.pageBackgroundColor};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${theme.contentTextColor};
    }

    /* Container */
    .email-wrapper {
      width: 100%;
      background-color: ${theme.pageBackgroundColor};
      padding: 40px 20px;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${theme.containerBackgroundColor};
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid ${theme.containerBorderColor};
    }

    /* Header */
    .email-header {
      background-color: ${theme.headerStartColor};
      background-image: linear-gradient(to right, ${theme.headerStartColor}, ${theme.headerEndColor});
      padding: 32px 40px;
      text-align: center;
    }

    .email-logo {
      font-size: 28px;
      font-weight: 800;
      color: ${theme.headerTextColor};
      text-decoration: none;
      letter-spacing: -0.5px;
    }

    .email-logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 10px 30px rgba(7, 10, 15, 0.16);
    }

    .email-title {
      margin: 16px 0 0 0;
      font-size: 24px;
      font-weight: 700;
      color: ${theme.headerTextColor};
      line-height: 1.3;
    }

    /* Content */
    .email-content {
      padding: 40px;
      color: ${theme.contentTextColor};
    }

    .email-content h1, .email-content h2, .email-content h3 {
      color: ${theme.contentTextColor};
      margin: 0 0 16px 0;
    }

    .email-content p {
      margin: 0 0 16px 0;
      color: ${theme.contentMutedColor};
    }

    .email-content a {
      color: ${theme.linkColor};
      text-decoration: none;
    }

    .email-content a:hover {
      text-decoration: underline;
    }

    /* Info Box */
    .info-box {
      background-color: ${theme.infoBoxBackgroundColor};
      border-left: 4px solid ${theme.infoBoxBorderColor};
      border-radius: 0 8px 8px 0;
      padding: 20px;
      margin: 24px 0;
    }

    .info-box p {
      margin: 0;
      color: ${theme.contentTextColor};
    }

    .info-box strong {
      color: ${theme.linkColor};
    }

    /* Details List */
    .details-list {
      background-color: ${theme.detailsBackgroundColor};
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
      color: ${theme.contentMutedColor};
      font-size: 14px;
      width: 120px;
    }

    .details-list .value {
      color: ${theme.contentTextColor};
      font-weight: 500;
    }

    /* Button */
    .button-container {
      text-align: center;
      margin: 32px 0;
    }

    .button {
      display: inline-block;
      background-color: ${theme.buttonStartColor};
      background-image: linear-gradient(to right, ${theme.buttonStartColor}, ${theme.buttonEndColor});
      color: ${theme.buttonTextColor} !important;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .button:hover {
      box-shadow: 0 0 20px ${theme.buttonGlowColor};
    }

    /* Footer */
    .email-footer {
      background-color: ${theme.footerBackgroundColor};
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid ${theme.footerBorderColor};
    }

    .footer-note {
      font-size: 14px;
      color: ${theme.contentMutedColor};
      margin: 0 0 16px 0;
    }

    .footer-links {
      margin: 0 0 16px 0;
    }

    .footer-links a {
      color: ${theme.footerLinkColor};
      text-decoration: none;
      margin: 0 12px;
      font-size: 13px;
    }

    .footer-links a:hover {
      color: ${theme.linkColor};
    }

    .footer-copyright {
      font-size: 12px;
      color: ${theme.footerMetaColor};
      margin: 0;
    }

    .unsubscribe {
      font-size: 12px;
      color: ${theme.footerMetaColor};
      margin: 16px 0 0 0;
    }

    .unsubscribe a {
      color: ${theme.footerMetaColor};
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
      background-color: rgba(52, 211, 153, 0.2);
      color: ${BRAND_COLORS.success};
    }

    .badge-warning {
      background-color: rgba(245, 158, 11, 0.2);
      color: ${BRAND_COLORS.warning};
    }

    .badge-error {
      background-color: rgba(251, 113, 133, 0.2);
      color: ${BRAND_COLORS.error};
    }

    .badge-gold {
      background-color: rgba(34, 211, 238, 0.2);
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
        background-color: ${theme.pageBackgroundColor} !important;
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
                ? `<div class="email-logo-badge"><img src="${leagueLogo}" alt="${leagueName}" height="48" style="height: 48px; width: auto; display: block;"></div>`
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
              <p style="font-size: 14px; color: ${theme.footerMetaColor}; margin-top: 24px;">
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
              <p style="font-size: 11px; color: ${theme.footerMetaColor}; margin: 8px 0 0 0;">
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

function getEmailBrandTheme(params: {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}) {
  const primaryColor = normalizeHexColor(params.primaryColor, BRAND_COLORS.gold);
  const accentColor = normalizeHexColor(params.accentColor, BRAND_COLORS.goldLight);
  const rawSecondaryColor = normalizeHexColor(params.secondaryColor, BRAND_COLORS.darkGray);
  const secondaryColor = balanceSecondaryColor(rawSecondaryColor);
  const pageBackgroundColor = mixHexColors(secondaryColor, BRAND_COLORS.black, 0.58);
  const containerBackgroundColor = mixHexColors(secondaryColor, BRAND_COLORS.darkGray, 0.2);
  const headerStartColor = primaryColor;
  const headerEndColor = accentColor;
  const headerTextColor = getContrastTextColor(mixHexColors(primaryColor, accentColor, 0.5));

  return {
    pageBackgroundColor,
    containerBackgroundColor,
    containerBorderColor: hexToRgba(primaryColor, 0.18),
    headerStartColor,
    headerEndColor,
    headerTextColor,
    contentTextColor: BRAND_COLORS.white,
    contentMutedColor: '#CBD5E1',
    linkColor: primaryColor,
    infoBoxBackgroundColor: hexToRgba(primaryColor, 0.12),
    infoBoxBorderColor: primaryColor,
    detailsBackgroundColor: hexToRgba(pageBackgroundColor, 0.82),
    buttonStartColor: primaryColor,
    buttonEndColor: accentColor,
    buttonTextColor: getContrastTextColor(mixHexColors(primaryColor, accentColor, 0.45)),
    buttonGlowColor: hexToRgba(primaryColor, 0.38),
    footerBackgroundColor: mixHexColors(pageBackgroundColor, BRAND_COLORS.black, 0.34),
    footerBorderColor: hexToRgba(primaryColor, 0.16),
    footerLinkColor: '#CBD5E1',
    footerMetaColor: '#64748B',
  };
}

function balanceSecondaryColor(color: string): string {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return BRAND_COLORS.darkGray;
  }

  const luminance = getRelativeLuminance(rgb);

  if (luminance <= 0.12) {
    return mixHexColors(color, BRAND_COLORS.black, 0.18);
  }

  if (luminance <= 0.3) {
    return mixHexColors(color, BRAND_COLORS.darkGray, 0.4);
  }

  return mixHexColors(color, BRAND_COLORS.darkGray, 0.78);
}

function normalizeHexColor(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const raw = normalized.slice(1);

  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
      .toUpperCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }

  return fallback;
}

function getContrastTextColor(hex: string): string {
  const rgb = parseHexColor(hex);
  if (!rgb) {
    return BRAND_COLORS.black;
  }

  return getRelativeLuminance(rgb) > 0.58 ? BRAND_COLORS.black : BRAND_COLORS.white;
}

function mixHexColors(from: string, to: string, ratio: number): string {
  const start = parseHexColor(from) ?? parseHexColor(BRAND_COLORS.gold)!;
  const end = parseHexColor(to) ?? parseHexColor(BRAND_COLORS.black)!;
  const clamped = Math.max(0, Math.min(1, ratio));

  return rgbToHex({
    r: Math.round(start.r + (end.r - start.r) * clamped),
    g: Math.round(start.g + (end.g - start.g) * clamped),
    b: Math.round(start.b + (end.b - start.b) * clamped),
  });
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHexColor(hex) ?? parseHexColor(BRAND_COLORS.gold)!;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function parseHexColor(hex: string): RgbColor | null {
  const normalized = normalizeHexColor(hex, '');
  if (!normalized) {
    return null;
  }

  const raw = normalized.slice(1);
  if (!/^[0-9A-F]{6}$/.test(raw)) {
    return null;
  }

  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: RgbColor): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function getRelativeLuminance({ r, g, b }: RgbColor): number {
  const channels = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
