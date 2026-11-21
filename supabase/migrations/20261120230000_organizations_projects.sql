-- ─────────────────────────────────────────────────────────────
-- Product wiring: organizations → projects → sub-systems and integrations
--
-- Every table here is server-only: RLS is on with no policies, so only the
-- service role can read or write. The server checks organization membership
-- and permissions (src/lib/orgs.ts, src/lib/org-rules.ts) before every query.
-- ─────────────────────────────────────────────────────────────

-- An organization is the top-level workspace people sign in to.
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- Who belongs to an organization, and what they may do there.
--   role         'admin' has every permission; 'member' has only those listed.
--   permissions  permission keys granted by an admin (see ORG_PERMISSIONS in
--                src/lib/org-rules.ts), for example 'projects.create'.
create table if not exists public.organization_members (
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  role             text not null default 'member' check (role in ('admin', 'member')),
  permissions      text[] not null default '{}',
  created_at       timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index if not exists organization_members_user_id_idx on public.organization_members (user_id);
alter table public.organization_members enable row level security;

-- A project belongs to one organization.
create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 120),
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists projects_organization_id_idx on public.projects (organization_id, created_at);
alter table public.projects enable row level security;

-- A sub-system is a box on a project's canvas. x and y are its canvas position.
create table if not exists public.subsystems (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  x           integer not null default 0,
  y           integer not null default 0,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (project_id, id)  -- lets integrations prove both ends are in the same project
);
create index if not exists subsystems_project_id_idx on public.subsystems (project_id, created_at);
alter table public.subsystems enable row level security;

-- An integration is a link between two different sub-systems of the same project.
create table if not exists public.integrations (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  source_id   uuid not null,
  target_id   uuid not null,
  name        text check (name is null or char_length(name) between 1 and 120),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (source_id <> target_id),
  foreign key (project_id, source_id) references public.subsystems (project_id, id) on delete cascade,
  foreign key (project_id, target_id) references public.subsystems (project_id, id) on delete cascade
);
-- One integration per pair of sub-systems, whichever way round it was drawn.
create unique index if not exists integrations_pair_key
  on public.integrations (project_id, least(source_id, target_id), greatest(source_id, target_id));
create index if not exists integrations_source_id_idx on public.integrations (source_id);
create index if not exists integrations_target_id_idx on public.integrations (target_id);
alter table public.integrations enable row level security;

-- Feature requests and questions sent from inside the product land in the same
-- inbox as contact-form messages (/admin → Messages), under two new topics.
alter table public.contact_messages drop constraint if exists contact_messages_topic_check;
alter table public.contact_messages add constraint contact_messages_topic_check
  check (topic in ('general', 'billing', 'support', 'partnership', 'press', 'feature_request', 'question'));
