'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { customerLtvCents, ltvPercentile } from '@/lib/scoring/ltv'
import {
  closeRateScore,
  computePriorityScore,
  PRIORITY_WEIGHTS,
  urgencyScore,
  type LineItemUrgency,
} from '@/lib/scoring/priority'
import { daysSinceDecline, recencyScore } from '@/lib/scoring/recency'

export type ScoringResult = { error: string | null; scored?: number }

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Recomputes priority_score for every declined line item in the current
 * user's shop and upserts the results into line_item_scores. Safe to call
 * repeatedly (e.g. after each CSV import, or on demand from /queue).
 */
export async function computeShopScores(): Promise<ScoringResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { data: membership } = await supabase
    .from('shop_users')
    .select('shop_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return { error: 'No shop found for your account.' }
  }

  const shopId = membership.shop_id

  const [
    { data: customers, error: customersError },
    { data: repairOrders, error: ordersError },
    { data: lineItems, error: lineItemsError },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('id, lifetime_value_cents, close_rate_percent')
      .eq('shop_id', shopId),
    supabase
      .from('repair_orders')
      .select('id, customer_id, total_cents, ro_date')
      .eq('shop_id', shopId),
    supabase
      .from('repair_order_line_items')
      .select('id, declined_at, urgency, customer_id, repair_order_id')
      .eq('shop_id', shopId)
      .eq('status', 'declined'),
  ])

  if (customersError || ordersError || lineItemsError) {
    return {
      error:
        customersError?.message ??
        ordersError?.message ??
        lineItemsError?.message ??
        'Could not load shop data.',
    }
  }

  // Sum each customer's repair-order totals as the LTV fallback for when
  // customers.lifetime_value_cents hasn't been populated by the data source.
  const orderTotalsByCustomer = new Map<string, number[]>()
  const roDateById = new Map<string, string>()
  for (const order of repairOrders ?? []) {
    const totals = orderTotalsByCustomer.get(order.customer_id)
    if (totals) {
      totals.push(order.total_cents)
    } else {
      orderTotalsByCustomer.set(order.customer_id, [order.total_cents])
    }
    roDateById.set(order.id, order.ro_date)
  }

  const ltvByCustomer = new Map<string, number>()
  const closeRateByCustomer = new Map<string, number | null>()
  for (const customer of customers ?? []) {
    ltvByCustomer.set(
      customer.id,
      customerLtvCents(customer.lifetime_value_cents, orderTotalsByCustomer.get(customer.id) ?? [])
    )
    closeRateByCustomer.set(customer.id, customer.close_rate_percent)
  }
  const allLtvValues = Array.from(ltvByCustomer.values())

  const now = new Date()
  const rows = (lineItems ?? []).flatMap((item) => {
    const roDate = roDateById.get(item.repair_order_id)
    if (!roDate) return []

    const days = daysSinceDecline(item.declined_at, roDate, now)
    const ltv = ltvByCustomer.get(item.customer_id) ?? 0
    const components = {
      recency: recencyScore(days),
      ltvPercentile: ltvPercentile(ltv, allLtvValues),
      closeRate: closeRateScore(closeRateByCustomer.get(item.customer_id) ?? null),
      urgency: urgencyScore(item.urgency as LineItemUrgency | null),
    }
    const { priorityScore } = computePriorityScore(components)

    return [
      {
        shop_id: shopId,
        line_item_id: item.id,
        priority_score: round2(priorityScore),
        score_components: {
          recency: { score: round2(components.recency), weight: PRIORITY_WEIGHTS.recency },
          ltv_percentile: {
            score: round2(components.ltvPercentile),
            weight: PRIORITY_WEIGHTS.ltvPercentile,
          },
          close_rate: {
            score: round2(components.closeRate),
            weight: PRIORITY_WEIGHTS.closeRate,
          },
          urgency: {
            score: round2(components.urgency),
            weight: PRIORITY_WEIGHTS.urgency,
            value: item.urgency,
          },
        },
        days_since_decline: days,
        customer_ltv_percentile: round2(components.ltvPercentile),
        customer_close_rate: round2(components.closeRate),
        urgency_weight: round2(components.urgency),
        computed_at: now.toISOString(),
      },
    ]
  })

  if (rows.length > 0) {
    const { error } = await supabase
      .from('line_item_scores')
      .upsert(rows, { onConflict: 'line_item_id' })

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/queue')

  return { error: null, scored: rows.length }
}
