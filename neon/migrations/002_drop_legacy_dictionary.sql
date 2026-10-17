-- Removes the pre-v2 dictionary columns. Run only after
-- scripts/backfill-dictionary-v2.mjs reports zero rows with empty `entries`.

alter table public.vocabulary_words
  drop column if exists meanings,
  drop column if exists phonetics,
  drop column if exists license,
  drop column if exists source_urls,
  drop column if exists api_entries;
