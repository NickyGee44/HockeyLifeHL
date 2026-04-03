-- Shift HLHL Spring 2026 scheduled games forward by 4 hours.
-- Context: times remained visually at UTC-equivalent local display after timezone handling changed.
-- Scope is intentionally pinned to the exact 22 scheduled game IDs present on 2026-04-02.

begin;

do $$
declare
  expected_count integer := 22;
  current_count integer;
  updated_count integer;
  target_ids uuid[] := array[
    'ab82b28f-e9a6-48a4-a7d4-7ddd43b2f761'::uuid,
    'cd9f5174-7866-4b69-952c-7e0df902bd02'::uuid,
    'dc6dd85e-8e17-4167-8e87-a1119a419835'::uuid,
    '8b4ca126-a61c-4e9c-bef6-fb1e690b206f'::uuid,
    '39761ec8-839e-431c-a44e-988995f8944b'::uuid,
    '982cae4e-7b32-4f3d-92ae-492993ab8671'::uuid,
    'ee7eec12-2e4b-4c32-aff7-146ff20fe11f'::uuid,
    '211fceaa-298a-46ae-954f-922c0ddd26ab'::uuid,
    '0326d92b-12b3-4e83-9e1b-fc02b29279e7'::uuid,
    'acf8c511-e743-4396-9642-234d32663399'::uuid,
    'e7d3e980-c561-439d-bab1-5a9ae5fea2ea'::uuid,
    '3d787f32-fd68-4f3a-b361-b7f592dae131'::uuid,
    'fb2c2bc4-a8d2-4f37-a3b7-ab09768123f2'::uuid,
    '036b8c5b-f59f-4873-ac29-afc49cddf4ed'::uuid,
    'f63a2be5-41a3-4f41-b9aa-ad7bdebc8ace'::uuid,
    'c5bd898d-f619-47de-8294-19c335267212'::uuid,
    '170759ff-87b3-4bc0-a584-1a387d3ecca0'::uuid,
    '93a6ae3e-d3ef-4d1d-9494-8ed69a1adb47'::uuid,
    'c660c93a-09a1-446a-9f2a-6ccfbb516fec'::uuid,
    '380bced4-ef37-43a3-b9c5-411e848f0b45'::uuid,
    'ad20dcd1-96ab-43fb-933c-fe616c8c018c'::uuid,
    '06e4930c-c107-493d-82e4-94f9b54f8534'::uuid
  ];
begin
  select count(*)
  into current_count
  from public.games
  where league_id = 'd6e55507-6eae-4d94-978c-47c6c30a36f1'
    and season_id = '6e2f732c-5c6c-4642-b645-f7dd040d0fa5'
    and status = 'scheduled'
    and id = any(target_ids);

  if current_count <> expected_count then
    raise exception 'Expected % scheduled HLHL Spring 2026 games, found %', expected_count, current_count;
  end if;

  alter table public.games disable trigger trigger_game_rescheduled;

  update public.games
     set scheduled_at = scheduled_at + interval '4 hours'
   where league_id = 'd6e55507-6eae-4d94-978c-47c6c30a36f1'
     and season_id = '6e2f732c-5c6c-4642-b645-f7dd040d0fa5'
     and status = 'scheduled'
     and id = any(target_ids);

  get diagnostics updated_count = row_count;

  if updated_count <> expected_count then
    raise exception 'Expected to update % games, updated %', expected_count, updated_count;
  end if;

  alter table public.games enable trigger trigger_game_rescheduled;
end $$;

commit;
