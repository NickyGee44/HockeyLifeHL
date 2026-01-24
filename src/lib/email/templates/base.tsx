// @ts-nocheck

export interface BaseEmailProps {
  title: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
}

/**
 * Base email template with HockeyLifeHL branding
 */
export function getBaseEmailTemplate({
  title,
  content,
  buttonText,
  buttonUrl,
  footerNote,
}: BaseEmailProps): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #E31837 0%, #003E7E 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .content p {
          margin: 15px 0;
        }
        .button {
          display: inline-block;
          background: #E31837;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
          text-align: center;
        }
        .button:hover {
          background: #C0142E;
        }
        .info-box {
          background: white;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #E31837;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 12px;
          padding: 20px;
        }
        .footer a {
          color: #666;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>🏒 ${title} 🏒</h1>
        </div>
        <div class="content">
          ${content}
          ${buttonText && buttonUrl ? `
            <p style="text-align: center;">
              <a href="${buttonUrl}" class="button">${buttonText}</a>
            </p>
          ` : ""}
          ${footerNote ? `<p style="font-size: 14px; color: #666; margin-top: 20px;">${footerNote}</p>` : ""}
          <p>See you on the ice! 🍁</p>
          <p><em>For Fun, For Beers, For Glory</em></p>
        </div>
        <div class="footer">
          <p>HockeyLifeHL - Men's Recreational Hockey League</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p style="font-size: 10px; margin-top: 10px;">
            <a href="${siteUrl}">Visit HockeyLifeHL</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
