create extension if not exists pgcrypto;

create table if not exists public.vocabulary_words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  normalized_word text not null unique,
  phonetic text,
  entries jsonb not null default '[]'::jsonb,
  translations jsonb not null default '{}'::jsonb,
  forms jsonb not null default '[]'::jsonb,
  source jsonb,
  entries_fetched_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  vocabulary_word_id uuid not null references public.vocabulary_words(id) on delete cascade,
  added_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  review_count integer not null default 0 check (review_count >= 0),
  remembered_count integer not null default 0 check (remembered_count >= 0),
  forgotten_count integer not null default 0 check (forgotten_count >= 0),
  recall_streak integer not null default 0,
  recall_lapses integer not null default 0,
  recall_due_at timestamptz,
  last_recalled_at timestamptz,
  unique (user_id, vocabulary_word_id)
);

create index if not exists user_words_user_added_idx on public.user_words (user_id, added_at desc);

create index if not exists user_words_recall_due_idx on public.user_words (user_id, recall_due_at);

-- Recall: one fact row per finished session. Accuracy is derived, never stored.
create table if not exists public.recall_sessions (
  id uuid primary key,
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  scope text not null check (scope in ('due', 'all', 'weak')),
  mode text not null check (mode in ('auto', 'translation', 'definition', 'cloze', 'choice')),
  requested_size integer not null check (requested_size between 1 and 500),
  card_count integer not null check (card_count >= 1),
  correct_count integer not null default 0 check (correct_count >= 0),
  almost_count integer not null default 0 check (almost_count >= 0),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  duration_ms integer check (duration_ms between 0 and 86400000),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  client_session_id text,
  created_at timestamptz not null default now(),
  constraint recall_sessions_counts_sum
    check (correct_count + almost_count + wrong_count = card_count)
);

create unique index if not exists recall_sessions_client_idx
  on public.recall_sessions (user_id, client_session_id)
  where client_session_id is not null;

create index if not exists recall_sessions_user_finished_idx
  on public.recall_sessions (user_id, finished_at desc);

-- One row per answered card. `expected` and `word` are snapshots so the fact
-- survives a dictionary refresh or an un-save.
create table if not exists public.recall_session_items (
  id uuid primary key,
  session_id uuid not null references public.recall_sessions(id) on delete cascade,
  user_word_id uuid references public.user_words(id) on delete set null,
  position integer not null check (position >= 0),
  mode text not null check (mode in ('translation', 'definition', 'cloze', 'choice')),
  outcome text not null check (outcome in ('correct', 'almost', 'wrong')),
  response text,
  expected text not null,
  word text not null,
  duration_ms integer check (duration_ms between 0 and 600000),
  used_hint boolean not null default false,
  overridden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, position)
);

create index if not exists recall_session_items_word_idx
  on public.recall_session_items (user_word_id, created_at desc);

create table if not exists public.user_streaks (
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  activity_date date not null,
  learned_count integer not null default 0 check (learned_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references neon_auth."user"(id) on delete cascade,
  translation_language text not null default 'id',
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

-- AI translation fallback (InferHub). Dictionary data always wins; this cache
-- only fills gaps, including words that were searched but never saved.
create table if not exists public.ai_translations (
  normalized_word text not null,
  language text not null,
  words text[] not null default '{}',
  sense_index integer not null default 0,
  model text not null,
  prompt_version integer not null default 1,
  confidence numeric,
  status text not null default 'done' check (status in ('pending', 'done', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (normalized_word, language)
);

create index if not exists ai_translations_language_status_idx
  on public.ai_translations (language, status);
