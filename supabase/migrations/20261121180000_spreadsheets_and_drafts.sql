-- ─────────────────────────────────────────────────────────────
-- Spreadsheets, and autosaved drafts
--
-- A document is now either a written document ('doc') or a spreadsheet
-- ('sheet'). Both use the same drives, version history, and restore.
--
-- Autosave keeps each person's unsaved work in document_drafts, one row per
-- person per document. A draft is not a version: it becomes one when that
-- person saves, and is then removed. Server-only (RLS on, no policies).
-- ─────────────────────────────────────────────────────────────

alter table public.documents
  add column if not exists kind text not null default 'doc' check (kind in ('doc', 'sheet'));

create table if not exists public.document_drafts (
  document_id   uuid not null,
  project_id    uuid not null,
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 160),
  content       jsonb not null,
  base_version  integer not null default 0,  -- the saved version this draft was started from
  updated_at    timestamptz not null default now(),
  primary key (document_id, user_id),
  foreign key (project_id, document_id) references public.documents (project_id, id) on delete cascade
);
create index if not exists document_drafts_project_document_idx on public.document_drafts (project_id, document_id);
create index if not exists document_drafts_user_idx on public.document_drafts (user_id);
alter table public.document_drafts enable row level security;
