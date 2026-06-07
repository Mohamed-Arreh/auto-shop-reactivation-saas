'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type OnboardingState = { error: string | null }

export async function createShop(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = (formData.get('name') as string)?.trim()
  const city = (formData.get('city') as string)?.trim() || null
  const province = (formData.get('province') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null

  if (!name) {
    return { error: 'Shop name is required.' }
  }

  // RLS blocks a user's very first shop/membership insert (they aren't a
  // member of any shop yet), so this must run through the admin client.
  const admin = createAdminClient()

  const { data: shop, error: shopError } = await admin
    .from('shops')
    .insert({ name, city, province, phone, owner_email: user.email })
    .select()
    .single()

  if (shopError || !shop) {
    return { error: shopError?.message ?? 'Could not create the shop.' }
  }

  const { error: memberError } = await admin.from('shop_users').insert({
    shop_id: shop.id,
    user_id: user.id,
    role: 'owner',
    is_active: true,
    joined_at: new Date().toISOString(),
  })

  if (memberError) {
    return { error: memberError.message }
  }

  redirect('/dashboard')
}
