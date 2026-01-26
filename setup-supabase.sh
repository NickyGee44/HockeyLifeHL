#!/bin/bash

# ==============================================================================
# SUPABASE CLI SETUP SCRIPT
# ==============================================================================
# Purpose: Enable Realtime and create storage buckets using Supabase CLI
# Run this after: Installing Supabase CLI and logging in
# ==============================================================================

set -e  # Exit on error

echo "🏒 HockeyLifeHL Multi-Tenant Setup"
echo "=================================="
echo ""

# ==============================================================================
# 1. LOGIN TO SUPABASE
# ==============================================================================
echo "Step 1: Logging in to Supabase..."
supabase login

# ==============================================================================
# 2. LINK TO PROJECT
# ==============================================================================
echo ""
echo "Step 2: Linking to your Supabase project..."
supabase link --project-ref ntplczcmhvfkijjxavdl

# ==============================================================================
# 3. ENABLE REALTIME ON TABLES
# ==============================================================================
echo ""
echo "Step 3: Enabling Realtime on tables..."

# Enable Realtime for games table
echo "  - Enabling Realtime on 'games' table..."
supabase db push <<SQL
ALTER PUBLICATION supabase_realtime ADD TABLE games;
SQL

# Enable Realtime for player_stats table
echo "  - Enabling Realtime on 'player_stats' table..."
supabase db push <<SQL
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;
SQL

# Enable Realtime for goalie_stats table
echo "  - Enabling Realtime on 'goalie_stats' table..."
supabase db push <<SQL
ALTER PUBLICATION supabase_realtime ADD TABLE goalie_stats;
SQL

echo "  ✅ Realtime enabled on all stat tables!"

# ==============================================================================
# 4. CREATE STORAGE BUCKETS
# ==============================================================================
echo ""
echo "Step 4: Creating storage buckets..."

# Create league-logos bucket
echo "  - Creating 'league-logos' bucket..."
supabase storage create league-logos \
  --public \
  --file-size-limit 2097152 \
  --allowed-mime-types "image/png,image/jpeg,image/svg+xml,image/webp"

# Create team-logos bucket
echo "  - Creating 'team-logos' bucket..."
supabase storage create team-logos \
  --public \
  --file-size-limit 2097152 \
  --allowed-mime-types "image/png,image/jpeg,image/svg+xml,image/webp"

# Create player-avatars bucket
echo "  - Creating 'player-avatars' bucket..."
supabase storage create player-avatars \
  --public \
  --file-size-limit 1048576 \
  --allowed-mime-types "image/png,image/jpeg,image/webp"

echo "  ✅ All storage buckets created!"

# ==============================================================================
# 5. BACKUP DATABASE
# ==============================================================================
echo ""
echo "Step 5: Creating database backup..."
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
supabase db dump -f "$BACKUP_FILE"
echo "  ✅ Backup saved to: $BACKUP_FILE"

# ==============================================================================
# COMPLETE
# ==============================================================================
echo ""
echo "=================================="
echo "✅ Supabase setup complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Verify buckets at: https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/storage/buckets"
echo "2. Test Resend email (run: npm run test-resend)"
echo "3. Configure Stripe Connect (see STRIPE_CONNECT_SETUP.md)"
echo ""
