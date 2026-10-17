# Roadmap

Status of the dictionary v2 execution in [`plan-dictionary-v2.md`](./plan-dictionary-v2.md).

## Done

### Foundation

- [x] **A-01** New `Entry` / `Sense` / `DictionaryResult` / `SavedWord` types.
- [x] **A-02** Additive migration (`entries`, `translations`, `forms`, `source`, `entries_fetched_at`, `user_preferences`), applied twice to verify idempotency.
- [x] **A-03** `lookupWord` against `freedictionaryapi.com` with timeout, cache, and typed transport errors.
- [x] **A-04** Normalizer with dedupe, caps, `subsenses` removal, and language projection.
- [x] **A-05** Preference resolution: account → guest cookie → `id`.

### API

- [x] **B-01** `GET /api/dictionary/[word]` with `?lang=` / `?lang=all`.
- [x] **B-02** `POST /api/words` writes the normalized shape; duplicates stay untouched.
- [x] **B-03** `GET /api/words` projects the preferred language.
- [x] **B-04** `GET /api/words/[id]` returns every language and enforces ownership.
- [x] **B-05** `GET/PATCH /api/preferences` with a supported-language whitelist.
- [x] **B-06** Legacy rows are re-fetched once on first detail open (`fillWordEntries`).
- [x] **B-07** `DELETE /api/words/[id]` removes only `user_words`; streak history is preserved.

### Preferences & profile

- [x] **C-01** First-login language modal (save or skip, both mark onboarding complete).
- [x] **C-02** `/profile` with language form, account summary, streak, and sign out.
- [x] **C-03** Profile item in the account menu.

### Detail UI

- [x] **D-01** Readers migrated from `meanings[]` to `entries[].senses[]`.
- [x] **D-02** Detail header: word, IPA, POS chips, Listen.
- [x] **D-03** Translation-first block with collapsible English definitions.
- [x] **D-04** Forms, examples, synonyms, and antonyms.
- [x] **D-05** Memorised status, review history, inline un-save confirmation.
- [x] **D-06** Source URL and license.
- [x] **D-07** `speechSynthesis` audio (no network, no provider audio URLs).

### Remembered

- [x] **F-01** Translation-first rows with English definition as a secondary line.
- [x] **F-02** Search by English or translation, POS filters, sorting.
- [x] **F-03** Optimistic un-save with rollback and inline confirmation.
- [x] **F-04** Detail fetches all languages via `GET /api/words/[id]`.
- [x] **F-05** Skeleton, empty, filtered-empty, error, and sign-in states.
- [x] **F-06** Drills scoped to the active filter result (`?ids=`).

### Cleanup

- [x] **E-01** Legacy columns backfilled (4/4 rows) and dropped; dead routes removed.
- [x] **E-02** `node --test` coverage for normalizer, projection, filters, pagination, language, and streak.
- [x] **E-03** README and this roadmap updated.

## Expected next

- Browser QA on Chrome/Safari for `speechSynthesis` voices and the modal focus trap.
- Add more selectable languages to `lib/language.ts` once translations are verified for them.
- Consider a `translations` GIN index if the saved-word volume grows enough to justify translation search in SQL (currently client-side).
- Optional: persist Remembered sort/filter in the URL so the view is shareable.
