# Billien

Billien is a multi-user English vocabulary app. Anyone can search an English word as a guest; Google sign-in makes Remembered words, random flip/review, and daily streak personal to a verified account.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Add the Neon `DATABASE_URL`, the branch's `NEON_AUTH_BASE_URL`, and a random `NEON_AUTH_COOKIE_SECRET` (at least 32 characters).
3. Run [`neon/schema.sql`](./neon/schema.sql) in the Neon SQL Editor or through the Neon MCP connection.
4. In Neon Console → **Auth**, enable the Google provider and disable the Email/Password provider. If Neon asks for Google OAuth credentials, create the OAuth client in Google Cloud Console and copy the redirect URI shown by Neon exactly into that client.
5. Add `http://localhost:3000` and the production origin to Neon Auth's trusted domains. Add `http://localhost:3001` too when port 3000 is occupied locally.
6. Install and start the app:

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

The browser talks only to Next.js API routes and the Neon Auth proxy. [`proxy.ts`](./proxy.ts) exchanges the OAuth callback verifier for the app's first-party session cookie. `DATABASE_URL` and `NEON_AUTH_COOKIE_SECRET` stay server-only and must never use the `NEXT_PUBLIC_` prefix. The data routes derive the user ID from the server-side session, so one account cannot access another account's saved words, reviews, or streak. Words are searched directly through Free Dictionary API; Billien does not provide a discovery feed or Datamuse autocomplete.
