# User Flows

Two primary user types:
- **Shop Owner** — owns the business, approves messages, reviews results
- **Service Advisor / Front Desk** — day-to-day operator, handles incoming replies, marks bookings

Note: the sales process happens outside the app. The operator runs discovery calls, agrees on pricing with the shop owner, and creates the shop account. The shop owner does not see pricing or select plans inside the application.

## Flow 1 — Account Creation and Onboarding

Triggered when the operator creates a new shop account.

1. **Account creation** — operator creates the shop in an internal admin tool or invites the owner via email
2. **First-login onboarding wizard:**
   - Shop details (name, city, phone)
   - Shop management system used (Tekmetric / Mitchell 1 / ShopWare / Other / CSV)
   - Connect data (OAuth for supported systems, CSV upload otherwise)
   - Define shop voice (paste 3-5 sample texts they'd normally send a customer)
   - Review top 10 declined work items with priority scores
3. **Land on dashboard** — sync still finishing in background, trial state active

## Flow 2 — Daily Active Use

Shop owner opens the app once a day for 5-15 minutes.

- **Dashboard home** — stat tiles (recovered this month, active conversations, booked appointments, declined work pile), today's recommended actions, recovery timeline chart
- **Approval queue** — list of generated messages awaiting approval, with customer + vehicle + declined work context. Approve / Edit / Reject / Regenerate.
- **Declined Work Queue** — priority-scored list of every declined line item. Filters, sort, bulk message generation.
- **Conversations** — two-pane view of SMS threads, AI classification + suggested replies for inbound messages, booking detection.
- **Reports** — recovered revenue with attribution tier breakdown, top recovery categories, customer recovery table, PDF export.

## Flow 3 — Customer Reply Handling

A customer replies to outreach. The system handles what it can, escalates what it can't.

- Inbound message → AI classifies (book_request / question / decline / opt_out / off_topic / needs_human / positive_no_book)
- **Auto-handled:** opt_outs, single-word noise replies
- **Surfaced to shop owner:** needs_human, questions, low-confidence classifications, booking requests with parsed date/time
- AI drafts replies for the shop owner to send / edit / skip

## Flow 4 — Settings & Configuration

- Shop details
- Data sources (add, sync, edit, disconnect)
- Shop voice (versioned, with preview)
- Phone numbers (Twilio numbers attached)
- Team (invite members with roles)
- Billing (link to Stripe Customer Portal — payment method, invoices, cancellation handled in Stripe)
- Notifications (toggle matrix: event × channel)

## Flow 5 — Service Advisor Day

Service advisor has a subset of shop owner permissions: handles conversations, marks bookings, can't manage billing or data sources.

## Flow 6 — Subscription Lifecycle

The application tracks subscription state and reacts to Stripe webhook events. It does not present pricing or plan selection to the customer.

- **Trial state** is set at account creation by the operator (no card required). The app simply tracks `trial_ends_at`.
- **Trial expiration approaching** — the app emits an internal notification to the operator (not the customer). The operator then handles the conversion conversation directly with the shop owner.
- **Conversion** — operator sends the customer a pre-configured Stripe Checkout link. Customer pays on Stripe-hosted page.
- **Stripe webhook** → app updates the shop's `subscription_status` to `active`, records `stripe_subscription_id`.
- **Active customer** can access the "Manage billing in Stripe" link from settings, which opens the Stripe Customer Portal.
- **Payment failure** → webhook → app sets `subscription_status` to `past_due`. Operator is notified to follow up.
- **Cancellation** (initiated in Stripe portal) → webhook → app sets `subscription_status` to `cancelled`. Account flips to read-only after grace period.

## Flow 7 — Edge Cases

- Sync failures → red status, banner on dashboard, email alert after 24h
- SMS send failures → dedicated view with retry option
- Customer disputes → thread auto-marks awaiting_attention, one-click opt-out
- Data deduplication conflicts → side-by-side resolve view
