-- Dictionary v2: additive migration. Safe to run more than once.

alter table public.vocabulary_words
  add column if not exists entries jsonb not null default '[]'::jsonb,
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists forms jsonb not null default '[]'::jsonb,
  add column if not exists source jsonb,
  add column if not exists entries_fetched_at timestamptz;

create table if not exists public.user_preferences (
  user_id uuid primary key references neon_auth."user"(id) on delete cascade,
  translation_language text not null default 'id',
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);
