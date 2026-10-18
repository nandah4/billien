# Billien

Billien is a multi-user English vocabulary app. Anyone can search an English word as a guest; Google sign-in makes Remembered words, translation preferences, and the daily streak personal to a verified account.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Fill in the values. Every variable is server-only, so none may use the `NEXT_PUBLIC_` prefix:
   - `DATABASE_URL` — the Neon connection string.
   - `NEON_AUTH_BASE_URL` — the branch's auth URL.
   - `NEON_AUTH_COOKIE_SECRET` — a random secret, at least 32 characters.
   - `DICTIONARY_BASE_URL` — the dictionary entries endpoint. The word and `?translations=true` are appended to it.
   - `INFERHUB_API_KEY` — enables the AI translation fallback.
   - `INFERHUB_BASE_URL` and `INFERHUB_MODEL` — the provider endpoint and model. Required when a key is present.
   - Optional: `DICTIONARY_TIMEOUT_MS` (default 8000) and `INFERHUB_TIMEOUT_MS` (default 15000).

   Endpoints and models live in the environment rather than in code, so a provider change is a configuration change and the repository does not name the infrastructure it talks to. `lib/env.ts` is the only module that reads `process.env`; each variable is listed there statically, validated lazily on first use, and a missing or malformed value fails with a message naming it.

3. Apply the database schema. For a fresh database run [`neon/schema.sql`](./neon/schema.sql); for an existing one apply [`neon/migrations/001_dictionary_v2.sql`](./neon/migrations/001_dictionary_v2.sql), then run the backfill below, then apply [`neon/migrations/002_drop_legacy_dictionary.sql`](./neon/migrations/002_drop_legacy_dictionary.sql), [`neon/migrations/003_ai_translations.sql`](./neon/migrations/003_ai_translations.sql), and [`neon/migrations/004_active_recall.sql`](./neon/migrations/004_active_recall.sql).
4. In Neon Console → **Auth**, enable the Google provider and disable the Email/Password provider. If Neon asks for Google OAuth credentials, create the OAuth client in Google Cloud Console and copy the redirect URI shown by Neon exactly into that client.
5. Add `http://localhost:3000` and the production origin to Neon Auth's trusted domains. Add `http://localhost:3001` too when port 3000 is occupied locally. Preview deployments do not need to be listed: the auth proxy in [`app/api/auth/[...path]/route.ts`](./app/api/auth/%5B...path%5D/route.ts) verifies that a mutation is same-origin and forwards it under the auth service's own origin, which Neon Auth always trusts.
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
- **Pages.** `/` is Discovery, `/remembered` is the saved-word view, `/recall` is the practice session, `/analytics` is the activity report, and `/profile` is account settings. All five share chrome through `app/(app)/layout.tsx` → `components/app/app-shell.tsx` (session, header, bottom navigation, account dialogs). Each page renders only its own view component, and the active tab is derived from the pathname; `/analytics` marks no tab as active. Analytics is reached from a row in the profile menu. `/analytics` draws its own header instead of the app bar, and `/profile` is listed as a bleed route: its cover photo runs edge to edge and starts flush under the mobile app bar. Both are declared in `lib/navigation.ts` (`ownsHeader`, `bleedsTop`) so the shell knows whether to render the bar and how much top room to reserve.
- **Preferences.** `user_preferences` stores `translation_language` (`id`, `en`, `es`; default `id`) and `onboarded_at`. `GET/PATCH /api/preferences` is session-scoped; guests fall back to the `billien_lang` cookie and then to `id`. The onboarding modal appears once per account, and `/profile` lets the user change the language later.
- **AI translation fallback.** The dictionary does not translate every word (for example `eat` has none). `lib/ai.ts` calls InferHub and `lib/ai-translations.ts` fills the gap, cached in `ai_translations` keyed by `(normalized_word, language)`. Dictionary data always wins; AI output only fills empty senses, is validated (max 3 lowercase words, confidence ≥ 0.6, headword echo rejected), and is labelled `AI` in the detail panel. The provider call lives in `lib/ai-transport.ts`: a 15-second timeout per attempt, one retry on a timeout, rate limit, or 5xx, and a 512-token budget because the model spends part of it reasoning before it answers — at 120 tokens the JSON was cut mid-object. A reply whose `finish_reason` is `length` is treated as a failure rather than a translation. A per-row atomic claim means each word/language pair costs at most one generation, with a 3-attempt cap, a 90-second stale-pending reclaim, a one-hour cooldown after which a failed row may be tried again, and a circuit breaker after five consecutive failures. The repair action in Recall passes `force`, so an explicit retry is never blocked by that cooldown. Set `INFERHUB_API_KEY` to enable it; without the key every call is a no-op and the English definition is shown instead. `INFERHUB_TIMEOUT_MS` overrides the timeout.
- **Routes.** `GET /api/dictionary/[word]` (supports `?lang=` and `?lang=all`), `GET/POST /api/words`, `GET/DELETE /api/words/[id]`, `POST /api/words/[id]/review`, `GET /api/review` (supports `?ids=`), `GET /api/streak`, `GET /api/analytics` (supports `?preset=`, `?month=YYYY-MM`, and `?granularity=day|month`), and `GET/PATCH /api/preferences`.
- **Recall.** `lib/recall/` is the active-recall engine: `grade.ts` normalises answers and grades them (exact, one-edit `almost`, or `wrong`), `schedule.ts` owns the spaced-repetition ladder, `cards.ts` chooses a prompt per word (translation → definition → cloze, with `choice` available on request), `session.ts` filters and orders the queue, `summary.ts` turns outcomes into counts and accuracy, and `repository.ts` holds the SQL. A session needs at least 5 eligible words and asks for ten cards by default; the user can pick any size the library can fill, up to the eligible count. Recall reads the preferred-language translation from the dictionary first and from the `ai_translations` cache second, so a word whose translation was generated on save gets a translation card instead of falling back to a definition. Answers are submitted once, at the end: `POST /api/recall/sessions` grades everything, writes the session fact row plus its items and the per-word schedule in one statement, and `PATCH /api/recall/sessions/[id]/items/[itemId]` handles the self-override. `GET /api/recall/session` builds the cards and `GET /api/recall/stats` reports the due count and seven-day accuracy. `/recall` is a two-column workspace: the card on the left, a numbered rail on the right whose rows unlock in order, and a review screen that shows every correct answer. The session in progress lives in `sessionStorage`, so a reload resumes on the same card. `POST /api/recall/repair` re-fetches entries for saved words that cannot produce a prompt. See [`docs/plan-recall.md`](./docs/plan-recall.md).
- **Analytics.** `lib/analytics/` powers `/analytics`. `range.ts` resolves a preset (`7d`, `30d`, `90d`, `this-month`, `last-month`, `this-year`, `last-year`) or an explicit `month=YYYY-MM` into an inclusive window, caps it at 366 days, and picks daily buckets up to 92 days and monthly buckets beyond that; `fillSeries` expands sparse rows so every bucket appears. `repository.ts` reads words added and reviews from `user_streaks`, recall sessions, cards, and correctness from `recall_sessions`, and the weakest words from `recall_session_items`, always bucketing by the activity time zone and returning dates as text. `recallAccuracy` is `null` for a bucket with no session rather than a misleading zero. `GET /api/analytics` is session-scoped (guests get 401). The page shows totals, the current and best streak, a bar chart of words added and reviews, a line chart of recall accuracy, an accessible table fallback, and a list of words worth another look. Charts are built exclusively from the shadcn Chart component in `components/ui/chart.tsx` (Recharts v3) and read series colours from the `--color-chart-*` tokens, so no component carries a hex value.
- **Detail panel.** Translation-first: the preferred language is the primary block, English definitions live in a collapsible `<details>`, and pronunciation uses the browser's `speechSynthesis` (the provider has no audio URLs).
- **Remembered view.** Rows show the preferred translation, search matches English or translation, and sorting applies. Sort and the letter filter share one toolbar card; the letter row always offers the full alphabet and dims letters with no words, so the filter never looks like it collapsed. The detail panel footer shows the review count, the remember action, and prev/next arrows that walk the filtered list. Un-save is optimistic and lives only on the list row.
- **Shared hooks.** `hooks/use-word-library.ts` (read), `hooks/use-word-actions.ts` (save, un-save, review, with cache invalidation), `hooks/use-debounced-value.ts` (search), and `hooks/use-media-query.ts` (desktop column vs mobile dialog).
- **UI primitives.** `components/ui/` holds shadcn/ui components: `dropdown-menu` (Radix) for the account menu, `sonner` for toasts, and `chart` (Recharts) for analytics, all themed with the project tokens instead of shadcn's default palette. `modal.tsx` is the shared dialog shell (scroll lock, focus trap, Escape) and portals to `document.body`: the app shell isolates its stacking context for the background grid, so an inline `z-50` dialog would still paint under the fixed bottom navigation. `lib/utils.ts` provides the `cn` helper, and `components.json` keeps the shadcn CLI working for future additions.
- **Feedback.** Transient results (saved, removed, reviewed, preferences, sign out) are sonner toasts; persistent failures (list load, dictionary lookup) stay as inline alerts with a retry action; dialog errors stay inside their dialog.
- **Profile.** `/profile` follows an OS-settings layout: banner with avatar initial, then grouped white cards for account details, translation language (applies on tap), progress, and sign out. On mobile it is the only place to sign out.

The browser talks only to Next.js API routes and the Neon Auth proxy. [`proxy.ts`](./proxy.ts) exchanges the OAuth callback verifier for the app's first-party session cookie. The OAuth `callbackURL` must be an absolute app URL: the auth service resolves a relative one against its own base URL, so `"/"` lands the browser on the auth host root, which answers 404. `components/auth/auth-modal.tsx` resolves it against `window.location.origin` before calling `signIn.social`. `DATABASE_URL` and `NEON_AUTH_COOKIE_SECRET` stay server-only and must never use the `NEXT_PUBLIC_` prefix. Data routes derive the user ID from the server-side session, so one account cannot access another account's saved words, reviews, preferences, or streak.
