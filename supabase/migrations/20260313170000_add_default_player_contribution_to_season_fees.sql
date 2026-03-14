alter table public.season_fees
add column if not exists default_player_contribution_cents integer not null default 0;

alter table public.season_fees
add constraint season_fees_default_player_contribution_cents_nonnegative
check (default_player_contribution_cents >= 0);
