-- Product access: who can enter the product area (/app).
--   * Admins: always.
--   * Testers: always (early access and, later, test versions of features).
--   * Everyone else: once the product is open, and only with an active subscription.

-- Per-person tester flag, toggled from /admin.
alter table public.profiles
  add column if not exists is_tester boolean not null default false;

-- Site-wide settings, one row per key. Server-only (RLS on, no policies).
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- product_access: "auto" opens the product at launch (Jan 1, 2027 00:00 UTC);
-- "open" and "closed" are manual overrides from /admin.
insert into public.app_settings (key, value)
values ('product_access', '"auto"'::jsonb)
on conflict (key) do nothing;
