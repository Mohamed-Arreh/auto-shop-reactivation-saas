# Architecture

The system is built around four core abstractions, each behind an interface so providers can be swapped without rewriting application code. This is the most important architectural decision in the project — it means CSV imports, Tekmetric API integration, and future shop management system integrations all flow through the same ingestion pipeline.

## The Four Core Abstractions

### 1. DataSourceAdapter

Handles ingesting customer/RO/declined work data from any source. CSV uploads, Tekmetric API, Mitchell 1 API, ShopWare API, Google Sheets, and manual entry all implement the same interface.

```typescript
export interface DataSourceAdapter {
  type: DataSourceType;
  displayName: string;
  
  authenticate(credentials: unknown): Promise<AuthResult>;
  testConnection(credentials: unknown): Promise<boolean>;
  
  fetchCustomers(credentials: unknown, since?: Date): AsyncIterable<RawCustomer>;
  fetchVehicles(credentials: unknown, since?: Date): AsyncIterable<RawVehicle>;
  fetchRepairOrders(credentials: unknown, since?: Date): AsyncIterable<RawRepairOrder>;
  fetchDeclinedWork(credentials: unknown, since?: Date): AsyncIterable<RawDeclinedWorkItem>;
}
```

The shared ingestion pipeline at `/lib/ingestion/pipeline.ts` takes any adapter and runs fetch → normalize → upsert → log. The rest of the app never talks to adapters directly.

### 2. MessagingProvider

Handles SMS send/receive. Twilio in production, a test provider in development that logs instead of sending.

```typescript
export interface MessagingProvider {
  type: 'twilio' | 'manual' | 'test';
  send(params: SendParams): Promise<SendResult>;
  parseInboundWebhook(req: Request): Promise<InboundMessage>;
  validateWebhookSignature(req: Request): Promise<boolean>;
}
```

### 3. AIService

Handles all LLM calls — message generation, reply classification, attribution scoring.

```typescript
export interface AIService {
  generateOutreachMessage(context: OutreachContext): Promise<GeneratedMessage>;
  classifyInboundReply(context: ReplyContext): Promise<ReplyClassification>;
  suggestReply(context: ReplyContext): Promise<SuggestedReply>;
  computeAttributionConfidence(context: AttributionContext): Promise<AttributionTier>;
}
```

A `MockAIService` returns realistic placeholder responses for UI development without burning Claude tokens. Per-shop daily token budgets are enforced in the base implementation.

### 4. BillingProvider

Handles subscription state and Stripe webhook ingestion.

```typescript
export interface BillingProvider {
  parseWebhook(req: Request): Promise<BillingEvent>;
  applyEvent(event: BillingEvent): Promise<void>;
  getPortalUrl(stripeCustomerId: string): Promise<string>;
}
```

The application does not expose pricing, plan selection, or in-app checkout. Plans and amounts are configured by the operator directly in Stripe. When the operator closes a sale, they send the customer a Stripe Checkout link, and the resulting webhook updates the shop's subscription state in this app.

For active customers, the app exposes a "Manage billing in Stripe" link that opens the Stripe Customer Portal — Stripe handles all payment-method updates, invoice viewing, and cancellations.

## Why These Abstractions Matter

Without them, building three data source integrations means three separate ingestion code paths, three places to maintain scoring logic, three places to handle deduplication. The abstraction collapses that to one shared pipeline + thin per-source adapters.

The trade-off: more upfront design work in Phase 1. The benefit: every later phase is faster, with less debugging from structural mistakes.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, Supabase (Postgres + Auth + Row-Level Security)
- **AI:** Anthropic Claude API
- **SMS:** Twilio
- **Billing:** Stripe (operator-managed)
- **Email:** Resend
- **Hosting:** Vercel
