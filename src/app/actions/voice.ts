'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type VoiceFormState = { error: string | null; success?: boolean }

export async function saveVoiceConfig(
  _prevState: VoiceFormState,
  formData: FormData
): Promise<VoiceFormState> {
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

  const sampleMessages = String(formData.get('sample_messages') ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (sampleMessages.length === 0) {
    return { error: 'Add at least one sample message.' }
  }

  const toneKeywords = String(formData.get('tone_keywords') ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)

  const signature = String(formData.get('signature') ?? '').trim() || null

  const { data: latest } = await supabase
    .from('shop_voice_configs')
    .select('version')
    .eq('shop_id', shopId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latest?.version ?? 0) + 1

  const { data: created, error: insertError } = await supabase
    .from('shop_voice_configs')
    .insert({
      shop_id: shopId,
      version: nextVersion,
      sample_messages: sampleMessages,
      tone_keywords: toneKeywords,
      signature,
      created_by_user_id: user.id,
    })
    .select('id')
    .single()

  if (insertError || !created) {
    return { error: insertError?.message ?? 'Could not save voice settings.' }
  }

  const { error: updateError } = await supabase
    .from('shops')
    .update({ active_voice_config_id: created.id })
    .eq('id', shopId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/settings/voice')

  return { error: null, success: true }
}
