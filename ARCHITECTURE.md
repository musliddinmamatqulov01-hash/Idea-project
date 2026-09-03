# Architecture

## Request flow

```
Client
  ↓
Middleware (RequestIdMiddleware)
  ↓
Global guards (ThrottlerGuard → JwtAuthGuard[bypassed by @Public()] → per-route RolesGuard)
  ↓
ValidationPipe (class-validator DTOs, whitelist + forbidNonWhitelisted)
  ↓
Controller (thin — no business logic)
  ↓
Service (all business logic, authorization checks, Prisma transactions)
  ↓
PrismaService → PostgreSQL
  ↓
ResponseInterceptor ({ data } / { data, pagination } envelope)
  ↓
HttpExceptionFilter (on error: { error: { code, message } })
```

Controllers only: extract params, call one service method, return its result. All ownership
checks, state-machine transitions, and transactional writes live in services.

## Module map

```
src/
  auth/            registration, login, refresh rotation, email verification, password reset
  users/            self-profile + public profile
  organizations/     orgs + membership roles (OWNER/ADMIN/MEMBER)
  categories/         business categories (public read, admin write)
  businesses/          business CRUD, ownership guard, publish/unpublish state machine,
                        listing sub-resource, metrics
  listings/            PUBLIC marketplace search + detail (whitelisted filters/sort, cursor pagination)
  verification/         BusinessVerification submission + admin/moderator review
  watchlists/            per-user saved businesses
  saved-searches/         stored filters + saved-search alert matching (BullMQ)
  offers/                offer/negotiation state machine, transactional accept → Deal creation
  conversations/           conversations + messages, membership-checked
  notifications/            DB notifications + Socket.IO push + queued emails
  documents/                 private object storage, access grants, signed URLs, audit log
  deals/                      deal room, participants, tasks, timeline, deal state machine
  due-diligence/                due diligence requests/items (deal-scoped)
  agreements/                    agreement versions + signatures (never legal advice — see AI.md)
  transactions/                   payment transaction record, provider-status webhook target
  billing/                         plans + subscriptions
  ai/                                AI provider abstraction, job queue, Zod-validated output
  reports/                            user-filed reports (business/user/message/listing)
  admin/                               moderation endpoints, all admin-role-gated + audited
  webhooks/                             Stripe-style webhook signature verification + idempotency
  health/                               liveness / readiness

  common/            guards, decorators, filters, interceptors, error codes, audit service,
                      cursor pagination, money (BigInt minor units), state-machine helper
  config/             Zod env validation (fails fast on missing/invalid config)
  database/            PrismaService (global module)
  storage/               S3-compatible object storage service (signed URLs)
  integrations/email/     EmailProvider abstraction (console provider by default)
  jobs/                    BullMQ queue registration + processors (email, AI, saved-search alerts)
```

## Key design decisions

**Business vs. Listing are separate models.** `Business` is the underlying company; `BusinessListing`
is its marketplace presentation (status, visibility, asking price, completeness score). This lets a
business exist in `DRAFT` before anything is public, and keeps "is this listing visible" logic out of
core business data.

**Money is never a float.** All amounts are `BigInt` minor units (cents) in Postgres
(`src/common/utils/money.ts`). API request/response bodies use major-unit numbers for ergonomics;
conversion happens at the service boundary, never inside a calculation.

**State machines are explicit and enforced server-side**, not just in the frontend:
`Business` (`DRAFT → PENDING_REVIEW → PUBLISHED → …`), `Offer`
(`DRAFT → SUBMITTED → COUNTERED/ACCEPTED/REJECTED/WITHDRAWN/EXPIRED`), and `Deal`
(`INITIATED → NDA → DUE_DILIGENCE → AGREEMENT → TRANSACTION → TRANSFER → COMPLETED`, with
`CANCELLED`/`DISPUTED` branches). See `src/common/utils/state-machine.ts`.

**Offer acceptance is the highest-risk concurrency path.** `OffersService.accept()` uses an atomic
conditional `UPDATE ... WHERE status IN (...)` inside a Prisma transaction: Postgres row-locks the
offer for the duration of the UPDATE, so a losing concurrent accept request sees `count === 0` and
fails with `OFFER_ALREADY_ACCEPTED` instead of racing past a stale read. The same transaction flips
the business to `SOLD`, expires all sibling negotiations/offers on that business, and creates the
`Deal` + `DealParticipant` rows + a `DealTimelineEvent` — all or nothing.

**Object-level authorization is enforced in every service**, not just "is authenticated." Examples:
`BusinessesService.findOwned` 404s (not 403s) a business you don't own and that isn't published, to
avoid confirming its existence; `OffersService.getParticipantOffer` only returns an offer to its buyer
or seller; `DocumentsService.getAccessibleDocument` checks owner / uploader / deal-participant /
explicit `DocumentAccess` grant / admin before ever generating a signed URL. See the IDOR tests in
`test/deal-flow.e2e-spec.ts`.

**Documents never expose a public storage URL.** Every download goes through
`GET /documents/:id/download`, which authorizes the request, generates a short-lived signed URL
(`STORAGE_SIGNED_URL_TTL_SECONDS`, default 300s), and writes a `DocumentAccessLog` row.

**Background work never blocks a request.** Saved-search alert matching, AI analysis, and
notification emails all run through BullMQ queues (`src/jobs/`); the HTTP response returns before
that work executes. Jobs use `DEFAULT_JOB_OPTIONS` (5 attempts, exponential backoff) so transient
failures self-heal without operator intervention.

**AI output is never trusted verbatim.** `AiProcessor` parses provider output through a Zod schema
(`BusinessAnalysisResultSchema`) before persisting; an invalid or malformed response fails the job
(status `FAILED`, user notified) rather than being stored. See AI.md.

## Known limitations (honest gaps, not hidden)

- **Search sort/filter is whitelist-based but simplified.** MRR/growth filtering matches against *any*
  qualifying metric row, not strictly the latest period snapshot — a materialized "current metrics"
  view is the natural next step at scale.
- **Payments are structurally real but provider-agnostic.** The webhook handler verifies Stripe-style
  HMAC signatures and is fully idempotent (`WebhookEvent` unique constraint), but no Stripe SDK call is
  wired to actually create a PaymentIntent — that integration point is `TransactionsService.create()`.
- **E2E test coverage** covers the auth flow and the full offer→deal→document critical path with IDOR
  checks; it does not yet cover every endpoint (AI failure handling, rate-limit responses, and the
  admin moderation endpoints are unit-testable but not yet covered by e2e specs).
- **Single-process deployment by default.** `src/jobs/worker.ts` exists as a standalone entry point,
  but `npm run start` currently runs the API and all BullMQ processors in one process — split them once
  queue volume warrants a dedicated worker deployment (see DEPLOYMENT.md).
