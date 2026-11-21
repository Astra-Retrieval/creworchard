-- ─────────────────────────────────────────────────────────────
-- Hierarchy, canvas detail, documents, and bills of materials
--
--   organization  owner → admins → members (each member holds a seat)
--   project       lead → systems engineers → contributors → viewers
--   sub-system    the people assigned to it, a note, and a color
--   integration   two or more sub-systems, plus people from them
--
-- The chain is enforced by foreign keys: a project member must be an
-- organization member, and a sub-system or integration member must be a
-- project member. Removing someone higher up removes them below as well.
-- Every table is server-only (RLS on, no policies), as before.
-- ─────────────────────────────────────────────────────────────

-- ── Organization owner ───────────────────────────────────────
alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'member'));

-- Whoever created an organization owns it. (Before this migration they were its first admin.)
update public.organization_members m
set role = 'owner'
from public.organizations o
where o.id = m.organization_id
  and o.created_by = m.user_id
  and not exists (
    select 1 from public.organization_members x
    where x.organization_id = m.organization_id and x.role = 'owner'
  );

create unique index if not exists organization_members_one_owner
  on public.organization_members (organization_id) where role = 'owner';

-- ── Project team ─────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_id_organization_id_key') then
    alter table public.projects add constraint projects_id_organization_id_key unique (id, organization_id);
  end if;
end $$;

create table if not exists public.project_members (
  project_id       uuid not null,
  organization_id  uuid not null,
  user_id          uuid not null,
  role             text not null default 'contributor'
                   check (role in ('lead', 'systems_engineer', 'contributor', 'viewer')),
  created_at       timestamptz not null default now(),
  primary key (project_id, user_id),
  foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  foreign key (organization_id, user_id)
    references public.organization_members (organization_id, user_id) on delete cascade
);
create index if not exists project_members_org_user_idx on public.project_members (organization_id, user_id);
create index if not exists project_members_project_org_idx on public.project_members (project_id, organization_id);
alter table public.project_members enable row level security;

-- Existing projects: their creator leads them.
insert into public.project_members (project_id, organization_id, user_id, role)
select p.id, p.organization_id, p.created_by, 'lead'
from public.projects p
join public.organization_members m on m.organization_id = p.organization_id and m.user_id = p.created_by
on conflict do nothing;

-- ── Sub-systems: a note, a color, and people ─────────────────
alter table public.subsystems
  add column if not exists note text check (note is null or char_length(note) <= 280),
  add column if not exists color text not null default 'mint'
    check (color in ('mint', 'blue', 'violet', 'gold', 'coral'));

create table if not exists public.subsystem_members (
  subsystem_id  uuid not null,
  project_id    uuid not null,
  user_id       uuid not null,
  created_at    timestamptz not null default now(),
  primary key (subsystem_id, user_id),
  foreign key (project_id, subsystem_id) references public.subsystems (project_id, id) on delete cascade,
  foreign key (project_id, user_id) references public.project_members (project_id, user_id) on delete cascade
);
create index if not exists subsystem_members_project_user_idx on public.subsystem_members (project_id, user_id);
create index if not exists subsystem_members_project_subsystem_idx on public.subsystem_members (project_id, subsystem_id);
alter table public.subsystem_members enable row level security;

-- ── Integrations: two or more sub-systems, and people ────────
-- An integration used to link exactly two sub-systems (source and target).
-- It now links any number through integration_subsystems.
create table if not exists public.integration_subsystems (
  integration_id  uuid not null,
  project_id      uuid not null,
  subsystem_id    uuid not null,
  primary key (integration_id, subsystem_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'integrations_project_id_id_key') then
    alter table public.integrations add constraint integrations_project_id_id_key unique (project_id, id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'integrations' and column_name = 'source_id'
  ) then
    insert into public.integration_subsystems (integration_id, project_id, subsystem_id)
    select id, project_id, source_id from public.integrations
    union
    select id, project_id, target_id from public.integrations
    on conflict do nothing;
    drop index if exists public.integrations_pair_key;
    alter table public.integrations drop column source_id, drop column target_id;
  end if;
end $$;

alter table public.integration_subsystems drop constraint if exists integration_subsystems_integration_fkey;
alter table public.integration_subsystems add constraint integration_subsystems_integration_fkey
  foreign key (project_id, integration_id) references public.integrations (project_id, id) on delete cascade;
alter table public.integration_subsystems drop constraint if exists integration_subsystems_subsystem_fkey;
alter table public.integration_subsystems add constraint integration_subsystems_subsystem_fkey
  foreign key (project_id, subsystem_id) references public.subsystems (project_id, id) on delete cascade;
create index if not exists integration_subsystems_project_integration_idx on public.integration_subsystems (project_id, integration_id);
create index if not exists integration_subsystems_project_subsystem_idx on public.integration_subsystems (project_id, subsystem_id);
alter table public.integration_subsystems enable row level security;

update public.integrations set name = 'Integration' where name is null;
alter table public.integrations alter column name set not null;

create table if not exists public.integration_members (
  integration_id  uuid not null,
  project_id      uuid not null,
  user_id         uuid not null,
  created_at      timestamptz not null default now(),
  primary key (integration_id, user_id),
  foreign key (project_id, integration_id) references public.integrations (project_id, id) on delete cascade,
  foreign key (project_id, user_id) references public.project_members (project_id, user_id) on delete cascade
);
create index if not exists integration_members_project_user_idx on public.integration_members (project_id, user_id);
create index if not exists integration_members_project_integration_idx on public.integration_members (project_id, integration_id);
alter table public.integration_members enable row level security;

-- ── Documents ────────────────────────────────────────────────
-- A document lives in the project-wide drive (both scope columns null), or
-- in one sub-system's drive, or in one integration's drive.
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  subsystem_id    uuid,
  integration_id  uuid,
  title           text not null check (char_length(title) between 1 and 160),
  body            text not null default '' check (char_length(body) <= 200000),
  created_by      uuid references auth.users (id) on delete set null,
  updated_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, id),
  check (subsystem_id is null or integration_id is null),
  foreign key (project_id, subsystem_id) references public.subsystems (project_id, id) on delete cascade,
  foreign key (project_id, integration_id) references public.integrations (project_id, id) on delete cascade
);
create index if not exists documents_project_idx on public.documents (project_id, updated_at desc);
create index if not exists documents_subsystem_idx on public.documents (project_id, subsystem_id);
create index if not exists documents_integration_idx on public.documents (project_id, integration_id);
create index if not exists documents_created_by_idx on public.documents (created_by);
create index if not exists documents_updated_by_idx on public.documents (updated_by);
alter table public.documents enable row level security;

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- Documents a sub-system's team has pinned to its sidebar on the canvas.
create table if not exists public.subsystem_pins (
  subsystem_id  uuid not null,
  document_id   uuid not null,
  project_id    uuid not null,
  created_at    timestamptz not null default now(),
  primary key (subsystem_id, document_id),
  foreign key (project_id, subsystem_id) references public.subsystems (project_id, id) on delete cascade,
  foreign key (project_id, document_id) references public.documents (project_id, id) on delete cascade
);
create index if not exists subsystem_pins_project_subsystem_idx on public.subsystem_pins (project_id, subsystem_id);
create index if not exists subsystem_pins_project_document_idx on public.subsystem_pins (project_id, document_id);
alter table public.subsystem_pins enable row level security;

-- ── Bills of materials ───────────────────────────────────────
-- Lines belong to a sub-system. The project BoM is every sub-system's lines together.
create table if not exists public.bom_items (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  subsystem_id  uuid not null,
  part_number   text not null default '' check (char_length(part_number) <= 80),
  description   text not null check (char_length(description) between 1 and 200),
  quantity      numeric(12, 3) not null default 1 check (quantity >= 0),
  unit_cost     numeric(12, 2) not null default 0 check (unit_cost >= 0),
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  foreign key (project_id, subsystem_id) references public.subsystems (project_id, id) on delete cascade
);
create index if not exists bom_items_project_subsystem_idx on public.bom_items (project_id, subsystem_id, created_at);
create index if not exists bom_items_created_by_idx on public.bom_items (created_by);
alter table public.bom_items enable row level security;

-- Indexes for foreign keys added by the previous migration.
create index if not exists organizations_created_by_idx on public.organizations (created_by);
create index if not exists projects_created_by_idx on public.projects (created_by);
create index if not exists subsystems_created_by_idx on public.subsystems (created_by);
create index if not exists integrations_created_by_idx on public.integrations (created_by);
create index if not exists integrations_project_idx on public.integrations (project_id, created_at);
