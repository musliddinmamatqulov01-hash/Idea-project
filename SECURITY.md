# Security

## Authentication

- **Passwords:** Argon2id (`src/auth/password.service.ts`), never logged, never returned by any
  endpoint (Prisma `select`/DTO shaping excludes `passwordHash` everywhere it matters).
- **Access tokens:** short-lived JWT (`JWT_ACCESS_TTL`, default 15m), signed with `JWT_SECRET`.
- **Refresh tokens:** opaque random tokens (32 bytes), **only the SHA-256 hash is persisted** —
  the raw token is not recoverable from the database even by an operator with DB access
  (`src/auth/token.service.ts`). Rotated on every `/auth/refresh` call; reuse of an already-rotated
  token revokes the entire token family (stolen-token detection).
- **Email verification / password reset tokens:** same opaque-token-hashed-at-rest pattern, single-use
  (`usedAt`), expiring (24h / 1h respectively).
- **Cookies:** `httpOnly`, `sameSite=lax`, `secure` in production; refresh token cookie is
  path-scoped to `/api/v1/auth` so it is never sent on unrelated requests.
- **Password reset does not reveal account existence** — `/auth/forgot-password` always returns the
  same response whether or not the email is registered.

## Authorization

- **Every mutating endpoint requires authentication** by default — `JwtAuthGuard` is a **global**
  guard; routes opt out individually with `@Public()`, not the other way around, so a new endpoint is
  locked down unless someone deliberately opens it.
- **Role checks never trust the client.** `role` on the JWT payload is set by the server at issuance
  from the database record; `RolesGuard` reads it from the verified token, never from a request body.
- **Object-level authorization is enforced in every service method that loads a resource by ID** —
  see the "Object-level authorization" section of ARCHITECTURE.md for concrete examples. A resource
  that exists but that the caller isn't entitled to see returns `404`, not `403`, wherever revealing
  existence would itself be a leak (business detail, offers, deals).
- **Admin actions are role-gated (`RolesGuard` + `@Roles(ADMIN)`) and every one is written to both
  `AdminAction` and `AuditLog`** (`AdminService`) — there is no silent admin action.

## Documents

- Object storage is never public — every file lives behind a private bucket key
  (`StorageService.buildObjectKey` embeds a random id, not a guessable path).
- Downloads only ever happen through `GET /documents/:id/download`, which authorizes first, then
  mints a signed URL with a short TTL (`STORAGE_SIGNED_URL_TTL_SECONDS`, default 300s).
- Every upload/view/download/grant/revoke/delete is written to `DocumentAccessLog`.
- Upload validation: MIME-type whitelist + 25MB size cap enforced both at the Multer layer and again
  in `DocumentsService.upload` (defense in depth — a proxy or future upload path might skip Multer's check).

## Concurrency & data integrity

- Offer acceptance uses an atomic conditional `UPDATE ... WHERE status IN (...)` inside a Prisma
  transaction to guarantee exactly one buyer can ever win a business — see ARCHITECTURE.md.
- Webhook processing is idempotent via a `(provider, eventId)` **unique constraint** on `WebhookEvent`,
  not just an application-level check — a duplicate delivery cannot be double-processed even under
  concurrent webhook retries.
- State machines (`Business`, `Offer`, `Deal`) reject invalid transitions server-side regardless of
  what the client requests.

## Input validation & injection

- Every request body/query/param is validated by a `class-validator` DTO with
  `whitelist: true, forbidNonWhitelisted: true` — unexpected fields are rejected, not silently dropped
  or passed through.
- All database access goes through Prisma's parameterized query builder — no raw SQL string
  concatenation anywhere in the codebase.
- Search/sort fields are explicitly whitelisted (`SearchListingsDto`'s `sortBy` enum) — never
  interpolated from user input into an `ORDER BY`.

## Transport & headers

- `helmet()` for standard security headers.
- CORS is restricted to `FRONTEND_URL` with `credentials: true` — not `*`.
- Structured logging (`nestjs-pino`) redacts `Authorization`, `Cookie`, and any `password`/`token`
  field automatically; a request ID (`RequestIdMiddleware`) is attached to every request/response
  and included in error responses for correlation without needing to log secrets.

## Configuration

- `src/config/env.validation.ts` (Zod) validates all required environment variables **at startup** —
  a missing or malformed `DATABASE_URL`, JWT secret, etc. crashes the process immediately with a clear
  message rather than silently running with `undefined` secrets.
- Secrets are never committed — `.env` is gitignored; `.env.example` documents every variable with
  placeholder values only.

## Known gaps to close before production

- **npm audit** currently reports vulnerabilities in transitive dev-tooling dependencies (run
  `npm audit` for the current list) — none are in the runtime dependency graph of a deployed
  container, but they should be triaged before shipping.
- **2FA (TOTP)** is not yet implemented — `User`/auth architecture has room for it (add a
  `totpSecret`/`totpEnabled` pair to `User` and three endpoints under `/auth/2fa/*`), but it's not wired.
- **Malware/AV scanning** of uploaded documents is not implemented — MIME/size validation only.
