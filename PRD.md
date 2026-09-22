# PRD + Technical Implementation Guide — EN Words Personal Vocabulary App

> **Scope override — 22 September 2026:** The product is now **Billien**, a multi-user application backed by Neon. The earlier single-user/Supabase/no-login constraints are superseded. Guests may search an exact word through Free Dictionary API. Add to Remember, Random/Flip review, and streak require a Google OAuth sign-in through Neon Auth and are isolated by user ID. Datamuse discovery, autocomplete, and the discovery feed are out of scope. See `README.md` and `neon/schema.sql` for the active setup.

> **Document role:** This file is the primary source of truth for both product behavior and technical implementation. A coding model/agent should be able to create the project from an empty folder by following this file without inventing additional architecture.

---

## 0. Implementation Rules for AI Coding Agents

When implementing this project:

1. Treat this PRD as the source of truth.
2. Do not add authentication, registration, user profiles, roles, or multi-user tables.
3. Keep the product as a **single-page personal web app**.
4. Use **Next.js App Router + TypeScript** as the application framework.
5. Use **Supabase PostgreSQL** only through server-side Next.js code.
6. Never expose the Supabase service-role/secret key to browser code.
7. Use **Free Dictionary API v2** as the external English dictionary source.
8. When saving a word, re-fetch it on the server and store the canonical API response. Do not trust dictionary detail sent by the browser.
9. Preserve the complete API response in `api_entries` so fields returned by the dictionary API are not lost even if the local normalized schema does not have a dedicated column for every field.
10. Do not fabricate phonetics, audio, meanings, examples, synonyms, antonyms, license data, or source URLs that are absent from the dictionary API.
11. Do not add FastAPI, Express, NestJS, a separate backend repository, Redis, queues, microservices, or another database unless explicitly requested later.
12. Do not add a spaced-repetition algorithm in the MVP. Random review is enough.
13. Use Lucide React for interface icons.
14. Keep the visual style minimalist, semi-brutalist, black/off-white, border-led, with little shadow and little/no gradient.
15. Prefer small, explicit modules and server/client boundaries over clever abstractions.
16. If a requirement conflicts with convenience, follow this PRD.

---

# 1. Product Summary

**EN Words** is a personal web application for discovering English words, saving words that have been learned, reviewing those words randomly, and maintaining a daily learning streak.

The application is intentionally single-user. There is no login or registration.

The core loop is:

```text
Discover / search an English word
            ↓
View dictionary detail
            ↓
Add to Remember
            ↓
Save canonical API data to Supabase
            ↓
Review saved words randomly
            ↓
Remember / Forgot
            ↓
Update review metrics + daily streak
```

The entire product should remain on one page.

---

# 2. Product Goals

- Search an English word quickly.
- Browse a small discovery list of English words.
- View word detail without navigating to another page.
- Play pronunciation audio when the dictionary API supplies audio.
- Save a learned word with a traceable `added_at` timestamp.
- List all saved/remembered words.
- Search within saved words.
- Review 5, 10, or 20 random saved words.
- Track whether a reviewed word was remembered or forgotten.
- Track daily learning/review activity.
- Display a current daily streak.
- Keep infrastructure small enough for a personal project.

---

# 3. Non-goals / MVP Exclusions

Do not implement these in the initial version:

- Login/register.
- User accounts.
- Multi-user data isolation.
- Social features.
- Public profiles.
- AI-generated definitions or translations.
- Indonesian translations unless requested later.
- Advanced SRS / SM-2 / Anki algorithm.
- Notifications.
- Mobile native application.
- Microservices.
- A separate backend framework.
- Direct anonymous browser CRUD to Supabase.
- Scraping dictionary websites.
- Downloading the entire English dictionary at runtime.

---

# 4. User Interface Requirements

## 4.1 General layout

The application has only one page.

Desktop layout:

```text
┌─────────────────────────────────────────────────────────────────┐
│ EN WORDS.                                  🔥 7 day streak      │
├───────────────────────────────────────┬─────────────────────────┤
│ MAIN COLUMN ~65–70%                  │ DETAIL ~30–35%          │
│                                       │                         │
│ [Words] [Remembered] [Random]         │ Selected word           │
│                                       │ Phonetic + voice        │
│ Search / tab-specific content         │ Meanings                │
│                                       │ Examples                │
│ Word cards / review                   │ Source                  │
│                                       │                         │
└───────────────────────────────────────┴─────────────────────────┘
```

Mobile layout:

```text
Header
Tabs
Main tab content
Word detail
```

Requirements:

- Main column is wider than detail column.
- No desktop modal is required for word detail.
- No full-page navigation when switching tabs or selecting words.
- At narrow width, columns stack vertically.
- Do not create page-level horizontal overflow.

## 4.2 Visual design

Style: **minimalist + semi-brutalist + elegant black**.

Rules:

- Background: warm white / off-white.
- Main text: near-black.
- Borders: near-black, visible 1–2 px.
- Main CTA: black background, white text.
- Minimal border radius. Prefer `0`, `2px`, `4px`, or similarly restrained radius.
- Do not use pill-shaped cards everywhere.
- Avoid excessive box shadow.
- Avoid excessive gradient. Prefer no gradient.
- Use strong typography and whitespace rather than decoration.
- Use Lucide React icons only.
- Add clear hover/focus/disabled states.
- Controls must remain usable by keyboard.
- Keep cards compact and readable.

Suggested visual tokens:

```css
--background: #f4f2ed;
--surface: #ffffff;
--foreground: #111111;
--muted: #6b6b6b;
--border: #181818;
--danger: #b42318;
```

These are guidance, not a mandatory exact palette.

---

# 5. Tabs and Product Behavior

## 5.1 Tab: Words

Purpose: dictionary discovery and search.

Contents:

- Search input.
- Search action.
- Search result card.
- Small local discovery list.

Important limitation:

Free Dictionary API provides word lookup, not an official `list all words` endpoint. Therefore, the Words tab must **not pretend that it contains the complete English dictionary**.

MVP approach:

```text
Words tab
├── Exact search → Free Dictionary API
└── Discovery cards → local curated word seed
```

Example discovery seed:

```ts
[
  "achieve",
  "although",
  "approach",
  "aware",
  "despite",
  "eventually",
  "improve",
  "instead",
  "likely",
  "rough",
  "upset"
]
```

A future static English word dataset may replace the discovery seed without changing the database schema.

### Word card behavior

Each result/discovery word card should contain:

- word.
- short primary definition if already loaded.
- `Add to Remember` button if not saved.
- `Saved` state if already saved.

Clicking the card or word selects it and displays detail in Column 2.

### Save flow

```text
Browser
  ↓ POST /api/words { word }
Next.js server
  ↓
Free Dictionary API lookup again
  ↓
Validate canonical response
  ↓
Normalize first API entry
  ↓
Save normalized columns + complete raw array to Supabase
  ↓
Set added_at from PostgreSQL
  ↓
Increment today's learned_count only if this is a new word
```

The browser should submit only the word string.

Do **not** accept definition/phonetic/audio JSON supplied by the browser as trusted persistence data.

---

## 5.2 Tab: Remembered

Purpose: show words the user explicitly saved.

A word is considered remembered/saved simply because it exists in the `words` table.

Contents:

- Search input.
- Saved word list.
- Added date.
- Review count.

Ordering:

```text
newest added_at first
```

Search should be case-insensitive and filter by word text.

Clicking a saved word displays its full persisted detail in Column 2.

Do not create a second `remembered_words` table in MVP.

---

## 5.3 Tab: Random

Purpose: test memory using saved words from Supabase.

Initial controls:

```text
How many words?
[ 5 ] [ 10 ] [ 20 ]

[ Start Review ]
```

Review flow:

```text
GET /api/review?count=10
        ↓
Postgres RPC get_random_words(10)
        ↓
Word 1
        ↓
[ Show meaning ]
        ↓
Definition visible
        ↓
[ Forgot ]  [ Remember ]
        ↓
POST /api/words/:id/review
        ↓
Update word metrics + streak
        ↓
Word 2 ...
```

Rules:

- Random source must be rows from Supabase `words`.
- Use PostgreSQL `ORDER BY random()` for MVP.
- Show one word at a time.
- Initially hide the meaning.
- `Show meaning` reveals at least the primary definition.
- User then chooses `Forgot` or `Remember`.
- After the last item, show `Review complete`.
- If fewer saved words exist than requested, return available rows rather than failing.
- If zero words are saved, disable Start Review and show a useful empty state.

Do not implement weighted random/SRS yet.

---

# 6. Detail Column

When nothing is selected, show a minimal empty state.

When a word is selected, show:

1. canonical `word`.
2. `phonetic` if available.
3. voice/audio button if at least one `phonetics[].audio` exists.
4. all meanings grouped by `partOfSpeech`.
5. initially display up to 3 definitions per part of speech to avoid excessively long panels.
6. example sentence when supplied.
7. synonyms/antonyms when useful and available.
8. source URL when supplied.
9. for saved words, show `added_at`, `review_count`, `remembered_count`, `forgotten_count`, and `last_reviewed_at` where appropriate.

Audio rule:

- Use the first non-empty pronunciation audio URL supplied by Free Dictionary API.
- Some historical API audio values may be protocol-relative (`//...`). Normalize those to `https://...` before playback.
- Do not synthesize audio in MVP.
- Disable/hide voice button when the API contains no usable audio.

---

# 7. Daily Streak

The header displays:

```text
Flame icon + N day streak
```

Use Lucide `Flame`.

Activity rules:

- Saving a genuinely new word increments `learned_count` for the current local calendar day.
- Every completed Remember/Forgot review increments `review_count` for the current local calendar day.
- Multiple actions on one day update the same `streaks` row.
- Duplicate word saves must not increment `learned_count`.

## 7.1 Timezone

This application is personal and should use:

```text
Asia/Jakarta
```

for daily streak boundaries.

Do not rely blindly on server UTC when deciding the activity date.

In PostgreSQL use:

```sql
(now() at time zone 'Asia/Jakarta')::date
```

when creating/upserting the daily streak row.

## 7.2 Current streak algorithm

Let active dates be dates with:

```text
learned_count > 0 OR review_count > 0
```

Then:

- If today is active, count backwards from today.
- If today is not active but yesterday is active, allow the displayed streak to count backwards from yesterday.
- Stop at the first missing calendar day.

Example:

```text
Sep 17 ✓
Sep 18 ✓
Sep 19 ✓
Sep 20 ✓
Sep 21 ✓

current streak = 5
```

---

# 8. Technology Stack

## 8.1 Required runtime and framework

| Tool | Purpose | Required |
|---|---|---|
| Node.js 20.9+ | JavaScript runtime required by current Next.js | Yes |
| npm | Package manager | Yes |
| Next.js App Router | Web framework + server routes | Yes |
| React | UI rendering | Yes |
| TypeScript | Type safety | Yes |
| Tailwind CSS | Styling | Yes |
| Lucide React | Icons | Yes |
| `@supabase/supabase-js` | Supabase server client | Yes |
| Supabase PostgreSQL | Persistence + SQL RPCs | Yes |
| Free Dictionary API | English dictionary source | Yes |

No Supabase auth wrapper is required because this application has no user authentication. Use the base `@supabase/supabase-js` client in server-only modules.

## 8.2 Development tools

Recommended:

- VS Code / Cursor / another TypeScript-capable editor.
- Git.
- GitHub repository.
- Browser DevTools.

Optional:

- Supabase CLI for migrations/local workflows.
- Supabase MCP or Supabase Agent Skills if an AI coding environment supports them.
- Bruno/Postman/Insomnia for manually testing API routes.
- Vercel for deployment.

Do not make optional tools runtime dependencies.

---

# 9. Project Setup From an Empty Folder

## 9.1 Prerequisites

Verify Node/npm:

```bash
node -v
npm -v
```

Use Node.js `20.9+` or a newer supported LTS/runtime version.

## 9.2 Create Next.js project

```bash
npx create-next-app@latest enwords-personal \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --use-npm \
  --import-alias "@/*"
```

Then:

```bash
cd enwords-personal
```

If `create-next-app` asks whether to use a `src/` directory, either choice can work, but this PRD and the supplied starter structure assume **no `src/` directory** so paths remain `app/`, `components/`, and `lib/` at project root.

## 9.3 Install project dependencies

```bash
npm install @supabase/supabase-js lucide-react
```

Do not install `@supabase/ssr` because there is no cookie-based Supabase user session in this product.

## 9.4 Start development server

```bash
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

## 9.5 Expected scripts

`package.json` must provide at minimum:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

Use the lint command generated/recommended by the installed Next.js version instead of assuming an obsolete command.

---

# 10. Target Folder Structure

Use this structure:

```text
enwords-personal/
├── app/
│   ├── api/
│   │   ├── dictionary/
│   │   │   └── route.ts
│   │   ├── review/
│   │   │   └── route.ts
│   │   ├── streak/
│   │   │   └── route.ts
│   │   └── words/
│   │       ├── route.ts
│   │       └── [id]/
│   │           └── review/
│   │               └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── enwords-app.tsx
│   └── word-detail.tsx
│
├── lib/
│   ├── dictionary.ts
│   ├── discovery.ts
│   ├── supabase-admin.ts
│   └── types.ts
│
├── supabase/
│   └── schema.sql
│
├── .env.example
├── .env.local                 # local only, gitignored
├── .gitignore
├── package.json
├── tsconfig.json
└── PRD.md
```

Responsibilities:

```text
app/page.tsx
  → renders the one-page application shell

components/enwords-app.tsx
  → interactive tab state, searching, save actions, random review

components/word-detail.tsx
  → selected-word detail + pronunciation audio

app/api/*
  → trusted server boundary

lib/dictionary.ts
  → Free Dictionary API integration + validation/normalization

lib/supabase-admin.ts
  → server-only privileged Supabase client

lib/types.ts
  → shared application/API TypeScript types

lib/discovery.ts
  → local discovery seed

supabase/schema.sql
  → database tables, indexes, RLS, privileges, and RPC functions
```

---

# 11. Environment Configuration

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

Create `.env.example` with placeholders only:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

Security requirements:

- `SUPABASE_SERVICE_ROLE_KEY` must never appear in any file containing `"use client"`.
- Never prefix the service-role key with `NEXT_PUBLIC_`.
- Never return the service-role key from any API route.
- `.env.local` must be gitignored.
- `NEXT_PUBLIC_SUPABASE_URL` being public is acceptable; the sensitive credential is the server key.

Because database operations are intentionally server-only, do not create a browser Supabase client for CRUD in the MVP.

---

# 12. Supabase Project Setup

## 12.1 Create project

1. Create a Supabase project.
2. Open Project Settings / API.
3. Copy the project URL.
4. Copy the server-only service-role/secret key appropriate for privileged server use.
5. Put them into `.env.local`.

## 12.2 Run database schema

Open Supabase SQL Editor and run the following schema.

```sql
create extension if not exists pgcrypto;

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  normalized_word text not null unique,
  phonetic text,
  phonetics jsonb not null default '[]'::jsonb,
  meanings jsonb not null default '[]'::jsonb,
  license jsonb,
  source_urls text[] not null default '{}',
  api_entries jsonb not null,
  added_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  review_count integer not null default 0 check (review_count >= 0),
  remembered_count integer not null default 0 check (remembered_count >= 0),
  forgotten_count integer not null default 0 check (forgotten_count >= 0)
);

create index if not exists words_added_at_idx
  on public.words (added_at desc);

create index if not exists words_normalized_word_idx
  on public.words (normalized_word);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  activity_date date not null unique,
  learned_count integer not null default 0 check (learned_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The app has no login and does not permit anonymous browser CRUD.
alter table public.words enable row level security;
alter table public.streaks enable row level security;

revoke all on table public.words from anon, authenticated;
revoke all on table public.streaks from anon, authenticated;

create or replace function public.get_random_words(p_count integer default 10)
returns setof public.words
language sql
security definer
set search_path = public
as $$
  select *
  from public.words
  order by random()
  limit greatest(1, least(p_count, 50));
$$;

create or replace function public.mark_word_remembered(p_word_id uuid)
returns public.words
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.words;
begin
  update public.words
  set review_count = review_count + 1,
      remembered_count = remembered_count + 1,
      last_reviewed_at = now()
  where id = p_word_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Word not found';
  end if;

  return v_row;
end;
$$;

create or replace function public.mark_word_forgotten(p_word_id uuid)
returns public.words
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.words;
begin
  update public.words
  set review_count = review_count + 1,
      forgotten_count = forgotten_count + 1,
      last_reviewed_at = now()
  where id = p_word_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Word not found';
  end if;

  return v_row;
end;
$$;

create or replace function public.bump_daily_activity(
  p_learned_inc integer default 0,
  p_review_inc integer default 0
)
returns public.streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.streaks;
  v_activity_date date := (now() at time zone 'Asia/Jakarta')::date;
begin
  insert into public.streaks (
    activity_date,
    learned_count,
    review_count
  )
  values (
    v_activity_date,
    greatest(p_learned_inc, 0),
    greatest(p_review_inc, 0)
  )
  on conflict (activity_date)
  do update set
    learned_count = public.streaks.learned_count + excluded.learned_count,
    review_count = public.streaks.review_count + excluded.review_count,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- RPCs are called only through the privileged server-side client.
revoke all on function public.get_random_words(integer)
  from public, anon, authenticated;

revoke all on function public.mark_word_remembered(uuid)
  from public, anon, authenticated;

revoke all on function public.mark_word_forgotten(uuid)
  from public, anon, authenticated;

revoke all on function public.bump_daily_activity(integer, integer)
  from public, anon, authenticated;
```

## 12.3 Why there is no `users` table

This is a personal single-user application. Adding `users` or `user_id` adds complexity without product value.

If multi-user support is requested in the future, migrate to:

```text
auth.users
    ↓
user_words
    ↓
words dictionary/cache
```

but do not pre-build that architecture now.

---

# 13. Database Model

## 13.1 `words`

Purpose: one row per explicitly saved English word.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid | Primary key |
| `word` | text | Canonical spelling returned by API |
| `normalized_word` | text unique | Lowercase duplicate key |
| `phonetic` | text nullable | Preferred phonetic text |
| `phonetics` | jsonb | Complete first-entry `phonetics` array |
| `meanings` | jsonb | Complete first-entry `meanings` array |
| `license` | jsonb nullable | First-entry license metadata if present |
| `source_urls` | text[] | First-entry source URLs |
| `api_entries` | jsonb | Complete API response array; canonical raw snapshot |
| `added_at` | timestamptz | When the user saved this word |
| `last_reviewed_at` | timestamptz nullable | Most recent review |
| `review_count` | integer | Total Remember + Forgot answers |
| `remembered_count` | integer | Number of Remember answers |
| `forgotten_count` | integer | Number of Forgot answers |

Do not create an `is_remembered` boolean. Existence in this table already means it was added to Remembered.

## 13.2 `streaks`

Purpose: daily aggregate activity.

| Field | Type | Meaning |
|---|---|---|
| `id` | uuid | Primary key |
| `activity_date` | date unique | Asia/Jakarta learning date |
| `learned_count` | integer | New unique words saved that day |
| `review_count` | integer | Review answers that day |
| `created_at` | timestamptz | Row creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

Do not persist `current_streak` as a fragile counter. Derive it from daily rows.

---

# 14. Free Dictionary API Integration

## 14.1 Endpoint

Use:

```http
GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

Example:

```http
GET https://api.dictionaryapi.dev/api/v2/entries/en/upset
```

No API key is required for the integration.

## 14.2 Important response behavior

The successful response is an **array of dictionary entries**, not one object.

The project must preserve that full array.

Expected fields used by the UI include:

```ts
export type DictionaryPhonetic = {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: {
    name?: string;
    url?: string;
  };
};

export type DictionaryDefinition = {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
};

export type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
};

export type DictionaryEntry = {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  license?: {
    name?: string;
    url?: string;
  };
  sourceUrls?: string[];

  // The API may include additional fields over time.
  // api_entries in PostgreSQL must retain the raw object rather than dropping them.
  [key: string]: unknown;
};
```

Important persistence rule:

```text
normalized columns = convenient fields from entries[0]
api_entries         = exact complete returned array
```

Therefore, even if the API later returns an additional field such as `origin`, it remains preserved inside `api_entries` without an immediate database migration.

## 14.3 Dictionary integration module

Create `lib/dictionary.ts`:

```ts
import type { DictionaryEntry } from "./types";

const BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

export async function lookupWord(rawWord: string): Promise<DictionaryEntry[]> {
  const word = rawWord.trim().toLowerCase();

  if (!word || !/^[a-z][a-z'-]*$/i.test(word)) {
    throw new Error("Please enter a valid English word.");
  }

  const response = await fetch(
    `${BASE_URL}/${encodeURIComponent(word)}`,
    {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 60 * 60 * 24,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Word not found.");
    }

    throw new Error("Dictionary service is unavailable.");
  }

  const data: unknown = await response.json();

  if (
    !Array.isArray(data) ||
    !data[0] ||
    typeof data[0].word !== "string" ||
    !Array.isArray(data[0].meanings)
  ) {
    throw new Error("Unexpected dictionary response.");
  }

  return data as DictionaryEntry[];
}

export function normalizeForInsert(entries: DictionaryEntry[]) {
  const first = entries[0];

  const fallbackPhonetic = Array.isArray(first.phonetics)
    ? first.phonetics.find(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { text?: unknown }).text === "string",
      )
    : undefined;

  return {
    word: first.word,
    normalized_word: first.word.toLocaleLowerCase("en"),
    phonetic:
      typeof first.phonetic === "string"
        ? first.phonetic
        : ((fallbackPhonetic as { text?: string } | undefined)?.text ?? null),
    phonetics: Array.isArray(first.phonetics) ? first.phonetics : [],
    meanings: Array.isArray(first.meanings) ? first.meanings : [],
    license:
      first.license && typeof first.license === "object"
        ? first.license
        : null,
    source_urls: Array.isArray(first.sourceUrls)
      ? first.sourceUrls.filter(
          (value): value is string => typeof value === "string",
        )
      : [],

    // Never reconstruct the API payload. Preserve it.
    api_entries: entries,
  };
}
```

## 14.4 Search strategy

For exact dictionary search:

```text
Browser search form
  ↓
GET /api/dictionary?word=upset
  ↓
Next.js route handler
  ↓
lookupWord("upset")
  ↓
Free Dictionary API
  ↓
return API array to browser
  ↓
select entries[0] for main display
```

Do not query Supabase first for the public dictionary search because the purpose of the Words tab is discovery. Saved state can be determined separately from loaded remembered words.

## 14.5 Rate-limit friendly behavior

Although the public API does not document a guaranteed unlimited quota, this app should make few calls:

- Search calls the dictionary API.
- Saving re-validates/re-fetches once on the server.
- Remembered and Random tabs read from Supabase only.
- Word details for saved words use persisted JSON rather than re-fetching the dictionary API.
- Next.js fetch caching/revalidation may be used for lookup results.

---

# 15. Supabase Server Integration

Create `lib/supabase-admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
```

`server-only` is recommended as a guard so this privileged module cannot accidentally be imported into a Client Component.

Rules:

```text
Client Component
    ✗ must NOT import supabase-admin.ts

Route Handler / Server Component
    ✓ may import supabase-admin.ts
```

---

# 16. API Route Contract and Integration

All application persistence should go through these Next.js API routes.

## 16.1 `GET /api/dictionary?word={word}`

Purpose: server proxy to Free Dictionary API.

Request:

```http
GET /api/dictionary?word=upset
```

Success:

```json
{
  "data": [
    {
      "word": "upset",
      "phonetics": [],
      "meanings": []
    }
  ]
}
```

Error examples:

```json
{ "error": "Word not found." }
```

or:

```json
{ "error": "Dictionary service is unavailable." }
```

Route template:

```ts
import { NextRequest, NextResponse } from "next/server";
import { lookupWord } from "@/lib/dictionary";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word") ?? "";

  try {
    const data = await lookupWord(word);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lookup failed.",
      },
      { status: 400 },
    );
  }
}
```

---

## 16.2 `GET /api/words?q={query}`

Purpose: read saved words from Supabase.

Behavior:

- Return newest first.
- Optional `q` performs case-insensitive partial match.

Route logic:

```ts
const supabase = createAdminClient();

let query = supabase
  .from("words")
  .select("*")
  .order("added_at", { ascending: false });

if (q) {
  query = query.ilike("word", `%${q}%`);
}
```

---

## 16.3 `POST /api/words`

Purpose: add one canonical dictionary word to Remembered.

Browser body:

```json
{
  "word": "upset"
}
```

Server sequence:

```text
validate body.word
    ↓
lookupWord(word)
    ↓
normalizeForInsert(entries)
    ↓
insert/upsert by normalized_word
    ↓
if newly inserted:
  bump_daily_activity(learned +1)
    ↓
return row + alreadySaved flag
```

Expected response on new save:

```json
{
  "data": {},
  "alreadySaved": false
}
```

Expected response on duplicate:

```json
{
  "data": {},
  "alreadySaved": true
}
```

Critical rule:

A duplicate must not update `added_at` and must not increment today's `learned_count`.

---

## 16.4 `GET /api/review?count=N`

Purpose: return random saved words.

Supported UI values:

```text
5
10
20
```

Server safety clamp:

```text
minimum 1
maximum 50
```

Implementation:

```ts
const { data, error } = await supabase.rpc(
  "get_random_words",
  { p_count: count },
);
```

---

## 16.5 `POST /api/words/{id}/review`

Purpose: record memory result.

Remember request:

```json
{
  "result": "remembered"
}
```

Forgot request:

```json
{
  "result": "forgotten"
}
```

Server behavior:

```text
remembered
  → mark_word_remembered(id)

forgotten
  → mark_word_forgotten(id)

then
  → bump_daily_activity(review +1)
```

A successful Remember increments:

```text
review_count +1
remembered_count +1
last_reviewed_at = now()
```

A successful Forgot increments:

```text
review_count +1
forgotten_count +1
last_reviewed_at = now()
```

---

## 16.6 `GET /api/streak`

Purpose: return recent activity and derived current streak.

Example response:

```json
{
  "data": [
    {
      "activity_date": "2026-09-21",
      "learned_count": 3,
      "review_count": 10
    }
  ],
  "currentStreak": 4
}
```

The streak calculation must compare calendar dates in `Asia/Jakarta`, not accidentally shift dates through UTC serialization.

Recommended approach in JavaScript:

- The database already stores date-only strings (`YYYY-MM-DD`).
- Compute today's Jakarta date with `Intl.DateTimeFormat` or a small explicit helper.
- Compare date keys as calendar dates rather than using browser-local parsing of `new Date("YYYY-MM-DD")`.

---

# 17. Client-side Data Flow

The UI is interactive, so the main application component can be a Client Component.

Suggested state:

```ts
type Tab = "words" | "remembered" | "random";

const [tab, setTab] = useState<Tab>("words");
const [selectedWord, setSelectedWord] = useState<DictionaryEntry | SavedWord | null>(null);
const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
const [query, setQuery] = useState("");
const [dictionaryResult, setDictionaryResult] = useState<DictionaryEntry[] | null>(null);
const [streak, setStreak] = useState(0);
```

Initial load:

```text
Promise.all([
  GET /api/words,
  GET /api/streak
])
```

Do not make a dictionary request for every discovery card on initial page load. That would create unnecessary external API traffic.

Instead:

- discovery cards can initially display only the word.
- fetch detail when selected.
- cache loaded dictionary results in component state if desired.

---

# 18. TypeScript Data Types

Create `lib/types.ts`.

```ts
export type DictionaryPhonetic = {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: {
    name?: string;
    url?: string;
  };
};

export type DictionaryDefinition = {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
};

export type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
};

export type DictionaryEntry = {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  license?: {
    name?: string;
    url?: string;
  };
  sourceUrls?: string[];
  [key: string]: unknown;
};

export type SavedWord = {
  id: string;
  word: string;
  normalized_word: string;
  phonetic: string | null;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  license: {
    name?: string;
    url?: string;
  } | null;
  source_urls: string[];
  api_entries: DictionaryEntry[];
  added_at: string;
  last_reviewed_at: string | null;
  review_count: number;
  remembered_count: number;
  forgotten_count: number;
};

export type StreakDay = {
  activity_date: string;
  learned_count: number;
  review_count: number;
};
```

Never type external API responses as `any` throughout the app. Parse/validate the minimum required shape at the server boundary.

---

# 19. UI Component Responsibilities

## `app/page.tsx`

Keep minimal:

```tsx
import { EnWordsApp } from "@/components/enwords-app";

export default function Page() {
  return <EnWordsApp />;
}
```

## `components/enwords-app.tsx`

Responsible for:

- active tab.
- words search.
- remembered search.
- discovery selection.
- saving word.
- loading remembered words.
- random review state.
- streak loading.
- selected detail state.

Do not put raw service-role Supabase calls in this component.

## `components/word-detail.tsx`

Responsible for:

- canonical word.
- phonetic.
- audio button.
- meanings.
- definitions.
- examples.
- synonyms/antonyms.
- source links.
- saved metadata if provided.

## `lib/discovery.ts`

Only static data:

```ts
export const DISCOVERY_WORDS = [
  "achieve",
  "although",
  "approach",
  "aware",
  "despite",
  "eventually",
  "improve",
  "instead",
  "likely",
  "rough",
  "upset",
] as const;
```

---

# 20. Voice / Pronunciation Implementation

Use browser audio playback from the API audio URL.

Example helper:

```ts
function normalizeAudioUrl(url?: string) {
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}
```

Find audio:

```ts
const audioUrl = entry.phonetics
  ?.map((item) => normalizeAudioUrl(item.audio))
  .find(Boolean);
```

Playback:

```ts
const audio = new Audio(audioUrl);
await audio.play();
```

Handle playback rejection gracefully.

Do not call text-to-speech services if API audio is absent.

---

# 21. Error and Empty States

Required states:

## Dictionary

- Invalid input → `Please enter a valid English word.`
- 404 → `Word not found.`
- API unavailable → `Dictionary service is unavailable.`
- Unexpected response → `Unexpected dictionary response.`

## Remembered

No saved words:

```text
No remembered words yet.
Add a word from the Words tab first.
```

Search with no matches:

```text
No saved words match this search.
```

## Random

No saved words:

```text
Add some words before starting a review.
```

## Audio

No audio:

- disable voice button or omit it.
- do not show broken player controls.

## Supabase

- show concise non-sensitive UI error.
- detailed server errors may be logged server-side.
- never return environment secrets.

---

# 22. Security Requirements

This product has no user login, but that does not mean the database should be publicly writable.

Required architecture:

```text
Browser
   ↓
Next.js Route Handler
   ↓
server-only Supabase client
   ↓
Supabase
```

Forbidden architecture:

```text
Browser
   ↓
Supabase service-role key   ❌
```

Also avoid:

```text
public anon INSERT/UPDATE/DELETE policy   ❌
```

Rationale: a deployed personal URL can still be discovered or called by someone else. Browser-hidden UI is not database security.

Future hardening options, only if needed:

- deployment-level password/access protection.
- Vercel authentication/protection features.
- simple private reverse proxy.
- adding actual Supabase Auth.

Do not implement these unless requested.

---

# 23. Local Development Workflow

## First setup

```bash
npx create-next-app@latest enwords-personal \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --use-npm \
  --import-alias "@/*"

cd enwords-personal
npm install @supabase/supabase-js lucide-react
```

Create Supabase project and run `supabase/schema.sql`.

Create `.env.local`.

Then:

```bash
npm run dev
```

## Before commit

Run the checks supported by the installed toolchain, at minimum:

```bash
npm run build
```

and the project's configured lint command.

The build must not expose a missing environment variable during local CI/deploy when variables are configured correctly.

---

# 24. Manual API Testing

These checks can be performed with `curl`, Bruno, Postman, or browser DevTools.

## Dictionary

```bash
curl "http://localhost:3000/api/dictionary?word=upset"
```

Expected: HTTP 200 + `data` array.

## Save

```bash
curl -X POST "http://localhost:3000/api/words" \
  -H "Content-Type: application/json" \
  -d '{"word":"upset"}'
```

Expected first call:

```text
201
alreadySaved: false
```

Expected duplicate call:

```text
alreadySaved: true
```

and `added_at` should remain the original value.

## List remembered

```bash
curl "http://localhost:3000/api/words"
```

## Search remembered

```bash
curl "http://localhost:3000/api/words?q=ups"
```

## Random

```bash
curl "http://localhost:3000/api/review?count=10"
```

## Review answer

```bash
curl -X POST "http://localhost:3000/api/words/WORD_UUID/review" \
  -H "Content-Type: application/json" \
  -d '{"result":"remembered"}'
```

## Streak

```bash
curl "http://localhost:3000/api/streak"
```

---

# 25. Database Verification Checklist

After saving `upset`, verify `words` contains:

```text
word                → exact/canonical API first-entry word
normalized_word     → lowercase canonical word
phonetic            → API phonetic or first phonetics.text or null
phonetics            → first-entry phonetics array
meanings             → first-entry meanings array
license              → first-entry license or null
source_urls          → first-entry sourceUrls or []
api_entries          → FULL API response array
added_at             → generated timestamp
review_count         → 0 initially
remembered_count     → 0 initially
forgotten_count      → 0 initially
```

The most important correctness rule is:

```text
api_entries === full dictionary API response snapshot used during save
```

Do not manually reduce `api_entries` to only fields currently used in the UI.

---

# 26. Deployment

Recommended simple deployment:

```text
GitHub
   ↓
Vercel
   ↓
Next.js server routes
   ↓
Supabase + Dictionary API
```

Deployment environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

After deployment verify:

1. `/` loads.
2. `/api/dictionary?word=hello` returns dictionary data.
3. Save works.
4. Supabase row is created.
5. Duplicate save does not create duplicate rows.
6. Random review works.
7. Review metrics update.
8. Streak updates using Asia/Jakarta calendar date.
9. Browser source/devtools contains no service-role key.

Because there is no application authentication, treat the deployed app as a personal utility, not a public multi-user service.

---

# 27. Future Enhancements — Not Part of MVP

Possible later additions:

- Difficulty tags.
- Notes per word.
- Indonesian meaning field entered manually.
- Categories/tags.
- Import/export CSV.
- Static full English word dataset for discovery.
- Spaced repetition.
- Weighted random based on forgotten count.
- Daily target, e.g. 10 words/day.
- Calendar heatmap.
- PWA/offline cache.
- Supabase Auth if the app becomes multi-user.

Do not implement these by default.

---

# 28. Acceptance Criteria

The MVP is complete only when all items below work.

## Architecture

- [ ] Next.js App Router + TypeScript used.
- [ ] One page only.
- [ ] Supabase accessed from trusted Next.js server code.
- [ ] Service-role key not exposed to client.
- [ ] No auth/login/register added.

## Words

- [ ] User can search an English word.
- [ ] Search goes through `/api/dictionary`.
- [ ] Search result can be selected.
- [ ] Selected word appears in Column 2.
- [ ] Pronunciation audio works when supplied by API.
- [ ] User can add word to Remembered.
- [ ] Server re-fetches canonical data before save.
- [ ] Full API array is stored in `api_entries`.
- [ ] `added_at` is stored.
- [ ] Duplicate save is prevented.
- [ ] Duplicate save does not increment daily learned count.

## Remembered

- [ ] Saved words list loads from Supabase.
- [ ] Newest word appears first.
- [ ] Saved-word search works.
- [ ] Added date is visible.
- [ ] Clicking a saved word shows detail.

## Random

- [ ] User can choose 5, 10, or 20.
- [ ] Random rows come from Supabase `words`.
- [ ] Definition starts hidden.
- [ ] Show Meaning reveals it.
- [ ] Remember works.
- [ ] Forgot works.
- [ ] Review counters update.
- [ ] `last_reviewed_at` updates.
- [ ] Review completes after final item.

## Streak

- [ ] New unique word increments daily learned activity.
- [ ] Every review answer increments daily review activity.
- [ ] One row exists per active date.
- [ ] Activity date uses Asia/Jakarta day boundary.
- [ ] Current streak displays in header.

## UI

- [ ] Desktop uses wide main + narrower detail column.
- [ ] Mobile stacks responsively.
- [ ] Minimalist/semi-brutalist appearance.
- [ ] Black/off-white visual language.
- [ ] No excessive gradients.
- [ ] No excessive rounded cards.
- [ ] No excessive shadows.
- [ ] Lucide React icons used.
- [ ] Keyboard focus states are visible.

---

# 29. Final Architecture Reference

```text
                           ┌────────────────────────────┐
                           │        Next.js UI          │
                           │                            │
                           │ Words | Remembered | Random│
                           │ Main column + Detail       │
                           └─────────────┬──────────────┘
                                         │
                                         │ fetch /api/*
                                         ▼
                           ┌────────────────────────────┐
                           │ Next.js Route Handlers     │
                           │ trusted server boundary    │
                           └───────┬───────────┬────────┘
                                   │           │
                          lookup   │           │ CRUD / RPC
                                   ▼           ▼
                    ┌───────────────────┐  ┌──────────────────────┐
                    │ Free Dictionary   │  │ Supabase PostgreSQL  │
                    │ API v2            │  │                      │
                    │                   │  │ words                │
                    │ /entries/en/word  │  │ streaks              │
                    └───────────────────┘  │ RPC review/random    │
                                           └──────────────────────┘
```

Data ownership:

```text
Dictionary API
    → canonical dictionary metadata

Supabase words
    → only words explicitly saved + complete API snapshot + review stats

Supabase streaks
    → daily personal learning activity

Next.js
    → UI + trusted orchestration layer
```

---

# 30. Official Technical References

For implementation verification, prefer official/current documentation:

- Next.js: `https://nextjs.org/docs`
- Supabase JavaScript: `https://supabase.com/docs/reference/javascript/introduction`
- Supabase: `https://supabase.com/docs`
- Free Dictionary API: `https://dictionaryapi.dev/`
- Free Dictionary API source/readme: `https://github.com/meetDeveloper/freeDictionaryAPI`
- Lucide React: `https://lucide.dev/guide/packages/lucide-react`

If package APIs have changed since this PRD was written, preserve the product architecture and security constraints while adapting only the package-specific syntax to current official documentation.
