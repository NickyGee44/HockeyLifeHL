-- Canonicalized from legacy short migration version 20260220.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- ==============================================================================
-- SCHEMA: Account Inheritance — Profile Matching Columns
-- ==============================================================================
-- Description: Add columns to profiles for tracking pending legacy profile matches
-- and an index for efficient name-based matching during signup.
-- Date: February 20, 2026
-- ==============================================================================

BEGIN;

-- Array of legacy profile IDs that matched by name on signup
-- Empty = no pending matches; length 1 = auto-merged; length 2+ = disambiguation needed
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pending_legacy_match_ids UUID[] DEFAULT '{}';

-- Timestamp when a legacy merge was completed for this profile
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS legacy_merge_completed_at TIMESTAMPTZ;

-- Index for fast name lookups against unmerged legacy profiles
CREATE INDEX IF NOT EXISTS idx_profiles_legacy_name_match
  ON profiles(lower(trim(full_name)))
  WHERE is_legacy_import = TRUE AND legacy_merge_completed_at IS NULL;

-- Index for finding profiles with pending disambiguation
CREATE INDEX IF NOT EXISTS idx_profiles_pending_legacy_match
  ON profiles USING GIN (pending_legacy_match_ids)
  WHERE array_length(pending_legacy_match_ids, 1) > 0;

COMMIT;

