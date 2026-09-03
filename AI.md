# AI

## Architecture

```
POST /businesses/:id/ai-analysis
  ↓ AiService.requestAnalysis()  — checks daily rate limit for the caller's plan
  ↓ creates AIJob (status PENDING), enqueues to the `ai` BullMQ queue, returns immediately
  ↓
AiProcessor (background worker)
  ↓ loads Business + BusinessMetric rows, builds a BusinessAnalysisContext
  ↓ calls AIProvider.analyzeBusiness(context)   — swappable, see below
  ↓ validates the raw response against BusinessAnalysisResultSchema (Zod)
  ↓   invalid/unparseable → AIJob.status = FAILED, user notified, job NOT stored
  ↓   valid → AIAnalysis row created, AIJob.status = COMPLETED, user notified
```

`GET /businesses/:id/ai-analysis` returns the latest stored `AIAnalysis` (public). `GET /ai-jobs/:id`
returns job status for the requester who created it.

## Provider abstraction

```ts
interface AIProvider {
  readonly name: string;
  analyzeBusiness(context: BusinessAnalysisContext): Promise<RawAIOutput>;
}
```

(`src/ai/providers/ai-provider.interface.ts`). Bound via DI token `AI_PROVIDER` in `AiModule`. The
default implementation is `MockAIProvider` — a deterministic, offline provider used whenever
`AI_PROVIDER=mock` (the default). To wire a real model, implement `AIProvider` against your chosen SDK
(Anthropic/OpenAI/etc.) and swap the `useClass` in `AiModule`; nothing else in the codebase needs to change.

## Hallucination protection

- `MockAIProvider` (and any real implementation should follow the same contract) **never invents a
  number that isn't backed by a `BusinessMetric` row.** If no MRR/profit metric exists, `dataCompleteness`
  is `INSUFFICIENT_DATA`, `valuation` is `null`, and the summary says so explicitly rather than guessing.
- Every claim carries a `source` tag drawn from `VERIFIED_FACT | SELLER_PROVIDED | AI_INFERENCE | UNKNOWN`
  (see `founderDependency.source` in the schema) — the API and any client consuming it can distinguish
  "the AI inferred this" from "this came from a verified metric."
- **Output is validated, not trusted.** `BusinessAnalysisResultSchema` (Zod) is the single gate between
  provider output and the database — a malformed or hallucinated-shape response fails the job instead of
  being persisted (`src/jobs/processors/ai.processor.ts`).

## Failure handling

A provider exception, timeout, or schema-validation failure is caught inside `AiProcessor.process()`:
the job is marked `FAILED` with `errorMessage`, the user is notified ("AI analysis unavailable — please
try again later"), and **the error never propagates out of the worker** — an AI outage cannot take down
the main API or the queue. BullMQ additionally retries the job up to 5 times with exponential backoff
before giving up, in case the failure was transient (network blip, provider rate limit).

## Cost control & rate limiting

`AiService.assertWithinDailyLimit()` counts `AIJob` rows created by the user since midnight and compares
against `AI_MAX_REQUESTS_PER_DAY_FREE` / `AI_MAX_REQUESTS_PER_DAY_PRO` depending on whether they hold an
active `Subscription` — enforced server-side before a job is ever queued, so a client can't bypass it.
`AIJob` also has columns for `promptTokens` / `completionTokens` / `estimatedCostMinor` / `durationMs` for
a real provider integration to populate for cost tracking and observability.

## Valuation & legal disclaimers

- Valuation output is always labeled `confidence: LOW | MEDIUM | HIGH` and includes `factors` explaining
  the estimate — it is presented as an estimate, never a definitive number.
- `Agreement.generatedByAI` and `Agreement.reviewRequired` (defaults `true`) exist specifically so any
  AI-assisted contract draft is flagged as **not legal advice** and requiring human review before use —
  enforced at the schema level, not just a UI convention (see `AgreementsService.create`).
