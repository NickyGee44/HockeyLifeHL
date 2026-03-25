-- =============================================================================
-- Migration: Add game_scoresheets table and RLS
--
-- Creates the game_scoresheets table to store uploaded scoresheet images
-- for games. Scanned scoresheets are stored in the `game-scoresheets` storage
-- bucket and the metadata (image_url, storage_path) is recorded here.
--
-- RLS: Public read (league sites are public). Write access is handled via
-- the service role in the analyze API route.
-- =============================================================================

-- Create game_scoresheets table
create table if not exists public.game_scoresheets (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  league_id    uuid not null references public.leagues(id) on delete cascade,
  image_url    text not null,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- Enable RLS
alter table public.game_scoresheets enable row level security;

-- Anyone can read (league sites are public)
-- Note: CREATE POLICY IF NOT EXISTS is not supported; use DROP + CREATE pattern
drop policy if exists "Public read game_scoresheets" on public.game_scoresheets;
create policy "Public read game_scoresheets"
  on public.game_scoresheets for select
  using (true);

-- Index for fast lookup by game_id
create index if not exists idx_game_scoresheets_game_id
  on public.game_scoresheets (game_id);
