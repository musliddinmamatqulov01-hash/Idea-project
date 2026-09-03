# Database

PostgreSQL via Prisma. Full schema: [`prisma/schema.prisma`](./prisma/schema.prisma).

## Entity groups

- **Identity:** `User`, `Profile`, `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken`
- **Organizations:** `Organization`, `OrganizationMember`
- **Business & listing:** `BusinessCategory`, `Business`, `BusinessListing`, `BusinessMetric`
- **Verification:** `BusinessVerification`, `VerificationItem`, `VerificationEvent`
- **Documents:** `BusinessDocument`, `DocumentAccess`, `DocumentAccessLog`
- **Discovery:** `Watchlist`, `SavedSearch`
- **Offers:** `Negotiation`, `Offer`, `OfferRevision`
- **Messaging:** `Conversation`, `ConversationParticipant`, `Message`, `MessageAttachment`
- **Deal room:** `Deal`, `DealParticipant`, `DealTask`, `DealTimelineEvent`, `DueDiligenceRequest`, `DueDiligenceItem`
- **Agreements:** `Agreement`, `AgreementVersion`, `AgreementSignature`
- **Payments:** `Transaction`, `TransactionEvent`, `Plan`, `Subscription`, `Payment`, `Invoice`, `WebhookEvent`
- **Notifications:** `Notification`, `NotificationPreference`
- **AI:** `AIConversation`, `AIMessage`, `AIAnalysis`, `AIJob`
- **Trust & safety:** `Report`, `AdminAction`, `AuditLog`

## Conventions

- **Primary keys:** `uuid()` everywhere — no sequential integer IDs are exposed, so resource
  existence/count can't be inferred from an ID.
- **Money:** `BigInt` minor units (cents) — see `src/common/utils/money.ts`. Never a `Float`/`Decimal`
  arithmetic bug waiting to happen.
- **Soft delete:** `deletedAt` on `User`, `Business`, `BusinessDocument` — application code filters
  `deletedAt: null`; nothing is destructively removed for these entities.
- **Foreign keys & cascades:** relations owned by their parent (e.g. `Profile`, `RefreshToken`,
  `ConversationParticipant`, `DealTask`) cascade-delete; cross-entity references that must survive
  independently (e.g. `Business.ownerId → User`) do not.
- **Unique constraints enforcing business rules**, not just data hygiene:
  - `User.email`, `Business.slug`, `Organization.slug`
  - `Watchlist(userId, businessId)`, `OrganizationMember(organizationId, userId)`
  - `Deal.negotiationId`, `Deal.acceptedOfferId` — a negotiation/offer can produce **at most one** deal
  - `WebhookEvent(provider, eventId)` — webhook idempotency at the database level, not just app logic
  - `DocumentAccess(documentId, granteeId)`, `AgreementSignature(agreementVersionId, userId)`
- **Indexes** on every foreign key used in a hot lookup path, plus the fields the spec calls out
  explicitly: `Business.status`, `Business.ownerId`, `BusinessListing.status`/`visibility`,
  `Offer.status`/`buyerId`/`sellerId`, `Message.conversationId`, `Deal.status`, `Notification(userId, readAt)`,
  `AuditLog.userId`/`action`.

## Migrations

```bash
npm run prisma:migrate          # create + apply a new migration (dev)
npm run prisma:migrate:deploy   # apply pending migrations (CI/production — no prompts, no drift check)
npm run prisma:studio           # inspect data visually
```

Migrations are checked into `prisma/migrations/` and must never be edited after being applied to any
shared environment — create a new migration instead (see SECURITY.md's "don't run destructive ops" note).
