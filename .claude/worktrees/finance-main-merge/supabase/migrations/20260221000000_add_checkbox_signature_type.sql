-- Canonicalized from legacy short migration version 20260221.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- Add 'checkbox' signature type for simplified waiver flow
-- This allows leagues to use checkbox-only waiver acceptance (no drawn/typed signature)
ALTER TYPE signature_type_enum ADD VALUE IF NOT EXISTS 'checkbox';

