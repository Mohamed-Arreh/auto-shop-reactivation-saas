import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '../_components/empty-state'

// Supabase infers embedded to-one relations as arrays without a generated
// Database type; the FKs are on campaign_targets, so each of these is
// actually a single related row (or null) at runtime.
interface PendingTarget {
  id: string
  generated_message: string | null
  line_item: { description: string; total_cents: number } | null
  customer: { first_name: string | null; last_name: string | null } | null
  vehicle: { year: number | null; make: string | null; model: string | null } | null
}

function formatAmount(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

function formatVehicle(
  vehicle: { year: number | null; make: string | null; model: string | null } | null
) {
  if (!vehicle) return '—'
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'
}

function formatCustomer(
  customer: { first_name: string | null; last_name: string | null } | null
) {
  if (!customer) return '—'
  return [customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—'
}

export default async function ApprovalsPage() {
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

  const { data: targets } = membership
    ? await supabase
        .from('campaign_targets')
        .select(
          `
            id,
            generated_message,
            line_item:repair_order_line_items ( description, total_cents ),
            customer:customers ( first_name, last_name ),
            vehicle:vehicles ( year, make, model )
          `
        )
        .eq('shop_id', membership.shop_id)
        .eq('status', 'awaiting_approval')
        .order('generated_at', { ascending: false })
    : { data: null }

  const items = (targets ?? []) as unknown as PendingTarget[]

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Approvals</h1>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState title="No messages awaiting approval." />
        ) : (
          <div className="space-y-4">
            {items.map((target) => (
              <div
                key={target.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-medium text-gray-900">
                    {formatCustomer(target.customer)}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {formatVehicle(target.vehicle)}
                  </span>
                </div>

                {target.line_item && (
                  <p className="mt-1 text-sm text-gray-500">
                    {target.line_item.description} —{' '}
                    {formatAmount(target.line_item.total_cents)}
                  </p>
                )}

                <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800">
                  {target.generated_message ?? '—'}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
