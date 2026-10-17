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
  unique (user_id, vocabulary_word_id)
);

create index if not exists user_words_user_added_idx on public.user_words (user_id, added_at desc);

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
