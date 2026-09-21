# Billien

Billien is a multi-user English vocabulary app. Anyone can discover words as a guest; signing in makes Remembered words, random flip/review, and daily streak personal to that account.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Add the Neon `DATABASE_URL`, the branch's `NEON_AUTH_BASE_URL`, and a random `NEON_AUTH_COOKIE_SECRET` (at least 32 characters).
3. Run [`neon/schema.sql`](./neon/schema.sql) in the Neon SQL Editor or through the Neon MCP connection.
4. Add `http://localhost:3000` and the production origin to Neon Auth's trusted domains.
5. Install and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run lint
npm run build
```

The browser talks only to Next.js API routes and the Neon Auth proxy. `DATABASE_URL` and `NEON_AUTH_COOKIE_SECRET` stay server-only and must never use the `NEXT_PUBLIC_` prefix. The data routes derive the user ID from the server-side session, so one account cannot access another account's saved words, reviews, or streak.
