# Supabase Database Structure

This directory contains all database-related files for the HockeyLifeHL multi-tenant platform.

## Directory Structure

```
supabase/
├── migrations/           # Active migration files (chronological order)
├── utilities/           # Database utility scripts
├── verification/        # RLS and migration verification scripts
└── archive/            # Archived old migrations and queries
    ├── old-migrations/     # Superseded migration versions
    └── sql-editor-queries/ # Ad-hoc SQL queries from development
```

## Migrations (20 files)

### Core Multi-Tenant Setup (Jan 25, 2026)
Executed migrations that established the multi-tenant architecture:

1. **20260125_create_core_multi_tenant_tables.sql**
   - Creates `leagues`, `league_memberships`, `divisions`, `venues` tables
   - Foundation of multi-tenant architecture

2. **20260125_add_league_id_to_core_tables.sql**
   - Adds `league_id` to teams, team_rosters, seasons

3. **20260125_add_league_id_to_games_and_stats.sql**
   - Adds `league_id` to games, player_stats, goalie_stats

4. **20260125_add_league_id_to_draft_payment_tables.sql**
   - Adds `league_id` to drafts, draft_picks, player_ratings, payments, suspensions

5. **20260125_add_league_id_to_feature_tables.sql**
   - Adds `league_id` to articles, trades, player_goalie_matchups, season_highlights, email_drafts

6. **20260125_create_league_helper_functions.sql**
   - 18 helper functions for league-aware database operations
   - Examples: `get_league_teams()`, `get_league_players()`, etc.

7. **20260125_create_scorekeeper_tables.sql**
   - Creates scorekeeper system tables: `game_scorekeeper_assignments`, `game_stat_entry_log`, `scorekeeper_notes`

8. **20260125_create_player_goalie_matchups.sql**
   - Player vs goalie performance tracking

9. **20260125_create_trades_system.sql**
   - Multi-player trade management

10. **20260125_add_season_history_features.sql**
    - Season progression and history tracking

11. **20260125_audit_logs.sql**
    - Comprehensive audit trail for all changes

12. **20260125_setup_realtime_and_storage.sql**
    - Realtime subscriptions and file storage configuration

13. **20260125_webhook_events.sql**
    - Webhook event system for integrations

14. **20260125_migrate_existing_data_to_league_1.sql**
    - Data migration from single-tenant to multi-tenant structure
    - Migrates HockeyLifeHL data to League #1

### New Features (Jan 26, 2026)
Ready to execute - adds new revenue and discovery features:

15. **20260126_create_game_stats_table.sql**
    - Individual player stat entries during games
    - Required for scorekeeper system

16. **20260126_create_player_approvals_table.sql**
    - Player approval workflow per league

17. **20260126_create_sponsors_system.sql**
    - Platform sponsors (site-wide ads)
    - League sponsors (per-league revenue)
    - **Revenue Generation Feature**

18. **20260126_add_season_registration_type.sql**
    - Draft vs open registration vs captain invite
    - Registration time windows
    - **Flexibility for Different League Types**

19. **20260126_enhance_leagues_for_discovery.sql**
    - Public league visibility
    - Location-based search (lat/lon)
    - SEO keywords
    - **Player Acquisition Feature**

20. **20260126_create_team_join_requests.sql**
    - Team join request workflow
    - Captain approval system
    - **Non-Draft Registration Flow**

## Utilities

Scripts for database management and verification:

- **APPLY_MIGRATIONS.sql** - Helper queries for applying migrations
- **check_database_state.sql** - Database health check queries
- **DATABASE_VERIFICATION.sql** - Verify migration success
- **DEBUG_SEASONS.sql** - Season troubleshooting queries
- **schema.sql** - Full database schema snapshot

## Verification

RLS policy and security testing scripts:

- **00_quick_verification.sql** - Fast verification (10 tests)
- **01_verify_migrations.sql** - Detailed migration verification
- **02_test_rls_policies.sql** - Row Level Security testing
- **03_performance_testing.sql** - Query performance benchmarks
- **verify_rls_complete.sql** - Comprehensive RLS verification

## Archive

### old-migrations/ (15 files)
Superseded versions of migrations kept for reference:
- Migration 7 variants (FINAL_WORKING_VERSION, RUN_THIS, ULTIMATE_FIX)
- Duplicate migration file versions
- Old undated migration files (add_draft_link.sql, etc.)

### sql-editor-queries/ (14 files)
Ad-hoc queries used during development:
- SQL_EDITOR_* files
- One-time fixes and data updates
- Development debugging queries

## Migration Status

### ✅ Executed (Production)
Migrations 1-14 (20260125_*) are LIVE in production database.

### 🟡 Ready to Execute
Migrations 15-20 (20260126_*) are ready but NOT yet executed:
- See: `../RUN_NEW_FEATURE_MIGRATIONS.md` for execution instructions
- Must be executed in order
- Requires type regeneration after execution

## How to Apply New Migrations

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new
   ```

2. **For each migration file in order:**
   - Open the migration file
   - Copy entire contents (Ctrl+A, Ctrl+C)
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Verify success message

3. **After all migrations:**
   ```bash
   # Regenerate TypeScript types
   cd HockeyLifeHL
   npx supabase gen types typescript --project-id ntplczcmhvfkijjxavdl --schema public > src/types/database.ts
   ```

4. **Verify build:**
   ```bash
   npm run build
   ```

## Helper Functions Available

After executing all migrations, these helper functions are available:

### League Context
- `get_user_leagues(user_id)` - Get all leagues user is member of
- `is_league_admin(user_id, league_id)` - Check admin status
- `get_active_league_id()` - Get current league from session

### Data Retrieval
- `get_league_teams(league_id)` - Get all teams
- `get_league_players(league_id)` - Get all players
- `get_league_games(league_id, season_id)` - Get games
- `get_league_stats(league_id, season_id)` - Get stats

### Sponsors (New)
- `get_active_league_sponsors(league_id)` - Get active league sponsors
- `get_active_platform_sponsors()` - Get active platform sponsors

### Registration (New)
- `is_season_registration_open(season_id)` - Check if registration open
- `get_open_registration_seasons(league_id)` - Get seasons accepting players
- `is_team_roster_full(team_id, season_id)` - Check roster limits

### Discovery (New)
- `search_nearby_leagues(lat, lon, radius_km)` - Location-based search
- `search_leagues_by_keyword(query, limit)` - Keyword search
- `get_leagues_by_location(city, state, country)` - Filter by location

### Team Join Requests (New)
- `get_team_pending_requests(team_id)` - Get pending join requests
- `get_player_request_status(player_id, team_id, season_id)` - Check request status

## Important Notes

### Multi-Tenant Security
- All tables have Row Level Security (RLS) enabled
- Users can only access data for leagues they're members of
- Admin-only operations require league admin role
- Public data (league discovery) has special policies

### Migration Order
- Migrations MUST be executed in chronological order
- Do not skip migrations
- If a migration fails, fix the issue before proceeding

### Type Regeneration
- After adding/modifying tables, always regenerate types
- This ensures TypeScript type safety across the application
- Removes @ts-ignore comments from codebase

### Testing
- Always run verification scripts after migrations
- Test RLS policies thoroughly
- Verify multi-tenant isolation

## Support

For issues with migrations:
1. Check execution order
2. Review error messages in Supabase logs
3. Run verification scripts
4. Check RLS policies if access denied

For new feature migrations:
- See: `../RUN_NEW_FEATURE_MIGRATIONS.md`
- See: `../../NEW_FEATURES_SUMMARY.md`
- See: `../../UPDATED_AGENT_PROMPTS_V2.md`
