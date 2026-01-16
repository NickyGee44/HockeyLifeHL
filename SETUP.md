# HockeyLifeHL - Setup Guide 🏒

This guide will help you set up the HockeyLifeHL project locally.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account and project
- (Optional) OpenAI API key for AI features
- (Optional) Stripe account for payment features

## Step 1: Install Dependencies

Dependencies are already installed! ✅

If you need to reinstall:
```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Site URL (Required for email links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# OpenAI API (Optional - for AI article generation)
OPENAI_API_KEY=your_openai_api_key_here

# Stripe Configuration (Optional - for payment features)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Node Environment
NODE_ENV=development
```

### How to Get Supabase Keys:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Step 3: Set Up Database

### Option A: Run the Full Schema (Recommended for New Projects)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/schema.sql` and copy its contents
4. Paste and run it in the SQL Editor

### Option B: Run Migrations (For Existing Projects)

If you already have a database, run the migrations in order:

1. Go to Supabase **SQL Editor**
2. Run each migration file from `supabase/migrations/` in this order:
   - `add_season_to_stats.sql`
   - `add_season_schedule_fields.sql`
   - `add_draft_order.sql`
   - `add_draft_link.sql`
   - `update_player_rating_enum.sql`
   - `enable_draft_realtime.sql`
   - `add_payments_table.sql`

## Step 4: Run the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Step 5: Create Your First User

1. Go to [http://localhost:3000/register](http://localhost:3000/register)
2. Create an account with your email
3. **Important**: Go to Supabase Dashboard → **Authentication** → **Users**
4. Find your user and change their role to `owner` in the `profiles` table

### Quick Way to Set Yourself as Owner:

1. Go to Supabase **SQL Editor**
2. Run:
```sql
UPDATE profiles 
SET role = 'owner' 
WHERE email = 'your-email@example.com';
```

## Step 6: (Optional) Create Test Data

If you want to populate the database with test players and teams:

1. Make sure your `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` set
2. Run the test player creation script:
```bash
npx tsx scripts/create-test-players.ts
```

This creates 91 test players with emails like `player1@hockeylifehl.test` and passwords like `TestPlayer1!`

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists in the project root
- Check that all required variables are set
- Restart the dev server after adding environment variables

### "Database connection failed"
- Verify your Supabase URL and keys are correct
- Check that your Supabase project is active
- Ensure RLS policies are set up (run the schema.sql)

### "Email confirmation required"
- Go to Supabase Dashboard → **Authentication** → **Settings**
- Under "Email Auth", disable "Confirm email" for testing
- Or check your email for the confirmation link

### Build Errors
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then reinstall
- Check Node.js version (should be 18+)

## Next Steps

Once set up, you can:
- Create teams and seasons in the admin dashboard
- Add players to teams
- Schedule games
- Enter stats as a team captain
- Test the draft system

For more information, see:
- [README.md](./README.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

---

**Need Help?** Check the `.cursor/scratchpad.md` file for project status and detailed implementation notes.

