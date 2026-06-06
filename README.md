# ASR
# Auto Shop Reactivation SaaS

A multi-tenant SaaS for independent Canadian auto repair shops to recover declined work and reactivate dormant customers via AI-personalized SMS outreach.

## The Problem

Independent auto shops typically have $50,000 - $200,000 of declined work sitting in their shop management system from the last 12 months — brake jobs, suspension work, tires that customers said "not today" to. Most shops know it's there but have no time or system to follow up.

## The Solution

1. **Data integration** — Pulls customer + repair order data from shop management systems (Tekmetric, Mitchell 1, ShopWare) via API, or via CSV upload.
2. **Customer scoring** — Each declined line item gets a priority score 0-100 based on recency, customer lifetime value, historical close rate, and urgency.
3. **AI-personalized outreach** — Claude generates SMS messages referencing each customer's specific vehicle and the specific work they declined.
4. **Two-way conversation handling** — Inbound replies classified by AI; bookings tracked; opt-outs respected.
5. **Revenue attribution** — When previously-declined work is later approved, attribute the recovered revenue with a confidence tier (T1-T4).

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, Supabase (Postgres + Auth + Row-Level Security)
- **AI:** Anthropic Claude API
- **SMS:** Twilio
- **Billing:** Stripe
- **Email:** Resend
- **Hosting:** Vercel

## Architecture

The system is built around four core abstractions, each behind an interface so providers can be swapped:

- **DataSourceAdapter** — handles ingesting customer/RO/declined work data from any source
- **MessagingProvider** — handles SMS send/receive (Twilio in production, test provider in development)
- **AIService** — handles all LLM calls (message generation, reply classification, attribution scoring)
- **BillingProvider** — handles subscriptions and usage-based billing

See [`/docs/architecture.md`](./docs/architecture.md) for detail.

## Project Status

🚧 In active development. Currently building the V1 with CSV ingestion, customer scoring, and AI message generation. See [`/docs/build-roadmap.md`](./docs/build-roadmap.md) for the phased build plan.

## Documentation

- [Database Schema](./docs/schema.md)
- [User Flows](./docs/user-flows.md)
- [Architecture](./docs/architecture.md)
- [Build Roadmap](./docs/build-roadmap.md)

## Why This Exists

Built as a side project after researching how independent auto shops in Ottawa actually run their businesses. Inspired by Zane Cole's "Vrooom AI" model in the US, adapted for the Canadian market with bilingual support and CASL compliance.
