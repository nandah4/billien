<div align="center">
  <img src="public/assets/logo-mark.png" width="120" alt="Billien" />
  <h1>Billien</h1>
  <p><strong>Learn English, one word at a time.</strong></p>
  <p>Look up a word, keep the ones worth keeping, and practise them until they stick.</p>
</div>

---

## What it is

Billien is a small, focused English vocabulary app. It answers the question most
dictionaries leave open: _what did I look up last week, and do I still remember
it?_

Everything starts with a search. You look up a word, read what it means in your
own language, and — if it is worth keeping — save it. Saved words become a
personal library. That library becomes a daily practice session. The sessions
become a record of what you have actually learned.

Browsing works without an account. Signing in with Google is what makes the
library, your translation language, and your streak yours — on any device.

## What you can do

### Discovery — look up any English word

Type a word and see it translated into your language first, with English
definitions folded away underneath. Each sense gets its own row, so a word with
three meanings does not collapse into one blurred entry.

Search also understands grammar. Look up `ran`, `children`, or `better` and
Billien resolves the inflected form back to `run`, `child`, and `good`, then
shows you the meaning from the word that actually carries it. Irregular forms
are recognised, not guessed.

Pronunciation plays through the browser, so nothing extra needs installing.
Signed-in users also get a shortcut back into their library: the five words they
saved most recently appear right under the result.

### Remembered — the library you build

Every saved word lands in one alphabetical list. You can search it by English or
by your own translation — typing `halo` finds `hello` — and jump to any letter
through a filter that dims the letters you have nothing under.

The detail panel keeps the whole word in one place: translation, definitions,
pronunciation, grammatical forms, synonyms, and how many times you have reviewed
it. Arrows walk you through the list without going back, and un-saving happens
right where the word sits.

### Recall — practise remembering

This is where a saved word becomes a known word. Billien shows you a prompt and
you produce the English word yourself: from a translation, from a definition, or
by filling a gap in a real example sentence. A multiple-choice mode exists when
you want something lighter.

Answers are graded generously — one typo still counts — and the schedule adapts.
A word you know well drifts away for weeks. A word you miss comes back within
minutes. Sessions are built from your library, at least five words, and you
choose how many cards to take. Close the tab halfway through and you resume on
the same card; finish and you get the full answer key, plus the option to
disagree with a grade.

### Analytics — see the work add up

Totals, your current and best streak, words added and reviews per day, and a
line for recall accuracy over time. Below the charts, the words worth another
look are listed with their lapse counts. Pick a week, a month, a quarter, or a
year — daily buckets for short ranges, monthly for long ones.

### Profile — your settings

Your translation language applies the moment you pick it and follows you across
devices. Progress lives here too, alongside today's word count and a seven-day
chart. On mobile this is also where you sign out.

## Running it locally

You need a Postgres database with [Neon Auth](https://neon.tech) enabled, a
dictionary endpoint, and optionally an AI provider for translation fallback.

Create `.env.local` in the project root and fill in these values. Every variable
is server-only — none may use the `NEXT_PUBLIC_` prefix.

| Variable                  | Required   | Purpose                                                           |
| ------------------------- | ---------- | ----------------------------------------------------------------- |
| `DATABASE_URL`            | yes        | Neon connection string                                            |
| `NEON_AUTH_BASE_URL`      | yes        | The branch's auth URL                                             |
| `NEON_AUTH_COOKIE_SECRET` | yes        | Random secret, at least 32 characters (`openssl rand -base64 48`) |
| `DICTIONARY_BASE_URL`     | yes        | Entries endpoint; the word and `?translations=true` are appended  |
| `AI_API_KEY`              | no         | Enables the AI translation fallback                               |
| `AI_BASE_URL`             | with a key | Endpoint for the fallback provider                                |
| `AI_MODEL`                | with a key | Model name for the fallback provider                              |
| `DICTIONARY_TIMEOUT_MS`   | no         | Per-request timeout, default `8000`                               |
| `AI_TIMEOUT_MS`           | no         | Per-attempt timeout, default `15000`                              |

Endpoints and models live in the environment rather than in code, so switching
providers is a configuration change. `lib/env.ts` is the only module that reads
`process.env`; each variable is validated on first use, and a missing or
malformed value fails with a message naming it.

**1. Apply the database schema.** For a fresh database run
[`neon/schema.sql`](./neon/schema.sql). For an existing one, apply
[`001_dictionary_v2.sql`](./neon/migrations/001_dictionary_v2.sql), run the
backfill below, then apply
[`002_drop_legacy_dictionary.sql`](./neon/migrations/002_drop_legacy_dictionary.sql),
[`003_ai_translations.sql`](./neon/migrations/003_ai_translations.sql),
[`004_active_recall.sql`](./neon/migrations/004_active_recall.sql), and
[`005_recall_sessions.sql`](./neon/migrations/005_recall_sessions.sql).

**2. Configure auth.** In Neon Console → **Auth**, enable the Google provider and
disable Email/Password. If Neon asks for OAuth credentials, create the client in
Google Cloud Console and copy the redirect URI Neon shows exactly into it.

Add `http://localhost:3000` and your production origin to Neon Auth's trusted
domains. Add `http://localhost:3001` too when port 3000 is occupied. Preview
deployments do not need listing: the auth proxy in
[`app/api/auth/[...path]/route.ts`](./app/api/auth/%5B...path%5D/route.ts)
verifies that a mutation is same-origin and forwards it under the auth service's
own origin, which Neon Auth always trusts.

**3. Install and start.**

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Backfilling pre-v2 words

Words saved before the dictionary migration have an empty `entries` array. Fill
them once before dropping the legacy columns:

```bash
node scripts/backfill-dictionary-v2.mjs
```

The script is idempotent and only touches rows with
`jsonb_array_length(entries) = 0`.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test
```

## Under the hood

Next.js App Router with React Server Components, Tailwind CSS v4, TanStack Query
for client data, and Recharts through a single shadcn-style chart wrapper.
Postgres via Neon's serverless driver; auth via Neon Auth with Google OAuth.

The parts worth knowing:

- **One dictionary cache, shared by everyone.** `vocabulary_words` stores the
  normalized provider payload once per word; `user_words` is only the
  user ↔ word relation. Normalization deduplicates and caps every list, and drops
  recursive `subsenses`.
- **Translation is layered.** The dictionary wins. When it has no translation for
  your language, a cached AI translation fills only the empty senses, is
  validated, and is labelled `AI` in the UI. Without a key, the English
  definition is shown instead.
- **Recall is deterministic.** Grading (`exact`, one-edit `almost`, `wrong`),
  the spaced-repetition ladder, card selection, and session ordering are pure
  modules with their own tests. A finished session is one fact row plus its
  items, written in a single statement, so a session can never exist half-saved.
- **Activity is bucketed in one time zone**, in both SQL and TypeScript, from a
  single constant — so a streak cannot drift between the two.

Route map: `/api/dictionary/[word]`, `/api/words`, `/api/words/[id]`,
`/api/words/[id]/review`, `/api/recall/*`, `/api/analytics`, `/api/streak`,
`/api/languages`, `/api/preferences`, and the auth proxy.

Data routes derive the user ID from the server-side session, so one account
cannot reach another account's words, reviews, preferences, or streak.

## Docs

- [`docs/billien-design-md.md`](./docs/billien-design-md.md) — colour tokens, typography, layout rules, and the component breakdown for every screen
