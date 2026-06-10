'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ClaudeAIService, CLAUDE_MODEL } from '@/lib/ai/claude-service'
import type { ShopVoiceConfig } from '@/lib/ai/types'
import { daysSinceDecline } from '@/lib/scoring/recency'

export type GenerateMessageState = { error: string | null; success?: boolean }

const DECLINED_WORK_RECOVERY_CAMPAIGN_NAME = 'Declined Work Recovery'

// Supabase infers embedded to-one relations as arrays without a generated
// Database type; the FK is on repair_order_line_items, so each of these is
// actually a single related row (or null) at runtime.
interface LineItemWithRelations {
  id: string
  description: string
  total_cents: number
  declined_at: string | null
  customer_id: string
  vehicle_id: string
  repair_order_id: string
  customer: { first_name: string | null; last_name: string | null } | null
  vehicle: { year: number | null; make: string | null; model: string | null } | null
  repair_order: { ro_date: string } | null
}

export async function generateRecoveryMessage(
  _prevState: GenerateMessageState,
  formData: FormData
): Promise<GenerateMessageState> {
  const lineItemId = String(formData.get('lineItemId') ?? '')

  if (!lineItemId) {
    return { error: 'Missing line item.' }
  }

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

  const [{ data: lineItem, error: lineItemError }, { data: shop, error: shopError }] =
    await Promise.all([
      supabase
        .from('repair_order_line_items')
        .select(
          `
            id,
            description,
            total_cents,
            declined_at,
            customer_id,
            vehicle_id,
            repair_order_id,
            customer:customers ( first_name, last_name ),
            vehicle:vehicles ( year, make, model ),
            repair_order:repair_orders ( ro_date )
          `
        )
        .eq('id', lineItemId)
        .eq('shop_id', shopId)
        .maybeSingle(),
      supabase
        .from('shops')
        .select('name, active_voice_config_id')
        .eq('id', shopId)
        .maybeSingle(),
    ])

  if (lineItemError || shopError) {
    return { error: lineItemError?.message ?? shopError?.message ?? 'Could not load data.' }
  }

  if (!lineItem || !shop) {
    return { error: 'Line item not found.' }
  }

  const item = lineItem as unknown as LineItemWithRelations

  let voiceConfig: ShopVoiceConfig | null = null
  if (shop.active_voice_config_id) {
    const { data: voiceConfigRow } = await supabase
      .from('shop_voice_configs')
      .select('sample_messages, tone_keywords, do_use, do_not_use, signature')
      .eq('id', shop.active_voice_config_id)
      .maybeSingle()

    if (voiceConfigRow) {
      voiceConfig = {
        sampleMessages: voiceConfigRow.sample_messages,
        toneKeywords: voiceConfigRow.tone_keywords,
        doUse: voiceConfigRow.do_use,
        doNotUse: voiceConfigRow.do_not_use,
        signature: voiceConfigRow.signature,
      }
    }
  }

  const roDate = item.repair_order?.ro_date
  if (!roDate) {
    return { error: 'Could not find repair order date for this item.' }
  }

  let result
  try {
    result = await new ClaudeAIService().generateRecoveryMessage({
      customerName:
        [item.customer?.first_name, item.customer?.last_name].filter(Boolean).join(' ') ||
        'there',
      vehicleYear: item.vehicle?.year ?? null,
      vehicleMake: item.vehicle?.make ?? null,
      vehicleModel: item.vehicle?.model ?? null,
      declinedServiceDescription: item.description,
      amountCents: item.total_cents,
      daysSinceDeclined: daysSinceDecline(item.declined_at, roDate),
      shopName: shop.name,
      voiceConfig,
    })
  } catch {
    return { error: 'Could not generate a message. Please try again.' }
  }

  let { data: campaign } = await supabase
    .from('outreach_campaigns')
    .select('id')
    .eq('shop_id', shopId)
    .eq('campaign_type', 'declined_work_recovery')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!campaign) {
    const { data: createdCampaign, error: campaignError } = await supabase
      .from('outreach_campaigns')
      .insert({
        shop_id: shopId,
        name: DECLINED_WORK_RECOVERY_CAMPAIGN_NAME,
        campaign_type: 'declined_work_recovery',
      })
      .select('id')
      .single()

    if (campaignError || !createdCampaign) {
      return { error: campaignError?.message ?? 'Could not create campaign.' }
    }

    campaign = createdCampaign
  }

  const { data: existingTarget } = await supabase
    .from('campaign_targets')
    .select('id')
    .eq('shop_id', shopId)
    .eq('campaign_id', campaign.id)
    .eq('line_item_id', lineItemId)
    .maybeSingle()

  const now = new Date().toISOString()
  let targetId: string

  if (existingTarget) {
    const { error: updateError } = await supabase
      .from('campaign_targets')
      .update({
        generated_message: result.message,
        status: 'awaiting_approval',
        generated_at: now,
      })
      .eq('id', existingTarget.id)

    if (updateError) {
      return { error: updateError.message }
    }

    targetId = existingTarget.id
  } else {
    const { data: createdTarget, error: insertError } = await supabase
      .from('campaign_targets')
      .insert({
        shop_id: shopId,
        campaign_id: campaign.id,
        line_item_id: lineItemId,
        customer_id: item.customer_id,
        vehicle_id: item.vehicle_id,
        generated_message: result.message,
        status: 'awaiting_approval',
        generated_at: now,
      })
      .select('id')
      .single()

    if (insertError || !createdTarget) {
      return { error: insertError?.message ?? 'Could not save the draft message.' }
    }

    targetId = createdTarget.id
  }

  await supabase.from('ai_usage_log').insert({
    shop_id: shopId,
    service: 'message_generation',
    model: CLAUDE_MODEL,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    related_entity_type: 'campaign_target',
    related_entity_id: targetId,
  })

  revalidatePath('/queue')
  revalidatePath('/approvals')

  return { error: null, success: true }
}
