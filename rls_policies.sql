-- RLS POLICIES (v1.0) — run after schema_ddl.sql

-- Helper: shop IDs the current user actively belongs to.
-- SECURITY DEFINER bypasses RLS on shop_users to avoid infinite recursion.
create or replace function public.auth_user_shop_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select shop_id from public.shop_users
  where user_id = auth.uid() and is_active = true
$$;

-- Standard policy for every table that has a shop_id column.
do $$
declare
  t text;
  shop_scoped_tables text[] := array[
    'shop_users','shop_sms_phone_numbers','data_sources','sync_runs','customers',
    'customer_phone_numbers','customer_tags','vehicles','vehicle_service_history',
    'repair_orders','repair_order_line_items','line_item_scores','shop_voice_configs',
    'outreach_campaigns','campaign_targets','campaign_target_events','conversation_threads',
    'messages','reply_analyses','bookings','revenue_attributions',
    'notification_preferences','notifications','compliance_records','audit_log',
    'ai_usage_log','idempotency_keys','feature_flags'
  ];
begin
  foreach t in array shop_scoped_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "shop_members_access" on public.%I
         for all to authenticated
         using (shop_id in (select public.auth_user_shop_ids()))
         with check (shop_id in (select public.auth_user_shop_ids()))',
      t
    );
  end loop;
end $$;

-- shops: scoped by id (the shop itself), not shop_id
alter table public.shops enable row level security;
create policy "shops_members_access" on public.shops
  for all to authenticated
  using (id in (select public.auth_user_shop_ids()))
  with check (id in (select public.auth_user_shop_ids()));

-- profiles: a user accesses only their own row
alter table public.profiles enable row level security;
create policy "profiles_self_access" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- shop_groups: members of any shop in the group
alter table public.shop_groups enable row level security;
create policy "shop_groups_members_access" on public.shop_groups
  for all to authenticated
  using (id in (
    select shop_group_id from public.shops
    where id in (select public.auth_user_shop_ids()) and shop_group_id is not null
  ))
  with check (id in (
    select shop_group_id from public.shops
    where id in (select public.auth_user_shop_ids()) and shop_group_id is not null
  ));

-- data_source_field_mappings: scoped through its parent data_source
alter table public.data_source_field_mappings enable row level security;
create policy "dsfm_members_access" on public.data_source_field_mappings
  for all to authenticated
  using (data_source_id in (
    select id from public.data_sources
    where shop_id in (select public.auth_user_shop_ids())
  ))
  with check (data_source_id in (
    select id from public.data_sources
    where shop_id in (select public.auth_user_shop_ids())
  ));