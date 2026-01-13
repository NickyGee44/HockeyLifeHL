# Email Branding Setup for HockeyLifeHL

This guide explains how to brand all emails sent by Supabase Auth (registration, password reset, email verification, etc.) with the HockeyLifeHL branding.

## Steps to Configure Email Branding in Supabase

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `HockeyLifeHL`

2. **Navigate to Authentication Settings**
   - Go to: **Authentication** → **Email Templates**
   - Or: **Settings** → **Auth** → **Email Templates**

3. **Customize Each Email Template**

   You'll need to customize these templates:
   - **Confirm signup** (Registration email)
   - **Magic Link** (if using magic links)
   - **Change Email Address**
   - **Reset Password** (Forgot password)
   - **Invite user** (if using invites)

4. **Email Template Customization**

   For each template, you can use HTML and include:
   - HockeyLifeHL logo
   - Canadian hockey theme colors
   - "For Fun, For Beers, For Glory" tagline
   - Custom styling

### Example Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #E31837 0%, #1E3A8A 100%);
      padding: 30px;
      text-align: center;
    }
    .logo {
      max-width: 120px;
      margin-bottom: 10px;
    }
    .content {
      padding: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #E31837;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: white; margin: 0;">HockeyLifeHL</h1>
      <p style="color: white; margin: 5px 0 0 0;">For Fun, For Beers, For Glory 🍁🏒</p>
    </div>
    <div class="content">
      <h2>{{ .Title }}</h2>
      <p>{{ .Content }}</p>
      {{ if .Link }}
      <a href="{{ .Link }}" class="button">Confirm</a>
      {{ end }}
    </div>
    <div class="footer">
      <p>HockeyLifeHL - Men's Recreational Hockey League</p>
      <p>Questions? Contact your league administrator.</p>
    </div>
  </div>
</body>
</html>
```

### Template Variables Available

Supabase provides these variables:
- `{{ .Email }}` - User's email
- `{{ .Token }}` - Confirmation/reset token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL after action
- `{{ .ConfirmationURL }}` - Full confirmation URL
- `{{ .EmailChangeToken }}` - Email change token
- `{{ .NewEmail }}` - New email address
- `{{ .PasswordChangeToken }}` - Password reset token

### Specific Templates to Update

#### 1. Confirm Signup (Registration)
- **Subject**: `Welcome to HockeyLifeHL! Confirm your email`
- **Body**: Include welcome message, logo, and confirmation link

#### 2. Reset Password (Forgot Password)
- **Subject**: `Reset your HockeyLifeHL password`
- **Body**: Include reset instructions and link

#### 3. Change Email Address
- **Subject**: `Confirm your new HockeyLifeHL email`
- **Body**: Include confirmation link

#### 4. Magic Link (if enabled)
- **Subject**: `Your HockeyLifeHL login link`
- **Body**: Include magic link

## Email Settings

Also configure in **Settings** → **Auth**:

1. **Site URL**: Set to your production domain
2. **Redirect URLs**: Add your allowed redirect URLs
3. **Email Provider**: Configure SMTP if using custom email (optional)

## Testing

After updating templates:
1. Test registration email
2. Test password reset email
3. Test email verification
4. Check email rendering in different clients (Gmail, Outlook, etc.)

## Notes

- Supabase uses Go templates for email customization
- You can use HTML and inline CSS
- Images should be hosted externally (use your logo URL)
- Test emails in both light and dark mode email clients
- Keep mobile-friendly (responsive design)

## Logo URL

If you want to include the logo in emails, host it publicly and use:
```html
<img src="https://hockeylifehl.com/logo.png" alt="HockeyLifeHL" class="logo" />
```

Or use a CDN/service like Cloudinary, Imgur, etc.
