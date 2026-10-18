# Billien

Billien is a multi-user English vocabulary app. Anyone can search an English word as a guest; Google sign-in makes Remembered words, translation preferences, and the daily streak personal to a verified account.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Add the Neon `DATABASE_URL`, the branch's `NEON_AUTH_BASE_URL`, a random `NEON_AUTH_COOKIE_SECRET` (at least 32 characters), and the `INFERHUB_API_KEY` used for AI translation fallback.
3. Apply the database schema. For a fresh database run [`neon/schema.sql`](./neon/schema.sql); for an existing one apply [`neon/migrations/001_dictionary_v2.sql`](./neon/migrations/001_dictionary_v2.sql), then run the backfill below, then apply [`neon/migrations/002_drop_legacy_dictionary.sql`](./neon/migrations/002_drop_legacy_dictionary.sql) and [`neon/migrations/003_ai_translations.sql`](./neon/migrations/003_ai_translations.sql).
4. In Neon Console → **Auth**, enable the Google provider and disable the Email/Password provider. If Neon asks for Google OAuth credentials, create the OAuth client in Google Cloud Console and copy the redirect URI shown by Neon exactly into that client.
5. Add `http://localhost:3000` and the production origin to Neon Auth's trusted domains. Add `http://localhost:3001` too when port 3000 is occupied locally.
6. Install and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Backfilling pre-v2 words

Words saved before the dictionary migration have an empty `entries` array. Fill them once before dropping the legacy columns:

```bash
node scripts/backfill-dictionary-v2.mjs
```

The script is idempotent and only touches rows with `jsonb_array_length(entries) = 0`.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test
```

## Architecture

- **Dictionary source.** `lib/dictionary.ts` calls `https://freedictionaryapi.com/api/v1/entries/en/{word}?translations=true` with an 8-second timeout and a 7-day fetch cache. `lib/normalize.ts` deduplicates and caps the payload (8 senses per entry, 3 translations per language per sense, 5 examples, 12 forms) and drops recursive `subsenses`.
- **Storage.** `vocabulary_words` keeps the normalized `entries`, a global `translations` map, `forms`, and `source`. Every language is stored; list responses project to the signed-in user's preferred language and detail responses return all languages.
- **Pages.** `/` is Discovery, `/remembered` is the saved-word view, and `/profile` is account settings. The two word views share chrome through `app/(app)/layout.tsx` → `components/app/app-shell.tsx` (session, header, bottom navigation, account dialogs, onboarding). Each page renders only its own view component, and the active tab is derived from the pathname.
- **Preferences.** `user_preferences` stores `translation_language` (`id`, `en`, `es`; default `id`) and `onboarded_at`. `GET/PATCH /api/preferences` is session-scoped; guests fall back to the `billien_lang` cookie and then to `id`. The onboarding modal appears once per account, and `/profile` lets the user change the language later.
- **AI translation fallback.** The dictionary does not translate every word (for example `eat` has none). `lib/ai.ts` calls InferHub and `lib/ai-translations.ts` fills the gap, cached in `ai_translations` keyed by `(normalized_word, language)`. Dictionary data always wins; AI output only fills empty senses, is validated (max 3 lowercase words, confidence ≥ 0.6, headword echo rejected), and is labelled `AI` in the detail panel. A per-row atomic claim means each word/language pair costs at most one generation, with a 3-attempt cap, a 90-second stale-pending reclaim, and a circuit breaker after five consecutive failures. Set `INFERHUB_API_KEY` to enable it; without the key every call is a no-op and the English definition is shown instead.
- **Routes.** `GET /api/dictionary/[word]` (supports `?lang=` and `?lang=all`), `GET/POST /api/words`, `GET/DELETE /api/words/[id]`, `POST /api/words/[id]/review`, `GET /api/review` (supports `?ids=`), `GET /api/streak`, and `GET/PATCH /api/preferences`. The review endpoints are kept for the planned Active Recall feature; the flashcard drill UI was removed.
- **Detail panel.** Translation-first: the preferred language is the primary block, English definitions live in a collapsible `<details>`, and pronunciation uses the browser's `speechSynthesis` (the provider has no audio URLs).
- **Remembered view.** Rows show the preferred translation, search matches English or translation, and sorting applies. Un-save is optimistic and lives only on the list row.
- **Shared hooks.** `hooks/use-word-library.ts` (read), `hooks/use-word-actions.ts` (save, un-save, review, with cache invalidation), `hooks/use-debounced-value.ts` (search), and `hooks/use-media-query.ts` (desktop column vs mobile dialog).
- **Profile.** `/profile` follows an OS-settings layout: banner with avatar initial, then grouped white cards for account details, translation language (applies on tap), progress, and sign out. On mobile it is the only place to sign out.

The browser talks only to Next.js API routes and the Neon Auth proxy. [`proxy.ts`](./proxy.ts) exchanges the OAuth callback verifier for the app's first-party session cookie. `DATABASE_URL` and `NEON_AUTH_COOKIE_SECRET` stay server-only and must never use the `NEXT_PUBLIC_` prefix. Data routes derive the user ID from the server-side session, so one account cannot access another account's saved words, reviews, preferences, or streak.
