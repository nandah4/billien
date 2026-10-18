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

-- Active Recall: append-only log of graded attempts. `expected` is stored so
-- statistics and audits do not depend on dictionary data that can change.
create table if not exists public.recall_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  user_word_id uuid not null references public.user_words(id) on delete cascade,
  mode text not null check (mode in ('translation', 'definition', 'cloze', 'choice')),
  outcome text not null check (outcome in ('correct', 'almost', 'wrong', 'revealed')),
  response text,
  expected text not null,
  duration_ms integer check (duration_ms >= 0 and duration_ms <= 600000),
  used_hint boolean not null default false,
  overridden boolean not null default false,
  client_attempt_id text,
  created_at timestamptz not null default now()
);

create index if not exists recall_attempts_user_created_idx
  on public.recall_attempts (user_id, created_at desc);

create index if not exists recall_attempts_user_word_idx
  on public.recall_attempts (user_word_id, created_at desc);

-- Retrying a request must not count the same attempt twice.
create unique index if not exists recall_attempts_client_idx
  on public.recall_attempts (user_id, client_attempt_id)
  where client_attempt_id is not null;

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
