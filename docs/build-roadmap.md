# Build Roadmap

The build is structured around the abstractions in `architecture.md`. Phase 1 lays the structural backbone; later phases plug into stable interfaces rather than retrofitting.

## Phase 1 — Foundation (Load-Bearing) [~1.5-2 weeks]

The architectural decisions here determine whether later phases are clean additions or painful rewrites.

- Project scaffold (Next.js 14, TypeScript, Tailwind, shadcn/ui)
- Supabase connection + auth
- **Full database schema** — every table, not piecemeal
- Row-Level Security on every tenant-scoped table
- **Four core abstractions defined** (DataSourceAdapter, MessagingProvider, AIService, BillingProvider)
- Mock/test implementations registered for all anticipated providers
- App structure: public routes, authenticated dashboard routes, API routes, webhook routes
- Auth + minimal onboarding wizard
- Empty-state UI for every major dashboard page (Queue, Approvals, Conversations, Reports, Settings)
- Audit log + error log helpers
- Test criteria: sign up two shops, log in as each, see fully isolated UIs

## Phase 2 — Data Ingestion + Scoring [~1.5 weeks]

Implements real adapters against the existing DataSourceAdapter interface.

- CsvUploadAdapter (papaparse, column mapping UI, validation)
- ManualEntryAdapter
- GoogleSheetsAdapter
- Shared ingestion pipeline (fetch → normalize → upsert → log)
- Customer scoring engine (recency 60%, LTV percentile 20%, close rate 10%, urgency 10%)
- Queue UI with filters, sort, pagination
- Data sources management UI
- Tekmetric/Mitchell/ShopWare/AutoFluent adapters remain no-op stubs

## Phase 3 — AI Service [~1 week]

Replaces the AIService stub with real Claude implementation.

- ClaudeAIService for all four AIService methods
- Per-shop daily token budget enforcement
- Shop voice settings (textarea, preview generation, rollback)
- Wire queue "Generate Message" buttons to real generation
- Bulk message generation for top-N priority items

## Phase 4 — Messaging + Approval Workflow [~1.5 weeks]

Implements Twilio messaging provider, builds the approval workflow and conversations UI.

- TwilioMessagingProvider implementation
- Inbound webhook endpoint (signature validation, message ingestion, opt-out handling, AI classification trigger)
- Approval queue UI (single + bulk approval)
- Conversations view (thread list, iMessage-style chat, AI-drafted reply composer)
- Booking detection from book_request classifications
- CASL compliance footer + A2P 10DLC registration
- Resend email notifications

## Phase 5 — Shop Management System Integrations [~1.5 weeks per integration]

Real adapters for Tekmetric, Mitchell 1, ShopWare, AutoFluent.

- Priority by first paying customer's system
- Each adapter ~200-400 lines against the existing DataSourceAdapter interface
- Sync scheduler (Vercel cron, every 4 hours per active shop)
- No UI changes needed — the picker was built generically in Phase 2

## Phase 6 — Billing State + Revenue Attribution [~1 week]

The app receives subscription events from Stripe and tracks state. Pricing and checkout are handled externally by the operator.

- BillingProvider implementation (Stripe webhook parsing, event application)
- Stripe webhook handler endpoint
- Settings page link to Stripe Customer Portal for active customers
- Trial state management (`trial_ends_at` tracking, operator notifications when trial is ending)
- Attribution engine (matches approved work to prior outreach, tiers T1-T4)
- Reports UI (revenue stats, recovery timeline, customer recovery table, PDF export)
- Monthly attribution report email

## Phase 7 — Production Hardening [~1 week]

- Sentry for error tracking
- Structured logging with Pino
- Rate limiting on all API routes
- Backups confirmed, manual export feature
- Security audit (RLS stress test, webhook validation, env var audit)
- Onboarding wizard polish + product tour
- Marketing site copy (real, not placeholder)
- Performance audit and indexing review

## Total Timeline

~8-10 weeks of focused work, faster with Claude Code doing the heavy lifting on routine implementation. Each phase is independently testable — stop and verify before moving on.
