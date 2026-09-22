# PLANNING.md — Legacy Datamuse + Free Dictionary API Integration

> **Scope override — 22 September 2026:** Billien now uses only Free Dictionary API for explicit word searches. Datamuse discovery, autocomplete, cached word pools, and related API routes have been removed. The remainder of this document is retained as historical planning context and must not override the active PRD scope or `README.md` setup.

## 1. Goal

Build the **Words** experience using two external APIs with clear responsibilities and minimal unnecessary requests:

- **Datamuse API** → discovery, autocomplete, incomplete-word search, spelling/similar suggestions.
- **Free Dictionary API (`dictionaryapi.dev`)** → exact word detail, meanings, phonetics, audio, examples, synonyms, antonyms.
- **Supabase** → remembered words, review history/statistics, and daily streak activity.

Core rule:

> **Datamuse discovers a word. Free Dictionary describes the selected word. Supabase remembers the learning history.**

Do not fetch full dictionary detail for every visible discovery card.

---

## 2. External API Constraints

### Datamuse

Base URL:

```text
https://api.datamuse.com
```

Relevant endpoints:

```text
GET /words
GET /sug
```

Important constraints:

- `/sug` is designed for autocomplete.
- `/words` is a word-finding/discovery endpoint.
- `/words` query parameters are optional.
- `max` defaults to 100 and cannot exceed 1000.
- Datamuse does **not** expose normal `page` or `offset` pagination.
- Default English vocabulary is roughly 550,000 terms, including multiword expressions.
- Until January 1, 2027, Datamuse documents no-key access up to 100,000 requests/day; an API key is expected to be required after that date.

Official docs:

```text
https://www.datamuse.com/api/
```

### Free Dictionary API

Endpoint:

```text
GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

Important behavior:

- Requires an exact word.
- It is not an autocomplete service.
- The response can contain multiple entries for a word.
- Important fields include:
  - `word`
  - `phonetic`
  - `phonetics`
  - `meanings`
  - `license`
  - `sourceUrls`
- Use `phonetics[].audio` for pronunciation audio when available.

Official project:

```text
https://github.com/meetDeveloper/freeDictionaryAPI
```

---

## 3. Responsibility Split

```text
DATAMUSE
├── initial discovery words
├── autocomplete
├── incomplete search text
└── spelling / similar-word fallback

FREE DICTIONARY API
├── exact word detail
├── definition
├── phonetics
├── pronunciation audio
├── part of speech
├── examples
├── synonyms
└── antonyms

SUPABASE
├── remembered words
├── added_at
├── review_count
├── remembered_count
├── forgotten_count
├── last_reviewed_at
└── streak activity
```

---

## 4. Required Tools

Main stack:

```text
Next.js App Router
TypeScript
Tailwind CSS
Supabase
@supabase/supabase-js
Lucide React
TanStack Query
```

Add TanStack Query:

```bash
npm install @tanstack/react-query
```

Use it for:

- request caching
- request deduplication
- `useInfiniteQuery`
- `fetchNextPage()` control
- loading/error states
- search suggestion cache
- dictionary detail cache

Do not add Redux or another global state library for this MVP.

---

## 5. High-Level Architecture

```text
Browser / Next.js UI
        │
        ▼
TanStack Query
        │
        ▼
Next.js Route Handlers
        │
        ├───────────────┬──────────────────┬──────────────┐
        ▼               ▼                  ▼              │
     Datamuse    Free Dictionary API    Supabase          │
        │               │                  │              │
     discover        exact detail       remembered        │
     suggest         audio/meaning      review/streak      │
```

Do not spread third-party API URLs throughout React components.

All external API access should go through a small service layer so caching, retries, future API keys, and error normalization live in one place.

---

## 6. Internal API Routes

Create:

```text
src/app/api/
├── discover/
│   └── route.ts
├── search/
│   └── suggestions/
│       └── route.ts
├── dictionary/
│   └── [word]/
│       └── route.ts
├── words/
│   ├── route.ts
│   └── random/
│       └── route.ts
└── review/
    └── route.ts
```

Responsibilities:

| Route | Responsibility |
|---|---|
| `GET /api/discover` | paged discovery feed generated from cached Datamuse pools |
| `GET /api/search/suggestions?q=` | autocomplete via Datamuse `/sug` |
| `GET /api/dictionary/:word` | exact detail from Free Dictionary |
| `GET /api/words` | remembered words from Supabase |
| `POST /api/words` | remember a canonical dictionary word |
| `GET /api/words/random?count=10` | random remembered words |
| `POST /api/review` | record remember/forgot review result |

---

## 7. External Service Layer

Create:

```text
src/lib/
├── datamuse/
│   ├── client.ts
│   ├── discover.ts
│   └── types.ts
├── dictionary/
│   ├── client.ts
│   ├── normalize.ts
│   └── types.ts
└── supabase/
    └── server.ts
```

The route handlers should call these services instead of calling external APIs directly.

Example:

```text
/api/dictionary/[word]
        ↓
getDictionaryWord(word)
        ↓
dictionary/client.ts
        ↓
dictionaryapi.dev
```

`GET word detail` and `POST remember word` must use the **same cached dictionary function**.

---

# SEARCH PLAN

## 8. Empty Query

When:

```text
query = ""
```

Do not call the search endpoint.

Show the normal Discover feed instead.

---

## 9. Minimum Query Length

Use:

```text
minimum search suggestion length = 2 characters
```

Example:

```text
"a"
→ no API request

"ac"
→ suggestion request allowed
```

This reduces unnecessary API hits.

---

## 10. Debounce

Search autocomplete must use a **300 ms debounce**.

```ts
const SEARCH_DEBOUNCE_MS = 300;
```

Flow:

```text
user types:

a
ac
ach
achi
achie

      ↓

wait 300 ms after last change

      ↓

GET /api/search/suggestions?q=achie
```

Do not fire one request for every keystroke.

---

## 11. Cancel Stale Search Requests

Debounce alone is not sufficient.

Use TanStack Query's `signal` in the fetch function so obsolete requests can be aborted/ignored.

Concept:

```ts
queryFn: ({ signal }) =>
  fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, {
    signal,
  })
```

This avoids race conditions such as:

```text
request A: "ach"
request B: "achie"

B finishes first
A finishes later

❌ UI must not switch back to old "ach" results
```

---

## 12. Search Suggestions

Internal request:

```text
GET /api/search/suggestions?q=achie
```

Server request:

```text
GET https://api.datamuse.com/sug?s=achie&max=10
```

Recommended suggestion size:

```text
10
```

Normalized response:

```json
{
  "query": "achie",
  "items": [
    {
      "word": "achieve",
      "score": 1234
    }
  ]
}
```

Do not return unused external fields to the UI.

---

## 13. Search Caching

### Client cache

Recommended TanStack Query defaults for suggestions:

```text
staleTime: 5 minutes
gcTime: 30 minutes
```

Example:

```text
search "achie" → request
search "hello" → request
search "achie" again shortly → reuse cache
```

### Server cache

Suggestions may also be cached briefly:

```text
1–5 minutes
```

---

## 14. Selecting a Suggestion

Example:

```text
input: achie

Datamuse:
achieve
achievement
achievable
```

User clicks `achieve`:

```text
GET /api/dictionary/achieve
```

Only then should Free Dictionary be called.

---

## 15. Pressing Enter

If the user explicitly submits an input:

```text
achieve
```

Flow:

```text
Enter
  ↓
Free Dictionary exact lookup
  ↓
found?
├── yes → show detail
└── no  → show Datamuse suggestions / "Did you mean?"
```

This allows exact words to open immediately while incomplete or misspelled input still has a fallback.

---

# WORD DETAIL PLAN

## 16. Detail Request

A word becomes eligible for a Dictionary API request only after explicit user intent:

- Discover card clicked
- Search suggestion clicked
- Exact search submitted

Example:

```text
GET /api/dictionary/achieve
```

Server calls:

```text
GET https://api.dictionaryapi.dev/api/v2/entries/en/achieve
```

Do **not** fetch dictionary data while rendering every discovery card.

Bad:

```text
30 cards visible
→ 30 Dictionary API calls
```

Correct:

```text
30 Datamuse cards visible
→ 0 Dictionary API calls

user clicks 1 card
→ 1 Dictionary API lookup
```

---

## 17. Dictionary Server Cache

Dictionary content changes infrequently.

Recommended server cache:

```text
7 days
```

Concept:

```ts
fetch(url, {
  next: {
    revalidate: 60 * 60 * 24 * 7,
  },
})
```

Cache is naturally separated by word URL.

---

## 18. Remember Without Duplicate Dictionary Hit

When user clicks:

```text
+ Remember
```

Client sends only:

```json
{
  "word": "achieve"
}
```

Do not trust full arbitrary dictionary data posted from the browser.

Server flow:

```text
POST /api/words
      ↓
getDictionaryWord("achieve")
      ↓
shared cached dictionary service
      ↓
canonical API response
      ↓
Supabase
```

Because word detail and Remember share the same cached dictionary service, a word that has just been opened should normally **not cause a second upstream Free Dictionary API hit**.

This provides both:

- server-side canonical validation
- API-hit optimization

---

# DISCOVER / INFINITE SCROLL PLAN

## 19. Discover Mode

When search is empty, the Words tab shows discovery cards from Datamuse.

Example:

```text
WORDS

[ Search words... ]

achieve
approach
aware
benefit
challenge
consider
...
```

The cards are lightweight and contain only Datamuse-level data.

Clicking a card opens Free Dictionary detail in Column 2.

---

## 20. Datamuse Does Not Have Normal Pagination

Do not assume Datamuse supports:

```text
?page=1
?page=2
```

or:

```text
?offset=30
```

Also do not repeatedly request:

```text
/words?max=30
```

because repeated identical queries return the same top results.

The app must provide **its own cursor pagination** on top of a cached Datamuse pool.

---

## 21. Initial Discovery Pool

Server initially requests a large pool:

```text
https://api.datamuse.com/words?max=1000
```

Cache it server-side.

Recommended cache duration:

```text
24 hours
```

Do not send all 1000 items to the browser at once.

Instead:

```text
Datamuse pool: 1000 words
            ↓
server cache
            ↓
UI page 1: 30
UI page 2: 30
UI page 3: 30
...
```

This means scrolling through many UI batches can still correspond to only **one upstream Datamuse request** while the pool cache is valid.

---

## 22. Internal Discover Cursor

Internal endpoint:

```text
GET /api/discover?cursor={cursor}
```

Recommended UI batch size:

```text
30 words
```

Response:

```json
{
  "items": [
    {
      "word": "achieve",
      "score": 100
    }
  ],
  "nextCursor": "opaque-cursor",
  "hasMore": true
}
```

The browser should not care how Datamuse is being partitioned internally.

The server cursor can encode:

```json
{
  "bucket": "popular",
  "offset": 90
}
```

Serialize it as an opaque URL-safe string if desired.

---

## 23. Beyond the First 1000 Results

A no-constraint Datamuse response cannot be paginated beyond its returned maximum.

When the initial popular pool is exhausted, move through cached **prefix buckets**:

```text
popular
→ a*
→ b*
→ c*
...
→ z*
```

Examples:

```text
/words?sp=a*&max=1000
/words?sp=b*&max=1000
/words?sp=c*&max=1000
```

Each bucket should be cached independently for 24 hours.

Internal cursor example:

```text
popular:990
   ↓
a*:0
   ↓
a*:30
   ↓
a*:60
...
   ↓
b*:0
```

The user experiences one continuous feed.

If a single-letter bucket eventually becomes insufficient, the server strategy can later be extended to two-letter prefixes (`aa*`, `ab*`, etc.) without changing the client contract.

---

## 24. Duplicate Removal

The popular pool and prefix pools can overlap.

Deduplicate by:

```ts
word.trim().toLowerCase()
```

Client should maintain a `Set<string>` of rendered normalized words before appending a page.

Server should also avoid duplicates inside a single returned batch when practical.

---

## 25. Single-Word Policy

Datamuse includes multiword expressions such as phrases.

For this MVP, use:

```text
single English words only
```

Filter candidates that contain whitespace.

Concept:

```ts
const isSingleWord = !word.trim().includes(" ");
```

Phrase learning can be a separate future feature.

---

## 26. Seamless Infinite Scrolling

Use:

```text
TanStack Query useInfiniteQuery
+
IntersectionObserver
```

Do not use a manual `Load More` button for the primary flow.

Do not use a raw scroll-event listener unless there is a specific need.

Flow:

```text
render first 30
    ↓
user scrolls
    ↓
sentinel approaches viewport
    ↓
fetch next internal page
    ↓
append items
    ↓
sentinel moves down
```

Recommended observer prefetch distance:

```text
rootMargin: "500px"
```

This starts loading before the user reaches the absolute bottom, making the feed feel seamless.

---

## 27. `useInfiniteQuery` Rules

Concept:

```ts
useInfiniteQuery({
  queryKey: ["discover"],
  queryFn: ({ pageParam }) => getDiscoverPage(pageParam),
  initialPageParam: null,
  getNextPageParam: (lastPage) =>
    lastPage.nextCursor ?? undefined,
  staleTime: 1000 * 60 * 30,
});
```

IntersectionObserver must only call `fetchNextPage()` when:

```text
sentinel visible
AND hasNextPage = true
AND isFetchingNextPage = false
```

The `isFetchingNextPage` check is mandatory to avoid duplicate concurrent requests.

---

## 28. Search Mode vs Discover Mode

### Discover mode

```text
searchQuery = ""
```

Show the infinite discovery feed.

### Search mode

```text
searchQuery.length >= 2
```

Show Datamuse search suggestions/results.

While Search mode is active:

```text
Do not continue fetching Discover pages.
```

When the query is cleared, return to the previous Discover state.

TanStack Query keeps the loaded Discover pages cached, so the user should not lose their previous scroll dataset unnecessarily.

---

## 29. Detail Selection State

Keep selection separate from fetched list state.

Example:

```ts
const [selectedWord, setSelectedWord] = useState<string | null>(null);
```

Flow:

```text
Discover card or Search suggestion
            ↓
setSelectedWord(word)
            ↓
["dictionary-word", normalizedWord]
            ↓
Column 2 detail
```

Do not copy the complete Dictionary API payload into unnecessary global state.

TanStack Query should own fetched remote data.

---

## 30. Do Not Prefetch Every Detail

Do not do this:

```text
render 30 cards
→ prefetch 30 dictionary entries
```

This defeats the entire optimization strategy.

Initial implementation should fetch Dictionary detail only on explicit click/selection/submit.

---

# API-HIT OPTIMIZATION

## 31. Datamuse Discovery Optimization

Bad:

```text
UI wants 30 more words
→ new Datamuse call
→ repeat every page
```

Target:

```text
1 large Datamuse request
→ cached pool
→ many internal 30-word pages
```

---

## 32. Datamuse Search Optimization

Required:

```text
✅ minimum 2 characters
✅ debounce 300 ms
✅ cancel stale requests
✅ max 10 suggestions
✅ TanStack Query cache
✅ short server cache
```

Forbidden:

```text
❌ request on every keystroke
❌ request for empty query
❌ request for one character
```

---

## 33. Dictionary Optimization

Required:

```text
✅ exact detail only after user intent
✅ server cache by normalized word
✅ long TTL
✅ reuse shared cache during Remember
```

Forbidden:

```text
❌ dictionary call per discovery card
❌ immediate duplicate call when remembering a word already opened
```

---

## 34. Supabase Optimization

After Remember:

Invalidate only affected client queries, for example:

```ts
["remembered-words"]
```

Do not invalidate dictionary detail because its content did not change.

After a review result, invalidate/refetch only relevant review/remembered/streak data.

---

## 35. Expected Request Behavior

Example: user opens the app and scrolls through 150 discovery cards.

Bad implementation:

```text
5 UI pages
= 5 Datamuse requests
+ potentially 150 Dictionary API requests
```

Target implementation:

```text
1 cached Datamuse pool request
+ 0 Dictionary requests until a card is selected
```

User clicks 3 different words:

```text
≈ 3 Dictionary lookups
```

User opens one of them again while cached:

```text
0 new upstream Dictionary calls
```

User remembers that already-opened word:

```text
shared cached dictionary lookup
+ 1 Supabase write
```

---

## 36. Suggested Cache Durations

| Data | Client cache | Server cache |
|---|---:|---:|
| Discover internal pages | 30 min | Datamuse pool 24 h |
| Search suggestions | 5 min | 1–5 min |
| Dictionary detail | 30 min+ | 7 days |
| Remembered words | invalidate on write | Supabase source of truth |
| Streak | invalidate on activity | Supabase source of truth |

These are application defaults, not guarantees from the external APIs.

---

# UI LOADING BEHAVIOR

## 37. Initial Discover Loading

Use lightweight skeleton cards/rows.

Do not block the entire one-page layout.

---

## 38. Infinite Scroll Loading

When loading the next page:

- keep existing cards visible
- keep existing cards clickable
- show only a small bottom loader/skeleton
- do not replace Column 1 with a full-screen spinner

Example:

```text
word
word
word
word

loading more…
```

---

## 39. Detail Loading

When a card is selected, only Column 2 enters the word-detail loading state.

Column 1 remains usable.

This preserves the master-detail one-page experience.

---

# ERROR / NETWORK PLAN

## 40. Normalize External Errors

Do not expose raw third-party error structures directly to React components.

Example internal response:

```json
{
  "error": {
    "code": "DICTIONARY_WORD_NOT_FOUND",
    "message": "No dictionary entry was found."
  }
}
```

Handle:

```text
400
404
429
500+
network timeout
invalid JSON
empty Datamuse result
```

---

## 41. Retry Policy

Do not aggressively retry free third-party APIs.

Recommended:

```text
404 → no automatic retry
429 → no tight retry loop
5xx → maximum 1–2 retries with backoff
```

Search failures should not trigger repeated background traffic.

---

## 42. Request Timeout

External requests should have a timeout around:

```text
5–8 seconds
```

Use `AbortSignal.timeout()` where supported or an AbortController timeout wrapper.

---

# SUPABASE FLOW

## 43. Remember Word

```text
Column 2
   │
   │ + Remember
   ▼
POST /api/words
{ "word": "achieve" }
   │
   ▼
server canonical dictionary lookup
(cached)
   │
   ▼
Supabase upsert
   │
   ├── words
   └── streaks
```

Store normalized useful fields and the complete dictionary API response.

Recommended columns:

```text
id
word
normalized_word
phonetic
phonetics JSONB
meanings JSONB
license JSONB
source_urls TEXT[]
api_entries JSONB
added_at
last_reviewed_at
review_count
remembered_count
forgotten_count
```

`api_entries` should contain the complete Free Dictionary API response array used when the word was remembered.

---

## 44. Streak

Streak is not controlled by external dictionary APIs.

Increment local activity when the user:

```text
adds/remember a new word
or
performs a review action
```

Suggested streak table:

```text
activity_date DATE UNIQUE
learned_count INTEGER
review_count INTEGER
created_at
updated_at
```

Use the Asia/Jakarta calendar date for this personal app.

---

# FILE / COMPONENT PLAN

## 45. Suggested Structure

```text
src/
├── app/
│   ├── page.tsx
│   └── api/
│       ├── discover/
│       │   └── route.ts
│       ├── search/
│       │   └── suggestions/
│       │       └── route.ts
│       ├── dictionary/
│       │   └── [word]/
│       │       └── route.ts
│       ├── words/
│       │   ├── route.ts
│       │   └── random/
│       │       └── route.ts
│       └── review/
│           └── route.ts
├── components/
│   ├── word-search.tsx
│   ├── word-list.tsx
│   ├── word-card.tsx
│   ├── word-detail.tsx
│   ├── remembered-list.tsx
│   ├── review-panel.tsx
│   └── infinite-scroll-sentinel.tsx
├── hooks/
│   ├── use-debounce.ts
│   ├── use-discover.ts
│   ├── use-search-suggestions.ts
│   └── use-word-detail.ts
├── lib/
│   ├── datamuse/
│   │   ├── client.ts
│   │   ├── discover.ts
│   │   └── types.ts
│   ├── dictionary/
│   │   ├── client.ts
│   │   ├── normalize.ts
│   │   └── types.ts
│   └── supabase/
│       └── server.ts
└── providers/
    └── query-provider.tsx
```

---

# IMPLEMENTATION ORDER

## 46. Phase 1 — External Service Layer

1. Define Datamuse types.
2. Define Dictionary API types.
3. Create normalized fetch helpers.
4. Add timeout handling.
5. Add server caching.
6. Normalize third-party errors.

Do this before wiring the full UI.

---

## 47. Phase 2 — Search

1. Build search input.
2. Add `useDebounce(..., 300)`.
3. Add 2-character minimum.
4. Create `/api/search/suggestions`.
5. Add cancellation support.
6. Render suggestions.
7. Click suggestion → exact Dictionary detail.
8. Enter exact word → Dictionary first, Datamuse fallback if not found.

---

## 48. Phase 3 — Discover Infinite Scroll

1. Build server Datamuse `max=1000` pool.
2. Cache pool for 24 h.
3. Build `/api/discover` with internal cursor.
4. Return 30 items per internal page.
5. Build `useInfiniteQuery` hook.
6. Add IntersectionObserver sentinel.
7. Use `rootMargin: 500px`.
8. Prevent concurrent `fetchNextPage()`.
9. Deduplicate normalized words.
10. Add prefix-bucket continuation after initial pool is exhausted.

---

## 49. Phase 4 — Dictionary Detail

1. Select a card.
2. Fetch exact word only once needed.
3. Render word and phonetic.
4. Render meanings grouped by part of speech.
5. Render examples when available.
6. Add audio button from `phonetics[].audio`.
7. Handle missing audio gracefully.
8. Add Remember action.

---

## 50. Phase 5 — Remember + Supabase

1. Client posts only the word.
2. Server reuses cached canonical dictionary service.
3. Upsert Supabase word.
4. Preserve `added_at` correctly.
5. Save `api_entries` raw response.
6. Update streak activity.
7. Invalidate remembered-word query only.

---

## 51. Phase 6 — Remembered + Random Review

1. Load remembered words from Supabase.
2. Add remembered-word local/server search.
3. Randomly select requested count.
4. Show flashcard-style review.
5. Record Remember/Forgot result.
6. Update `last_reviewed_at`.
7. Update counters.
8. Update streak.

---

# ACCEPTANCE CRITERIA

## 52. Search Acceptance Criteria

Search is complete when:

- empty query sends no search request
- one-character query sends no suggestion request
- autocomplete uses approximately 300 ms debounce
- `achie` can suggest `achieve`
- stale requests cannot overwrite newer results
- suggestion click loads Free Dictionary detail
- exact Enter search works
- failed exact search can fall back to suggestions
- identical recent searches reuse cache

---

## 53. Discover Acceptance Criteria

Discover is complete when:

- words appear before the user searches
- only a small UI batch is initially rendered
- next batches load automatically near the bottom
- no Load More button is required
- existing cards remain interactive while loading more
- duplicate concurrent next-page calls are prevented
- duplicate words are filtered
- multiple UI pages can come from a single cached Datamuse upstream request
- after initial pool exhaustion, another discovery bucket can be used
- Free Dictionary is never called just because a card becomes visible

---

## 54. Optimization Acceptance Criteria

Implementation is **not accepted** if it:

- calls Datamuse on every keystroke
- calls search for an empty query
- calls Dictionary API for all discovery cards
- performs a second immediate Dictionary upstream request when remembering a just-opened cached word
- calls the same discovery pool repeatedly while cache is valid
- triggers multiple `fetchNextPage()` calls concurrently
- keeps fetching Discover pages while Search mode is active

---

# DEVELOPMENT OBSERVABILITY

## 55. Development Logging

In development only, optionally log upstream cache misses:

```text
[DATAMUSE] MISS discovery: popular
[DATAMUSE] MISS suggestions: achie
[DICTIONARY] MISS achieve
```

This makes accidental over-fetching visible.

Never log Supabase secrets or future API keys.

---

# FUTURE-PROOFING

## 56. Datamuse API Key Migration

Because Datamuse states an API key will be required starting January 1, 2027, keep all Datamuse calls behind the Next.js server service.

Future change should ideally only require modifying:

```text
src/lib/datamuse/client.ts
```

and adding:

```env
DATAMUSE_API_KEY=
```

Do not make the UI aware of the external API-key mechanism.

---

## 57. Optional Future DOM Virtualization

Infinite scrolling can eventually produce many DOM cards.

For MVP, a few hundred lightweight cards are acceptable.

If actual performance becomes poor, add:

```text
@tanstack/react-virtual
```

Do not add virtualization before there is a real rendering need.

API optimization and DOM virtualization are separate concerns.

---

# FINAL FLOW

## 58. Discover

```text
Page opens
   ↓
GET /api/discover
   ↓
server cached Datamuse pool
   ↓
30 cards
   ↓
IntersectionObserver detects near-bottom sentinel
   ↓
next internal slice
   ↓
append seamlessly
```

## 59. Search

```text
User types "achie"
   ↓
300 ms debounce
   ↓
GET /api/search/suggestions?q=achie
   ↓
Datamuse /sug
   ↓
user selects "achieve"
```

## 60. Detail

```text
achieve
   ↓
GET /api/dictionary/achieve
   ↓
cached Free Dictionary lookup
   ↓
Column 2 detail + audio
```

## 61. Remember

```text
+ Remember
   ↓
POST /api/words
{ word: "achieve" }
   ↓
shared canonical cached Dictionary lookup
   ↓
Supabase words upsert
   ↓
streak activity
```

## 62. Review

```text
Random tab
   ↓
Supabase remembered words
   ↓
random N
   ↓
Remember / Forgot
   ↓
review stats + streak
```

---

## 63. Non-Negotiable Principle

> **Do not enrich data earlier than necessary.**

A word being visible in Discover does not justify a Free Dictionary request.

A full Dictionary lookup should happen only after explicit user intent: click, suggestion selection, or exact search submission.
