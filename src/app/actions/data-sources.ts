'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CsvUploadAdapter } from '@/lib/data-sources/csv-adapter'
import type { NormalizedRecord } from '@/lib/data-sources/types'

type ImportState = { error: string | null }

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function resolveCustomerId(
  supabase: SupabaseClient,
  shopId: string,
  customer: NormalizedRecord['customer']
): Promise<string> {
  const { data: existingPhone } = await supabase
    .from('customer_phone_numbers')
    .select('customer_id')
    .eq('shop_id', shopId)
    .eq('phone_number', customer.phone)
    .maybeSingle()

  if (existingPhone) {
    return existingPhone.customer_id
  }

  const { data: newCustomer, error: customerError } = await supabase
    .from('customers')
    .insert({
      shop_id: shopId,
      first_name: customer.firstName,
      last_name: customer.lastName,
    })
    .select('id')
    .single()

  if (customerError || !newCustomer) {
    throw new Error(customerError?.message ?? 'Could not create customer.')
  }

  const { error: phoneError } = await supabase
    .from('customer_phone_numbers')
    .insert({
      shop_id: shopId,
      customer_id: newCustomer.id,
      phone_number: customer.phone,
      is_primary: true,
    })

  if (phoneError) {
    throw new Error(phoneError.message)
  }

  return newCustomer.id
}

async function resolveVehicleId(
  supabase: SupabaseClient,
  shopId: string,
  customerId: string,
  vehicle: NormalizedRecord['vehicle']
): Promise<string> {
  let query = supabase
    .from('vehicles')
    .select('id')
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)

  query =
    vehicle.year === null ? query.is('year', null) : query.eq('year', vehicle.year)
  query =
    vehicle.make === null ? query.is('make', null) : query.eq('make', vehicle.make)
  query =
    vehicle.model === null
      ? query.is('model', null)
      : query.eq('model', vehicle.model)

  const { data: existing } = await query.maybeSingle()
  if (existing) {
    return existing.id
  }

  const { data: created, error } = await supabase
    .from('vehicles')
    .insert({
      shop_id: shopId,
      customer_id: customerId,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Could not create vehicle.')
  }

  return created.id
}

async function resolveRepairOrderId(
  supabase: SupabaseClient,
  shopId: string,
  customerId: string,
  vehicleId: string,
  repairOrder: NormalizedRecord['repairOrder']
): Promise<string> {
  const { data: existing } = await supabase
    .from('repair_orders')
    .select('id')
    .eq('shop_id', shopId)
    .eq('ro_number', repairOrder.roNumber)
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  const { data: created, error } = await supabase
    .from('repair_orders')
    .insert({
      shop_id: shopId,
      customer_id: customerId,
      vehicle_id: vehicleId,
      ro_number: repairOrder.roNumber,
      ro_date: repairOrder.roDate,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? 'Could not create repair order.')
  }

  return created.id
}

export async function importCsv(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const file = formData.get('file')

  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a CSV file to import.' }
  }

  const text = await file.text()
  const records = new CsvUploadAdapter().parse(text)

  if (records.length === 0) {
    return {
      error:
        'No valid rows found in that file. Check the column headers and try again.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
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

  let imported = 0
  let failed = 0

  for (const record of records) {
    try {
      const customerId = await resolveCustomerId(supabase, shopId, record.customer)
      const vehicleId = await resolveVehicleId(
        supabase,
        shopId,
        customerId,
        record.vehicle
      )
      const repairOrderId = await resolveRepairOrderId(
        supabase,
        shopId,
        customerId,
        vehicleId,
        record.repairOrder
      )

      const { error: lineItemError } = await supabase
        .from('repair_order_line_items')
        .insert({
          shop_id: shopId,
          repair_order_id: repairOrderId,
          customer_id: customerId,
          vehicle_id: vehicleId,
          description: record.lineItem.description,
          total_cents: record.lineItem.totalCents,
          status: record.lineItem.status,
          urgency: record.lineItem.urgency,
        })

      if (lineItemError) {
        throw new Error(lineItemError.message)
      }

      imported++
    } catch {
      failed++
    }
  }

  redirect(`/queue?imported=${imported}&failed=${failed}`)
}
