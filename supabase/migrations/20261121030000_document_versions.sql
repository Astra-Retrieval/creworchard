-- ─────────────────────────────────────────────────────────────
-- Rich documents with version history
--
-- A document's current text now lives in `content` (the word processor's
-- structured format). Every save adds a row to document_versions, so any
-- past version can be read, compared, and restored. Restoring never deletes
-- history: it saves the old content again as a new version.
-- Server-only, like every other product table (RLS on, no policies).
-- ─────────────────────────────────────────────────────────────

alter table public.documents
  add column if not exists content jsonb,                           -- null until first saved in the word processor
  add column if not exists head_version integer not null default 0; -- number of the latest saved version (0 = never saved)

create table if not exists public.document_versions (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null,
  project_id     uuid not null,
  version        integer not null check (version >= 1),
  title          text not null check (char_length(title) between 1 and 160),
  content        jsonb not null,
  message        text check (message is null or char_length(message) <= 200),  -- what changed, in the author's words
  restored_from  integer,                                                     -- set when this version restores an older one
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  -- One row per version number: two people saving at once can't both become "version 5".
  unique (document_id, version),
  foreign key (project_id, document_id) references public.documents (project_id, id) on delete cascade
);
create index if not exists document_versions_project_document_idx on public.document_versions (project_id, document_id);
create index if not exists document_versions_created_by_idx on public.document_versions (created_by);
alter table public.document_versions enable row level security;
