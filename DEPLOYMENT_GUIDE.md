# Deployment Guide - HockeyLifeHL

This guide covers how to deploy your HockeyLifeHL application to various hosting platforms for live demos and testing.

## 🚀 Recommended: Vercel (Best for Next.js)

### Why Vercel?
- **Zero-config** Next.js deployment
- **Free tier** (generous for demos)
- **Automatic preview deployments** for every branch/PR
- **Built-in environment variable management**
- **Fast global CDN**
- **Perfect Supabase integration**

### Quick Deploy to Vercel

#### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/HockeyApp.git
   git push -u origin main
   ```

2. **Go to [vercel.com](https://vercel.com)**
   - Sign up/login with GitHub
   - Click "Add New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**
   In the Vercel dashboard, add these environment variables:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   OPENAI_API_KEY=your_openai_api_key (if using AI features)
   STRIPE_SECRET_KEY=your_stripe_secret_key (if using payments)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key (if using payments)
   ```

4. **Deploy!**
   - Vercel will automatically detect Next.js
   - Click "Deploy"
   - Your site will be live in ~2 minutes at `your-project.vercel.app`

#### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy**
   ```bash
   vercel login
   vercel
   ```

3. **Follow the prompts** - Vercel will guide you through setup

### Vercel Features You'll Love

- **Preview Deployments**: Every branch gets its own URL
- **Automatic HTTPS**: SSL certificates included
- **Custom Domains**: Add your own domain easily
- **Analytics**: Built-in performance monitoring
- **Edge Functions**: For serverless API routes

---

## 🌐 Alternative Hosting Options

### 1. Netlify

**Pros:**
- Free tier available
- Good Next.js support
- Easy GitHub integration
- Built-in form handling

**Deploy Steps:**
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Connect GitHub repo
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Add environment variables in site settings

**Note:** Netlify requires a `netlify.toml` config file for Next.js:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 2. Railway

**Pros:**
- Simple deployment
- Good for full-stack apps
- $5/month credit (free tier)
- PostgreSQL included

**Deploy Steps:**
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables
5. Railway auto-detects Next.js

### 3. Render

**Pros:**
- Free tier available
- Simple setup
- Auto-deploy from GitHub

**Deploy Steps:**
1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add environment variables

### 4. Fly.io

**Pros:**
- Global edge deployment
- Good performance
- Free tier available

**Deploy Steps:**
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Follow prompts

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] All environment variables are documented
- [ ] `.env.local` is in `.gitignore` (never commit secrets!)
- [ ] Supabase project is set up and accessible
- [ ] Database migrations have been run
- [ ] RLS policies are configured correctly
- [ ] Test data is ready (or production data is migrated)
- [ ] Build passes locally: `npm run build`

---

## 🔐 Environment Variables Required

Create a `.env.local` file (or add to hosting platform):

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (Optional - for AI article generation)
OPENAI_API_KEY=your_openai_key

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Node Environment
NODE_ENV=production
```

**Where to find Supabase keys:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy `URL` and `anon public` key
4. For service role key: Settings → API → `service_role` key (keep secret!)

---

## 🚨 Important Security Notes

1. **Never commit `.env.local`** to Git
2. **Service Role Key** has admin access - keep it secret!
3. **Use environment variables** in hosting platform, not in code
4. **Enable RLS** on all Supabase tables
5. **Review RLS policies** before going live

---

## 🧪 Testing Your Deployment

After deployment:

1. **Check the homepage** loads correctly
2. **Test authentication** (login/register)
3. **Verify database connections** (stats, teams, etc.)
4. **Test admin features** (if you're the owner)
5. **Check mobile responsiveness**
6. **Test PWA features** (if enabled)

---

## 📱 Custom Domain Setup (Optional)

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. SSL auto-provisioned

### Other Platforms:
- Follow platform-specific domain setup guides
- Usually involves adding DNS records

---

## 🔄 Continuous Deployment

Once set up, every push to your main branch will:
- Automatically trigger a new deployment
- Run build checks
- Deploy to production (if successful)

For preview deployments:
- Create a branch
- Push to GitHub
- Get a preview URL automatically

---

## 💡 Pro Tips

1. **Use Vercel Preview URLs** for client demos
2. **Set up staging environment** (separate Supabase project)
3. **Monitor build logs** for errors
4. **Use Vercel Analytics** to track performance
5. **Set up error tracking** (Sentry, etc.) for production

---

## 🆘 Troubleshooting

### Build Fails
- Check build logs in hosting dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Environment Variables Not Working
- Double-check variable names (case-sensitive)
- Restart deployment after adding variables
- Check for typos

### Database Connection Issues
- Verify Supabase URL and keys
- Check Supabase project is active
- Review RLS policies

### PWA Not Working
- Ensure `NODE_ENV=production` in production
- Check service worker registration
- Verify HTTPS is enabled (required for PWA)

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Supabase Docs**: https://supabase.com/docs

---

**Recommended for your use case: Vercel** - It's the easiest, fastest, and most reliable option for Next.js apps! 🚀
