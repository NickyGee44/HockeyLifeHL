# Quick Deploy Guide - HockeyLifeHL 🚀

## Fastest Way: Vercel (Recommended)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/HockeyApp.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign up/login
2. **Click "Add New Project"**
3. **Import your GitHub repository**
4. **Add Environment Variables:**

   In the Vercel dashboard, go to Settings → Environment Variables and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   **Optional (if using features):**
   ```
   OPENAI_API_KEY=your_openai_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

5. **Click "Deploy"**
6. **Done!** Your site will be live at `your-project.vercel.app`

### Step 3: Get Your Supabase Keys

1. Go to [supabase.com](https://supabase.com) → Your Project
2. Settings → API
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## Alternative: Netlify

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. New site from Git → Connect GitHub
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add environment variables
6. Deploy!

---

## What You'll Get

✅ **Live URL** (e.g., `hockeylifehl.vercel.app`)  
✅ **HTTPS** (automatic SSL)  
✅ **Auto-deploy** on every push  
✅ **Preview URLs** for branches  
✅ **Free tier** (perfect for demos)

---

## After Deployment

1. Test the live site
2. Share the URL for demos
3. Set up custom domain (optional)
4. Monitor in Vercel dashboard

**That's it! Your app is live! 🎉**
