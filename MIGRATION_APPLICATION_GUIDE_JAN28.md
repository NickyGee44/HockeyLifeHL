# 🔧 Migration Application Guide - January 28, 2026

## Overview
This guide covers applying the new site templates migrations created for the Enhanced Signup Implementation Plan.

**Created by**: Agent 1
**Date**: January 28, 2026
**Purpose**: Enable site template selection system for league signup

---

## 📋 Migrations to Apply

### 1. Site Templates Migration ✅ READY
**File**: `supabase/migrations/20260128_create_site_templates.sql`
**Status**: Created, ready to apply
**Purpose**: Creates the template system infrastructure

**What it does**:
- Creates `site_templates` table (stores 5 template configurations)
- Creates `league_template_settings` table (stores league customizations)
- Adds 4 performance indexes
- Implements RLS policies (public read, admin write)
- Creates 3 helper functions:
  - `get_active_site_templates()` - Fetch templates for selection UI
  - `get_league_template_config(league_id)` - Get league's template + customizations
  - `get_template_usage_stats()` - Analytics for template popularity
- Adds automatic `updated_at` triggers

### 2. Template Seed Data ✅ READY
**File**: `supabase/seeds/seed_site_templates.sql`
**Status**: Created, ready to apply
**Purpose**: Populate 5 default templates with full configurations

**What it does**:
- Seeds 5 complete site templates:
  1. **Classic Sports** - Traditional professional sports league look (Red/Gold)
  2. **Modern Minimal** - Clean, contemporary design (Coral/Slate)
  3. **Bold & Vibrant** - High energy colors with dynamic elements (Pink/Purple/Cyan)
  4. **Dark Mode Pro** - Premium dark theme with elegant accents (Blue/Purple on Dark)
  5. **Community Friendly** - Warm, welcoming design for recreational leagues (Orange/Green)
- Each template includes:
  - 3-4 color presets
  - Layout configuration (header style, card style, spacing)
  - Typography settings
  - Component style variants (buttons, cards, navigation)

---

## 🚀 How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Run Migration**
   - Click "New Query"
   - Copy the contents of `supabase/migrations/20260128_create_site_templates.sql`
   - Paste into the SQL editor
   - Click "Run" button
   - Wait for success message

3. **Run Seed Data**
   - Create another new query
   - Copy the contents of `supabase/seeds/seed_site_templates.sql`
   - Paste into the SQL editor
   - Click "Run" button
   - Should see message: "Successfully seeded 5 site templates"

### Option 2: Supabase CLI (If installed)

```bash
# Navigate to project directory
cd HockeyLifeHL

# Apply migration
supabase db push

# Or apply specific migration
supabase db execute --file supabase/migrations/20260128_create_site_templates.sql

# Apply seed data
supabase db execute --file supabase/seeds/seed_site_templates.sql
```

### Option 3: Manual SQL Execution (Advanced)

If you have direct PostgreSQL access:

```bash
# Connect to your database
psql [your-connection-string]

# Run migration
\i supabase/migrations/20260128_create_site_templates.sql

# Run seed data
\i supabase/seeds/seed_site_templates.sql
```

---

## ✅ Verification Steps

After applying migrations, verify they worked correctly:

### 1. Check Tables Exist

```sql
-- Should return 2 tables
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('site_templates', 'league_template_settings');
```

### 2. Check Templates Were Seeded

```sql
-- Should return 5 templates
SELECT id, name, slug, is_active, sort_order
FROM site_templates
ORDER BY sort_order;
```

Expected output:
```
1. Classic Sports (classic-sports)
2. Modern Minimal (modern-minimal)
3. Bold & Vibrant (bold-vibrant)
4. Dark Mode Pro (dark-mode-pro)
5. Community Friendly (community-friendly)
```

### 3. Check Helper Functions

```sql
-- Should return 5 templates
SELECT * FROM get_active_site_templates();

-- Should return empty (no leagues have templates yet)
SELECT * FROM get_template_usage_stats();
```

### 4. Check RLS Policies

```sql
-- Should show policies for both tables
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('site_templates', 'league_template_settings');
```

### 5. Test Template Selection (Optional)

Try inserting a test league template setting:

```sql
-- Replace with actual league ID and template ID
INSERT INTO league_template_settings (league_id, template_id, customizations)
VALUES (
  '[your-league-id]',
  (SELECT id FROM site_templates WHERE slug = 'classic-sports' LIMIT 1),
  '{"colors": {"primary": "#FF0000"}}'::jsonb
);

-- Verify it worked
SELECT * FROM league_template_settings;

-- Clean up test data
DELETE FROM league_template_settings WHERE league_id = '[your-league-id]';
```

---

## 🔍 Troubleshooting

### Error: "relation 'leagues' does not exist"

**Solution**: The `leagues` table must exist first. This should already be in place from previous migrations.

### Error: "permission denied for schema public"

**Solution**: Run the migration as a superuser or database owner. In Supabase dashboard, you should have proper permissions.

### Error: "duplicate key value violates unique constraint"

**Solution**: Templates already seeded. You can:
- Skip the seed file (templates already exist)
- OR truncate and re-seed:
  ```sql
  TRUNCATE TABLE league_template_settings CASCADE;
  TRUNCATE TABLE site_templates CASCADE;
  -- Then run seed file again
  ```

### No Templates Returned by `get_active_site_templates()`

**Check**:
```sql
-- Are templates marked as active?
SELECT name, is_active FROM site_templates;

-- Update if needed
UPDATE site_templates SET is_active = TRUE;
```

---

## 📊 Post-Migration Checklist

- [ ] Migration applied successfully (no errors in console)
- [ ] Seed data applied successfully (5 templates inserted)
- [ ] Tables exist in database schema
- [ ] Helper functions callable
- [ ] RLS policies active and correct
- [ ] Template preview images exist in `/public/templates/` (already created by Agent 4)
- [ ] TypeScript types defined in `src/types/site-templates.ts` ✅
- [ ] Server actions created in `src/lib/templates/actions.ts` ✅

---

## 🎯 Next Steps After Migration

Once migrations are applied:

1. **Test Template Fetching**
   - Call `getAllTemplates()` server action
   - Should return 5 templates

2. **Verify Frontend Components**
   - TemplateSelector component should display 5 template cards ✅ (created by Agent 5)
   - TemplatePreview component should work with template data ✅ (created by Agent 3)

3. **Continue with Phase 3**
   - Agent 4 is working on Task 3.1 (Enhanced Signup Wizard Container)
   - Once 3.1 is complete, other agents can work on steps 2-8

4. **Regenerate Supabase Types** (Optional but Recommended)
   - This will add TypeScript types for the new tables
   - Run: `supabase gen types typescript --project-id [your-project-id] > src/types/supabase.ts`
   - Or in dashboard: Settings → API → Generate Types

---

## 📝 Notes

- Templates can be edited later by platform admins
- League owners can select templates during signup (once Phase 3 is complete)
- Customizations are stored per-league in `league_template_settings.customizations` JSONB
- Preview images are SVG placeholders (can be replaced with actual screenshots later)

---

**Migration created by**: Agent 1
**Files involved**:
- `supabase/migrations/20260128_create_site_templates.sql`
- `supabase/seeds/seed_site_templates.sql`
- `src/types/site-templates.ts`
- `src/lib/templates/actions.ts`

**Status**: ✅ Ready to apply
