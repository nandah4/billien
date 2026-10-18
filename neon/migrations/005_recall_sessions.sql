-- Recall sessions.
--
-- Replaces the per-answer log from `004_active_recall.sql`. A session is one
-- fact row; its answers are normalised rows in `recall_session_items`. The
-- schedule columns added by `004` (`recall_streak`, `recall_lapses`,
-- `recall_due_at`, `last_recalled_at`) are unchanged: those are state, not
-- facts.
--
-- The old `recall_attempts` table is dropped. It only held development data
-- (10 rows) and the feature had not shipped, so no backfill is needed.

drop table if exists public.recall_attempts;

-- One row per finished session. Accuracy is deliberately not stored: it is a
-- derived value, and a third source of truth would drift.
create table if not exists public.recall_sessions (
  id                uuid primary key,
  user_id           uuid not null references neon_auth."user"(id) on delete cascade,
  scope             text not null
                      check (scope in ('due', 'all', 'weak')),
  mode              text not null
                      check (mode in ('auto', 'translation', 'definition', 'cloze', 'choice')),
  requested_size    integer not null check (requested_size between 1 and 500),
  card_count        integer not null check (card_count >= 1),
  correct_count     integer not null default 0 check (correct_count >= 0),
  almost_count      integer not null default 0 check (almost_count >= 0),
  wrong_count       integer not null default 0 check (wrong_count >= 0),
  duration_ms       integer check (duration_ms between 0 and 86400000),
  started_at        timestamptz not null,
  finished_at       timestamptz not null default now(),
  client_session_id text,
  created_at        timestamptz not null default now(),
  constraint recall_sessions_counts_sum
    check (correct_count + almost_count + wrong_count = card_count)
);

create unique index if not exists recall_sessions_client_idx
  on public.recall_sessions (user_id, client_session_id)
  where client_session_id is not null;

create index if not exists recall_sessions_user_finished_idx
  on public.recall_sessions (user_id, finished_at desc);

-- One row per answered card. `expected` and `word` are snapshots so the fact
-- survives a dictionary refresh or an un-save; `user_word_id` is nulled rather
-- than cascaded for the same reason.
create table if not exists public.recall_session_items (
  id           uuid primary key,
  session_id   uuid not null references public.recall_sessions(id) on delete cascade,
  user_word_id uuid references public.user_words(id) on delete set null,
  position     integer not null check (position >= 0),
  mode         text not null
                 check (mode in ('translation', 'definition', 'cloze', 'choice')),
  outcome      text not null
                 check (outcome in ('correct', 'almost', 'wrong')),
  response     text,
  expected     text not null,
  word         text not null,
  duration_ms  integer check (duration_ms between 0 and 600000),
  used_hint    boolean not null default false,
  overridden   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (session_id, position)
);

create index if not exists recall_session_items_word_idx
  on public.recall_session_items (user_word_id, created_at desc);
