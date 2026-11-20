-- Messages sent through the site's contact form (home page and member dashboard).
-- RLS on with no policies: only the server (service role) can read or write.
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 254),
  topic       text not null default 'general' check (topic in ('general', 'billing', 'support', 'partnership', 'press')),
  message     text not null check (char_length(message) between 1 and 4000),
  user_id     uuid references auth.users (id) on delete set null,  -- set when sent by a signed-in member
  handled_at  timestamptz                                           -- set when marked handled in /admin
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_created_idx on public.contact_messages (lower(email), created_at desc);
create index if not exists contact_messages_user_id_idx on public.contact_messages (user_id);

alter table public.contact_messages enable row level security;
