-- AI translation fallback (InferHub).
--
-- A separate cache keyed by (normalized_word, language) so it also covers words
-- that were only searched and never saved. Dictionary data always wins; this
-- table only fills the gaps and records why a generation failed.

create table if not exists public.ai_translations (
  normalized_word text not null,
  language        text not null,
  words           text[] not null default '{}',
  sense_index     integer not null default 0,
  model           text not null,
  prompt_version  integer not null default 1,
  confidence      numeric,
  status          text not null default 'done'
                    check (status in ('pending', 'done', 'failed')),
  attempts        integer not null default 0 check (attempts >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (normalized_word, language)
);

-- Lets the Remembered list fetch cached translations for a page of words in one
-- query.
create index if not exists ai_translations_language_status_idx
  on public.ai_translations (language, status);
