-- ─────────────────────────────────────────────────────────────
-- Crew Orchard: waitlist and early-bird accounts
-- ─────────────────────────────────────────────────────────────

-- Waitlist: people who want the $15/seat code at launch. No auth account.
create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  full_name     text not null,
  organization  text,
  use_case      text not null check (use_case in ('commercial', 'academic', 'hobby', 'government', 'other')),
  seats         integer not null default 1 check (seats between 1 and 10000),
  notes         text,
  invite_code   text unique,          -- issued at launch
  invited_at    timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));

-- RLS on with no policies: only the service role (server) can read or write.
alter table public.waitlist enable row level security;

-- Profiles: one per auth user. Early-bird members and admins.
create table if not exists public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  email                   text not null,
  full_name               text,
  organization            text,
  role                    text not null default 'member' check (role in ('member', 'admin')),
  plan                    text not null default 'early_bird',
  seats                   integer not null default 1 check (seats between 1 and 10000),
  member_number           bigint generated always as identity,
  subscription_status     text,       -- mirrors Stripe: trialing, active, canceled, ...
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Members can read their own row. All writes go through the server (service role),
-- so nobody can promote themselves to admin or fake a subscription status.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

-- Create a profile whenever an auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, organization, seats)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'organization',
    greatest(1, coalesce((new.raw_user_meta_data ->> 'seats')::int, 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- To make yourself an admin after creating your account:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
