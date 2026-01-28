# Supabase Email Templates - HockeyLifeHL

## Setup Instructions

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. For each template below, copy and paste the HTML into the corresponding template in Supabase

---

## 1. Confirm Signup Template

**Subject:** Welcome to {{ .SiteURL }} - Confirm Your Email 🏒

**Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B1220;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B1220; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #151C2C; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); padding: 40px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                🏒 Welcome to HockeyLifeHL!
              </h1>
              <p style="color: #FFD700; font-size: 16px; font-weight: 600; margin: 10px 0 0 0; letter-spacing: 1px;">
                For Fun, For Beers, For Glory
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; color: #E5E7EB;">
              <p style="font-size: 18px; line-height: 1.6; margin: 0 0 20px 0;">
                Thanks for signing up! We're excited to have you join the league.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #9CA3AF;">
                Click the button below to confirm your email address and get started:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; color: #6B7280;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="font-size: 12px; line-height: 1.6; margin: 10px 0 0 0; color: #4B5563; word-break: break-all; background: #0B1220; padding: 12px; border-radius: 6px; border-left: 3px solid #FF0000;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center; border-top: 1px solid #1F2937;">
              <p style="font-size: 12px; color: #6B7280; margin: 0 0 10px 0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="font-size: 12px; color: #4B5563; margin: 0;">
                © {{ .Year }} HockeyLifeHL. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password Template

**Subject:** Reset Your Password - HockeyLifeHL 🔒

**Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B1220;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B1220; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #151C2C; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); padding: 40px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                🔒 Password Reset Request
              </h1>
              <p style="color: #FFD700; font-size: 16px; font-weight: 600; margin: 10px 0 0 0; letter-spacing: 1px;">
                HockeyLifeHL
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; color: #E5E7EB;">
              <p style="font-size: 18px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset your password.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #9CA3AF;">
                Click the button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; color: #6B7280;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="font-size: 12px; line-height: 1.6; margin: 10px 0 0 0; color: #4B5563; word-break: break-all; background: #0B1220; padding: 12px; border-radius: 6px; border-left: 3px solid #FF0000;">
                {{ .ConfirmationURL }}
              </p>

              <div style="margin-top: 30px; padding: 16px; background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 6px;">
                <p style="font-size: 14px; color: #92400E; margin: 0; font-weight: 600;">
                  ⚠️ This link will expire in 1 hour
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center; border-top: 1px solid #1F2937;">
              <p style="font-size: 12px; color: #6B7280; margin: 0 0 10px 0;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>
              <p style="font-size: 12px; color: #4B5563; margin: 0;">
                © {{ .Year }} HockeyLifeHL. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Change Email Template

**Subject:** Confirm Your New Email Address - HockeyLifeHL ✉️

**Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Email Change</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B1220;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B1220; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #151C2C; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); padding: 40px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ✉️ Email Address Change
              </h1>
              <p style="color: #FFD700; font-size: 16px; font-weight: 600; margin: 10px 0 0 0; letter-spacing: 1px;">
                HockeyLifeHL
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; color: #E5E7EB;">
              <p style="font-size: 18px; line-height: 1.6; margin: 0 0 20px 0;">
                You requested to change your email address.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #9CA3AF;">
                Click the button below to confirm this new email address:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);">
                      Confirm Email Change
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; color: #6B7280;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="font-size: 12px; line-height: 1.6; margin: 10px 0 0 0; color: #4B5563; word-break: break-all; background: #0B1220; padding: 12px; border-radius: 6px; border-left: 3px solid #FF0000;">
                {{ .ConfirmationURL }}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center; border-top: 1px solid #1F2937;">
              <p style="font-size: 12px; color: #6B7280; margin: 0 0 10px 0;">
                If you didn't request this change, please ignore this email and secure your account.
              </p>
              <p style="font-size: 12px; color: #4B5563; margin: 0;">
                © {{ .Year }} HockeyLifeHL. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Magic Link Template (Optional)

**Subject:** Your Magic Sign-In Link - HockeyLifeHL 🪄

**Body (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magic Sign-In Link</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B1220;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B1220; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #151C2C; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); padding: 40px; text-align: center;">
              <h1 style="color: #FFFFFF; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                🪄 Sign In to HockeyLifeHL
              </h1>
              <p style="color: #FFD700; font-size: 16px; font-weight: 600; margin: 10px 0 0 0; letter-spacing: 1px;">
                For Fun, For Beers, For Glory
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; color: #E5E7EB;">
              <p style="font-size: 18px; line-height: 1.6; margin: 0 0 20px 0;">
                Your magic sign-in link is ready!
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; color: #9CA3AF;">
                Click the button below to instantly sign in to your account:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);">
                      Sign In Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; color: #6B7280;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="font-size: 12px; line-height: 1.6; margin: 10px 0 0 0; color: #4B5563; word-break: break-all; background: #0B1220; padding: 12px; border-radius: 6px; border-left: 3px solid #FF0000;">
                {{ .ConfirmationURL }}
              </p>

              <div style="margin-top: 30px; padding: 16px; background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 6px;">
                <p style="font-size: 14px; color: #92400E; margin: 0; font-weight: 600;">
                  ⚠️ This link expires in 1 hour and can only be used once
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center; border-top: 1px solid #1F2937;">
              <p style="font-size: 12px; color: #6B7280; margin: 0 0 10px 0;">
                If you didn't request this link, you can safely ignore this email.
              </p>
              <p style="font-size: 12px; color: #4B5563; margin: 0;">
                © {{ .Year }} HockeyLifeHL. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## How to Apply Templates

### In Supabase Dashboard:

1. **Go to Authentication → Email Templates**
2. **Select each template type** (Confirm signup, Reset password, etc.)
3. **Replace the default content** with the HTML above
4. **Update the Subject line** with the one provided
5. **Click "Save"**

### Testing:

After applying templates, test each flow:
- Register a new account → Check confirmation email
- Use "Forgot Password" → Check reset email
- Change email in profile → Check email change confirmation
- (Optional) Test magic link if enabled

### Customization:

The templates use these colors matching your theme:
- **Primary Red:** `#FF0000`
- **Dark Background:** `#0B1220`
- **Card Background:** `#151C2C`
- **Gold Accent:** `#FFD700`

You can customize the logo/colors by:
1. Uploading a logo to your public assets
2. Replacing the emoji header (🏒) with: `<img src="YOUR_LOGO_URL" alt="HockeyLifeHL" style="height: 60px;">`
3. Adjusting colors in the `background` and `color` styles

---

## Available Variables

Supabase provides these template variables:
- `{{ .ConfirmationURL }}` - The action link (signup/reset/etc)
- `{{ .SiteURL }}` - Your site URL from Supabase settings
- `{{ .Token }}` - The verification token
- `{{ .TokenHash }}` - Hashed token
- `{{ .Year }}` - Current year

---

**Note:** After applying these templates, your authentication emails will have the HockeyLifeHL branding with Canadian hockey theme! 🏒🍁
