begin;

alter table public.teams
  add column if not exists team_type text not null default 'standard';

alter table public.teams
  drop constraint if exists teams_team_type_check;

alter table public.teams
  add constraint teams_team_type_check
  check (team_type in ('standard', 'free_agents', 'placeholder', 'exhibition'));

create index if not exists idx_teams_league_team_type
  on public.teams (league_id, team_type);

with free_agent_candidates as (
  select id
  from public.teams
  where lower(trim(name)) in (
    'free agent',
    'free agents',
    'unassigned free agent',
    'unassigned free agents'
  )
  or lower(name) like '%free agent%'
)
update public.teams
set team_type = 'free_agents'
where id in (select id from free_agent_candidates);

commit;
