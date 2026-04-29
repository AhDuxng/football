create extension if not exists pgcrypto;

-- drop table if exists public.tactics cascade;
-- drop table if exists public.practice_sessions cascade;
-- drop table if exists public.team_fund_contributions cascade;
-- drop table if exists public.team_fund_months cascade;
-- drop table if exists public.finances cascade;
-- drop table if exists public.match_events cascade;
-- drop table if exists public.matches cascade;
-- drop table if exists public.invitations_requests cascade;
-- drop table if exists public.team_members cascade;
-- drop table if exists public.teams cascade;
-- drop table if exists public.users cascade;

-- drop type if exists public.finance_type cascade;
-- drop type if exists public.match_event_type cascade;
-- drop type if exists public.match_status cascade;
-- drop type if exists public.invitation_status cascade;
-- drop type if exists public.invitation_type cascade;
-- drop type if exists public.preferred_position cascade;
-- drop type if exists public.team_role cascade;
-- drop type if exists public.system_role cascade;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'system_role') then
    create type public.system_role as enum ('ADMIN', 'USER');
  end if;

  if not exists (select 1 from pg_type where typname = 'team_role') then
    create type public.team_role as enum ('CAPTAIN', 'COACH', 'PLAYER', 'TREASURER');
  end if;

  if not exists (select 1 from pg_type where typname = 'preferred_position') then
    create type public.preferred_position as enum (
      'GK',
      'RB',
      'RWB',
      'CB',
      'LB',
      'LWB',
      'CDM',
      'CM',
      'CAM',
      'RM',
      'LM',
      'RW',
      'LW',
      'CF',
      'ST'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'invitation_type') then
    create type public.invitation_type as enum ('INVITE', 'REQUEST');
  end if;

  if not exists (select 1 from pg_type where typname = 'invitation_status') then
    create type public.invitation_status as enum ('PENDING', 'ACCEPTED', 'REJECTED');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_status') then
    create type public.match_status as enum ('UPCOMING', 'COMPLETED');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_event_type') then
    create type public.match_event_type as enum ('GOAL', 'ASSIST', 'MVP', 'YELLOW_CARD', 'RED_CARD');
  end if;

  if not exists (select 1 from pg_type where typname = 'finance_type') then
    create type public.finance_type as enum ('INCOME', 'EXPENSE');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  system_role public.system_role not null default 'USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_format_chk check (position('@' in email) > 1)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo text,
  description text,
  total_fund numeric(12, 2) not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team_role public.team_role not null default 'PLAYER',
  preferred_position public.preferred_position,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id),
  constraint uq_team_members_user_single_team unique (user_id)
);

create unique index if not exists uq_team_members_single_captain
  on public.team_members (team_id)
  where team_role = 'CAPTAIN';

create table if not exists public.invitations_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  type public.invitation_type not null,
  status public.invitation_status not null default 'PENDING',
  message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint invitations_sender_receiver_chk check (sender_id <> receiver_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent_name text not null,
  match_date timestamptz not null,
  location text,
  status public.match_status not null default 'UPCOMING',
  home_score integer,
  away_score integer,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_score_non_negative_chk check (
    (home_score is null or home_score >= 0)
    and (away_score is null or away_score >= 0)
  ),
  constraint matches_completed_score_chk check (
    (
      status = 'UPCOMING'
      and home_score is null
      and away_score is null
    )
    or (
      status = 'COMPLETED'
      and home_score is not null
      and away_score is not null
    )
  )
);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  event_type public.match_event_type not null,
  minute smallint,
  created_at timestamptz not null default now(),
  constraint match_events_minute_chk check (minute is null or (minute >= 0 and minute <= 130))
);

create table if not exists public.finances (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  amount numeric(12, 2) not null,
  type public.finance_type not null,
  description text not null,
  created_at timestamptz not null default now(),
  constraint finances_amount_positive_chk check (amount > 0)
);

create table if not exists public.team_fund_months (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  month date not null,
  amount_per_member numeric(12, 2) not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_fund_months_unique unique (team_id, month),
  constraint team_fund_months_amount_non_negative check (amount_per_member >= 0)
);

create table if not exists public.team_fund_contributions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  month date not null,
  user_id uuid not null references public.users(id) on delete cascade,
  finance_entry_id uuid references public.finances(id) on delete set null,
  amount numeric(12, 2) not null default 0,
  is_paid boolean not null default false,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_fund_contributions_unique unique (team_id, month, user_id),
  constraint team_fund_contributions_amount_non_negative check (amount >= 0)
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  session_date date not null,
  team_a_roster jsonb not null default '[]'::jsonb,
  team_b_roster jsonb not null default '[]'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint practice_sessions_team_a_array_chk check (jsonb_typeof(team_a_roster) = 'array'),
  constraint practice_sessions_team_b_array_chk check (jsonb_typeof(team_b_roster) = 'array')
);

create table if not exists public.tactics (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams(id) on delete cascade,
  formation text not null,
  instructions text,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_members_team_id on public.team_members (team_id);
create index if not exists idx_team_members_user_id on public.team_members (user_id);
create index if not exists idx_invites_team_status on public.invitations_requests (team_id, status);
create index if not exists idx_invites_receiver_status on public.invitations_requests (receiver_id, status);
create index if not exists idx_matches_team_match_date on public.matches (team_id, match_date desc);
create index if not exists idx_match_events_match_id on public.match_events (match_id);
create index if not exists idx_match_events_user_id on public.match_events (user_id);
create index if not exists idx_finances_team_created_at on public.finances (team_id, created_at desc);
create index if not exists idx_team_fund_months_team_month on public.team_fund_months (team_id, month desc);
create index if not exists idx_team_fund_contributions_team_month on public.team_fund_contributions (team_id, month desc);
create index if not exists idx_team_fund_contributions_user on public.team_fund_contributions (user_id);
create index if not exists idx_practice_sessions_team_date on public.practice_sessions (team_id, session_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists trg_teams_set_updated_at on public.teams;
create trigger trg_teams_set_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

drop trigger if exists trg_matches_set_updated_at on public.matches;
create trigger trg_matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

drop trigger if exists trg_tactics_set_updated_at on public.tactics;
create trigger trg_tactics_set_updated_at
before update on public.tactics
for each row
execute function public.set_updated_at();

drop trigger if exists trg_team_fund_months_set_updated_at on public.team_fund_months;
create trigger trg_team_fund_months_set_updated_at
before update on public.team_fund_months
for each row
execute function public.set_updated_at();

drop trigger if exists trg_team_fund_contributions_set_updated_at on public.team_fund_contributions;
create trigger trg_team_fund_contributions_set_updated_at
before update on public.team_fund_contributions
for each row
execute function public.set_updated_at();

create or replace function public.is_admin(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target_user
      and u.system_role = 'ADMIN'
  );
$$;

create or replace function public.get_team_role(target_team_id uuid, target_user_id uuid default auth.uid())
returns public.team_role
language sql
stable
security definer
set search_path = public
as $$
  select tm.team_role
  from public.team_members tm
  where tm.team_id = target_team_id
    and tm.user_id = target_user_id
  limit 1;
$$;

create or replace function public.is_team_member(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
  );
$$;

create or replace function public.is_team_manager(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
      and tm.team_role in ('CAPTAIN', 'COACH')
  );
$$;

create or replace function public.is_team_finance_manager(target_team_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = target_user_id
      and tm.team_role in ('CAPTAIN', 'TREASURER')
  );
$$;

alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.invitations_requests enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.finances enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.tactics enable row level security;
alter table public.team_fund_months enable row level security;
alter table public.team_fund_contributions enable row level security;

drop policy if exists users_select_policy on public.users;
create policy users_select_policy
on public.users
for select
to authenticated
using (
  id = auth.uid() or public.is_admin()
);

drop policy if exists users_insert_policy on public.users;
create policy users_insert_policy
on public.users
for insert
to authenticated
with check (
  id = auth.uid()
);

drop policy if exists users_update_policy on public.users;
create policy users_update_policy
on public.users
for update
to authenticated
using (
  id = auth.uid() or public.is_admin()
)
with check (
  id = auth.uid() or public.is_admin()
);

drop policy if exists teams_select_policy on public.teams;
create policy teams_select_policy
on public.teams
for select
to authenticated
using (true);

drop policy if exists teams_insert_policy on public.teams;
create policy teams_insert_policy
on public.teams
for insert
to authenticated
with check (
  created_by = auth.uid()
);

drop policy if exists teams_update_policy on public.teams;
create policy teams_update_policy
on public.teams
for update
to authenticated
using (
  public.is_team_manager(id) or public.is_admin()
)
with check (
  public.is_team_manager(id) or public.is_admin()
);

drop policy if exists teams_delete_policy on public.teams;
create policy teams_delete_policy
on public.teams
for delete
to authenticated
using (
  public.is_team_manager(id) or public.is_admin()
);

drop policy if exists team_members_select_policy on public.team_members;
create policy team_members_select_policy
on public.team_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_team_member(team_id)
  or public.is_admin()
);

drop policy if exists team_members_insert_policy on public.team_members;
create policy team_members_insert_policy
on public.team_members
for insert
to authenticated
with check (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists team_members_update_policy on public.team_members;
create policy team_members_update_policy
on public.team_members
for update
to authenticated
using (
  public.is_team_manager(team_id)
  or public.is_admin()
)
with check (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists team_members_delete_policy on public.team_members;
create policy team_members_delete_policy
on public.team_members
for delete
to authenticated
using (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists invitations_select_policy on public.invitations_requests;
create policy invitations_select_policy
on public.invitations_requests
for select
to authenticated
using (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists invitations_insert_policy on public.invitations_requests;
create policy invitations_insert_policy
on public.invitations_requests
for insert
to authenticated
with check (
  (
    type = 'REQUEST'
    and sender_id = auth.uid()
  )
  or (
    type = 'INVITE'
    and sender_id = auth.uid()
    and public.is_team_manager(team_id)
  )
  or public.is_admin()
);

drop policy if exists invitations_update_policy on public.invitations_requests;
create policy invitations_update_policy
on public.invitations_requests
for update
to authenticated
using (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or public.is_team_manager(team_id)
  or public.is_admin()
)
with check (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists matches_select_policy on public.matches;
create policy matches_select_policy
on public.matches
for select
to authenticated
using (
  public.is_team_member(team_id)
  or public.is_admin()
);

drop policy if exists matches_insert_policy on public.matches;
create policy matches_insert_policy
on public.matches
for insert
to authenticated
with check (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists matches_update_policy on public.matches;
create policy matches_update_policy
on public.matches
for update
to authenticated
using (
  public.is_team_manager(team_id)
  or public.is_admin()
)
with check (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists matches_delete_policy on public.matches;
create policy matches_delete_policy
on public.matches
for delete
to authenticated
using (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists match_events_select_policy on public.match_events;
create policy match_events_select_policy
on public.match_events
for select
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_events.match_id
      and (public.is_team_member(m.team_id) or public.is_admin())
  )
);

drop policy if exists match_events_insert_policy on public.match_events;
create policy match_events_insert_policy
on public.match_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.matches m
    where m.id = match_events.match_id
      and (public.is_team_manager(m.team_id) or public.is_admin())
  )
);

drop policy if exists match_events_update_policy on public.match_events;
create policy match_events_update_policy
on public.match_events
for update
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_events.match_id
      and (public.is_team_manager(m.team_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.matches m
    where m.id = match_events.match_id
      and (public.is_team_manager(m.team_id) or public.is_admin())
  )
);

drop policy if exists match_events_delete_policy on public.match_events;
create policy match_events_delete_policy
on public.match_events
for delete
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = match_events.match_id
      and (public.is_team_manager(m.team_id) or public.is_admin())
  )
);

drop policy if exists finances_select_policy on public.finances;
create policy finances_select_policy
on public.finances
for select
to authenticated
using (
  public.is_team_member(team_id)
  or public.is_admin()
);

drop policy if exists finances_insert_policy on public.finances;
create policy finances_insert_policy
on public.finances
for insert
to authenticated
with check (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists finances_update_policy on public.finances;
create policy finances_update_policy
on public.finances
for update
to authenticated
using (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
)
with check (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists finances_delete_policy on public.finances;
create policy finances_delete_policy
on public.finances
for delete
to authenticated
using (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists team_fund_months_select_policy on public.team_fund_months;
create policy team_fund_months_select_policy
on public.team_fund_months
for select
to authenticated
using (
  public.is_team_member(team_id)
  or public.is_admin()
);

drop policy if exists team_fund_months_insert_policy on public.team_fund_months;
create policy team_fund_months_insert_policy
on public.team_fund_months
for insert
to authenticated
with check (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists team_fund_months_update_policy on public.team_fund_months;
create policy team_fund_months_update_policy
on public.team_fund_months
for update
to authenticated
using (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
)
with check (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists team_fund_months_delete_policy on public.team_fund_months;
create policy team_fund_months_delete_policy
on public.team_fund_months
for delete
to authenticated
using (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists team_fund_contributions_select_policy on public.team_fund_contributions;
create policy team_fund_contributions_select_policy
on public.team_fund_contributions
for select
to authenticated
using (
  public.is_team_member(team_id)
  or public.is_admin()
);

drop policy if exists team_fund_contributions_insert_policy on public.team_fund_contributions;
create policy team_fund_contributions_insert_policy
on public.team_fund_contributions
for insert
to authenticated
with check (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists team_fund_contributions_update_policy on public.team_fund_contributions;
create policy team_fund_contributions_update_policy
on public.team_fund_contributions
for update
to authenticated
using (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
)
with check (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists team_fund_contributions_delete_policy on public.team_fund_contributions;
create policy team_fund_contributions_delete_policy
on public.team_fund_contributions
for delete
to authenticated
using (
  public.is_team_finance_manager(team_id)
  or public.is_admin()
);

drop policy if exists practice_sessions_select_policy on public.practice_sessions;
create policy practice_sessions_select_policy
on public.practice_sessions
for select
to authenticated
using (
  public.is_team_member(team_id)
  or public.is_admin()
);

drop policy if exists practice_sessions_insert_policy on public.practice_sessions;
create policy practice_sessions_insert_policy
on public.practice_sessions
for insert
to authenticated
with check (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists practice_sessions_update_policy on public.practice_sessions;
create policy practice_sessions_update_policy
on public.practice_sessions
for update
to authenticated
using (
  public.is_team_manager(team_id)
  or public.is_admin()
)
with check (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists practice_sessions_delete_policy on public.practice_sessions;
create policy practice_sessions_delete_policy
on public.practice_sessions
for delete
to authenticated
using (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists tactics_select_policy on public.tactics;
create policy tactics_select_policy
on public.tactics
for select
to authenticated
using (
  public.is_team_member(team_id)
  or public.is_admin()
);

drop policy if exists tactics_insert_policy on public.tactics;
create policy tactics_insert_policy
on public.tactics
for insert
to authenticated
with check (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists tactics_update_policy on public.tactics;
create policy tactics_update_policy
on public.tactics
for update
to authenticated
using (
  public.is_team_manager(team_id)
  or public.is_admin()
)
with check (
  public.is_team_manager(team_id)
  or public.is_admin()
);

drop policy if exists tactics_delete_policy on public.tactics;
create policy tactics_delete_policy
on public.tactics
for delete
to authenticated
using (
  public.is_team_manager(team_id)
  or public.is_admin()
);

-- Optional seed admin (manual use in SQL editor):
-- update public.users set system_role = 'ADMIN' where email = 'admin@yourcompany.com';