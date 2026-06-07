create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- ORGANIZATION: SHOPS, GROUPS, USERS
-- =============================================================================

create table shop_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  shop_group_id uuid references shop_groups(id) on delete set null,
  name text not null,
  legal_name text,
  address text,
  city text,
  province text,
  postal_code text,
  country text not null default 'CA',
  phone text,
  owner_email text not null,
  timezone text not null default 'America/Toronto',
  subscription_status text not null default 'trial' check (
    subscription_status in ('trial','active','past_due','lapsed','cancelled')
  ),
  subscription_tier text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  active_voice_config_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table shop_users (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'staff' check (
    role in ('owner','manager','staff','readonly')
  ),
  is_active boolean not null default true,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique(shop_id, user_id)
);

create table shop_sms_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  phone_number text not null,
  provider text not null default 'twilio' check (provider in ('twilio','manual','test')),
  provider_phone_sid text,
  is_default boolean not null default false,
  status text not null default 'active' check (
    status in ('active','inactive','suspended','pending_verification')
  ),
  a2p_campaign_id text,
  a2p_brand_id text,
  created_at timestamptz not null default now(),
  unique(shop_id, phone_number)
);

-- =============================================================================
-- DATA SOURCES
-- =============================================================================

create table data_sources (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  type text not null check (type in (
    'csv_upload','tekmetric_api','mitchell_api','shopware_api',
    'autofluent_api','protractor_api','google_sheets','manual_entry'
  )),
  name text not null,
  status text not null default 'connected' check (
    status in ('connected','disconnected','error','pending_auth')
  ),
  credentials_ref text,
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status text check (last_sync_status in ('success','partial','failed')),
  sync_enabled boolean not null default true,
  sync_frequency_minutes integer not null default 240,
  next_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table data_source_field_mappings (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references data_sources(id) on delete cascade,
  source_field text not null,
  target_entity text not null check (
    target_entity in ('customer','vehicle','repair_order','line_item')
  ),
  target_field text not null,
  transform_rule jsonb,
  created_at timestamptz not null default now(),
  unique(data_source_id, source_field, target_entity, target_field)
);

create table sync_runs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  data_source_id uuid not null references data_sources(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (
    status in ('running','success','partial','failed','cancelled')
  ),
  triggered_by text not null default 'scheduled' check (
    triggered_by in ('scheduled','manual','onboarding','webhook')
  ),
  triggered_by_user_id uuid references profiles(id),
  records_added integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  records_failed integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

-- =============================================================================
-- CUSTOMERS, PHONES, VEHICLES
-- =============================================================================

create table customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  source_id uuid references data_sources(id) on delete set null,
  external_id text,
  first_name text,
  last_name text,
  email text,
  address text,
  lifetime_value_cents bigint not null default 0,
  total_visits integer not null default 0,
  first_visit_date date,
  last_visit_date date,
  close_rate_percent numeric(5,2),
  close_rate_computed_at timestamptz,
  global_opt_out boolean not null default false,
  global_opt_out_reason text,
  global_opt_out_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, source_id, external_id)
);

create table customer_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  phone_number text not null,
  phone_type text not null default 'unknown' check (
    phone_type in ('mobile','landline','voip','unknown')
  ),
  is_primary boolean not null default false,
  validation_status text not null default 'unvalidated' check (
    validation_status in ('unvalidated','valid','invalid','disconnected','unknown')
  ),
  validated_at timestamptz,
  consent_status text not null default 'unknown' check (
    consent_status in ('unknown','implied','express','opted_out','expired')
  ),
  consent_basis text check (
    consent_basis in (
      'existing_business_relationship','recent_transaction',
      'inbound_request','express_form_opt_in','manual'
    )
  ),
  consent_captured_at timestamptz,
  consent_expires_at timestamptz,
  opted_out_at timestamptz,
  opted_out_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customer_tags (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique(customer_id, tag)
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  source_id uuid references data_sources(id) on delete set null,
  external_id text,
  year integer,
  make text,
  model text,
  trim text,
  vin text,
  license_plate text,
  color text,
  mileage_at_last_visit integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, source_id, external_id)
);

create table vehicle_service_history (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  service_date date not null,
  service_description text not null,
  service_category text,
  mileage_at_service integer,
  source text not null default 'imported' check (
    source in ('imported','derived_from_ro','manual')
  ),
  source_ro_id uuid,
  source_line_item_id uuid,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- REPAIR ORDERS AND LINE ITEMS (the central work units)
-- =============================================================================

create table repair_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  source_id uuid references data_sources(id) on delete set null,
  customer_id uuid not null references customers(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  external_id text,
  ro_number text,
  ro_date date not null,
  status text not null default 'closed' check (
    status in ('open','in_progress','closed','voided')
  ),
  subtotal_cents bigint not null default 0,
  total_cents bigint not null default 0,
  mileage_at_ro integer,
  service_advisor text,
  technician text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, source_id, external_id)
);

create table repair_order_line_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  repair_order_id uuid not null references repair_orders(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  source_id uuid references data_sources(id) on delete set null,
  external_id text,
  description text not null,
  category text,
  urgency text check (urgency in ('red','yellow','green')),
  parts_cents bigint not null default 0,
  labor_cents bigint not null default 0,
  total_cents bigint not null,
  status text not null default 'approved' check (
    status in ('approved','declined','deferred','voided')
  ),
  declined_at timestamptz,
  recovery_status text not null default 'not_recovered' check (
    recovery_status in ('not_recovered','possibly_recovered','recovered')
  ),
  recovery_status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, source_id, external_id)
);

create table line_item_scores (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  line_item_id uuid not null references repair_order_line_items(id) on delete cascade,
  priority_score numeric(5,2) not null,
  score_components jsonb not null default '{}'::jsonb,
  days_since_decline integer,
  customer_ltv_percentile numeric(5,2),
  customer_close_rate numeric(5,2),
  urgency_weight numeric(5,2),
  computed_at timestamptz not null default now(),
  unique(line_item_id)
);

-- =============================================================================
-- SHOP VOICE (versioned)
-- =============================================================================

create table shop_voice_configs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  version integer not null,
  sample_messages text[] not null default '{}',
  tone_keywords text[] not null default '{}',
  do_use text[] not null default '{}',
  do_not_use text[] not null default '{}',
  signature text,
  notes text,
  created_by_user_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique(shop_id, version)
);

-- =============================================================================
-- CAMPAIGNS, TARGETS, EVENTS
-- =============================================================================

create table outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  campaign_type text not null check (
    campaign_type in (
      'declined_work_recovery','dormant_customer_reactivation',
      'seasonal_reminder','custom'
    )
  ),
  status text not null default 'draft' check (
    status in ('draft','generating','awaiting_approval','scheduled','sending','sent','completed','cancelled')
  ),
  voice_config_id uuid references shop_voice_configs(id),
  shop_sms_phone_id uuid references shop_sms_phone_numbers(id),
  created_by_user_id uuid references profiles(id),
  selection_criteria jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  targets_count integer not null default 0,
  sent_count integer not null default 0,
  replied_count integer not null default 0,
  booked_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_targets (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  campaign_id uuid not null references outreach_campaigns(id) on delete cascade,
  line_item_id uuid not null references repair_order_line_items(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  customer_phone_id uuid references customer_phone_numbers(id) on delete set null,
  priority_score numeric(5,2),
  generated_message text,
  approved_message text,
  status text not null default 'pending' check (
    status in (
      'pending','generating','generated','awaiting_approval','approved',
      'queued','sent','delivered','replied','booked','converted',
      'rejected','failed','opted_out','superseded'
    )
  ),
  generated_at timestamptz,
  approved_at timestamptz,
  approved_by_user_id uuid references profiles(id),
  sent_at timestamptz,
  delivered_at timestamptz,
  replied_at timestamptz,
  booked_at timestamptz,
  converted_at timestamptz,
  conversation_thread_id uuid,
  generation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_target_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  campaign_target_id uuid not null references campaign_targets(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'created','message_generated','message_edited','approved','rejected',
      'queued','sent','delivered','reply_received','classified',
      'booking_requested','booking_confirmed','converted','failed','opted_out'
    )
  ),
  from_status text,
  to_status text,
  actor_type text not null default 'system' check (
    actor_type in ('system','user','ai','customer')
  ),
  actor_user_id uuid references profiles(id),
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- =============================================================================
-- CONVERSATIONS, MESSAGES, REPLY ANALYSES
-- =============================================================================

create table conversation_threads (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  customer_phone_id uuid references customer_phone_numbers(id) on delete set null,
  shop_sms_phone_id uuid references shop_sms_phone_numbers(id) on delete set null,
  status text not null default 'active' check (
    status in ('active','awaiting_attention','booked','closed','opt_out')
  ),
  ai_summary text,
  last_message_at timestamptz,
  last_inbound_message_at timestamptz,
  last_outbound_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  conversation_thread_id uuid not null references conversation_threads(id) on delete cascade,
  campaign_target_id uuid references campaign_targets(id) on delete set null,
  direction text not null check (direction in ('outbound','inbound')),
  body text not null,
  provider text not null default 'twilio' check (provider in ('twilio','manual','test')),
  provider_message_id text,
  status text not null default 'sent' check (
    status in ('queued','sent','delivered','failed','received','undelivered')
  ),
  sent_at timestamptz,
  delivered_at timestamptz,
  ai_drafted boolean not null default false,
  ai_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table reply_analyses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  conversation_thread_id uuid not null references conversation_threads(id) on delete cascade,
  classification text not null check (
    classification in (
      'book_request','question','decline','opt_out',
      'off_topic','needs_human','positive_no_book'
    )
  ),
  confidence numeric(3,2),
  suggested_reply text,
  extracted_booking_intent jsonb,
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  unique(message_id)
);

-- =============================================================================
-- BOOKINGS
-- =============================================================================

create table bookings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete set null,
  campaign_target_id uuid references campaign_targets(id) on delete set null,
  conversation_thread_id uuid references conversation_threads(id) on delete set null,
  source_line_item_id uuid references repair_order_line_items(id) on delete set null,
  status text not null default 'requested' check (
    status in ('requested','confirmed','completed','cancelled','no_show')
  ),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  customer_notes text,
  internal_notes text,
  resulting_ro_id uuid references repair_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- REVENUE ATTRIBUTIONS
-- =============================================================================

create table revenue_attributions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  declined_line_item_id uuid not null references repair_order_line_items(id) on delete cascade,
  recovery_line_item_id uuid references repair_order_line_items(id) on delete set null,
  campaign_target_id uuid references campaign_targets(id) on delete set null,
  conversation_thread_id uuid references conversation_threads(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  recovered_cents bigint not null,
  recovered_date date not null,
  attribution_tier text not null check (
    attribution_tier in ('T1_undeniable','T2_strong','T3_likely','T4_possible')
  ),
  attribution_reason text,
  attribution_confidence numeric(3,2),
  computed_by_run_id uuid,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- NOTIFICATIONS, AUDIT, COMPLIANCE, AI USAGE
-- =============================================================================

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  channel text not null check (channel in ('email','sms','in_app')),
  event_type text not null,
  enabled boolean not null default true,
  unique(user_id, channel, event_type)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  channel text not null check (channel in ('email','sms','in_app')),
  event_type text not null,
  subject text,
  body text not null,
  status text not null default 'pending' check (
    status in ('pending','sent','delivered','failed','suppressed','bounced')
  ),
  related_entity_type text,
  related_entity_id uuid,
  sent_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table compliance_records (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  customer_phone_id uuid references customer_phone_numbers(id) on delete cascade,
  record_type text not null check (
    record_type in (
      'casl_consent','sms_opt_in','sms_opt_out',
      'a2p_registration','privacy_request','data_export','data_deletion'
    )
  ),
  details jsonb not null,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  service text not null check (
    service in (
      'message_generation','reply_classification','reply_suggestion',
      'attribution_scoring','voice_distillation'
    )
  ),
  model text,
  prompt_version text,
  input_tokens integer,
  output_tokens integer,
  cost_cents numeric(10,4),
  related_entity_type text,
  related_entity_id uuid,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create table idempotency_keys (
  key text primary key,
  shop_id uuid references shops(id) on delete cascade,
  endpoint text not null,
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, flag_key)
);
