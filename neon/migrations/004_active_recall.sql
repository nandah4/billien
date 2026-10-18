-- Active Recall.
--
-- Additive and idempotent: it can be applied to a database that already has the
-- dictionary v2 schema, and re-running it changes nothing.
--
-- `recall_due_at IS NULL` means "never practised", so every word saved before
-- this migration enters the queue without a backfill.

alter table public.user_words
  add column if not exists recall_streak integer not null default 0,
  add column if not exists recall_lapses integer not null default 0,
  add column if not exists recall_due_at timestamptz,
  add column if not exists last_recalled_at timestamptz;

-- Append-only log. It is the source of truth for accuracy and weak words, and
-- it stores `expected` so an audit does not depend on dictionary data that can
-- change later.
create table if not exists public.recall_attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references neon_auth."user"(id) on delete cascade,
  user_word_id      uuid not null references public.user_words(id) on delete cascade,
  mode              text not null
                      check (mode in ('translation', 'definition', 'cloze', 'choice')),
  outcome           text not null
                      check (outcome in ('correct', 'almost', 'wrong', 'revealed')),
  response          text,
  expected          text not null,
  duration_ms       integer
                      check (duration_ms >= 0 and duration_ms <= 600000),
  used_hint         boolean not null default false,
  overridden        boolean not null default false,
  client_attempt_id text,
  created_at        timestamptz not null default now()
);

create index if not exists recall_attempts_user_created_idx
  on public.recall_attempts (user_id, created_at desc);

create index if not exists recall_attempts_user_word_idx
  on public.recall_attempts (user_word_id, created_at desc);

create index if not exists user_words_recall_due_idx
  on public.user_words (user_id, recall_due_at);

-- Retrying a request must not count the same attempt twice.
create unique index if not exists recall_attempts_client_idx
  on public.recall_attempts (user_id, client_attempt_id)
  where client_attempt_id is not null;
