import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '../_components/empty-state'

const URGENCY_STYLES: Record<string, string> = {
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green: 'bg-green-100 text-green-700',
}

// Supabase infers embedded to-one relations as arrays without a generated
// Database type; the FK is on repair_order_line_items, so each of these is
// actually a single related row (or null) at runtime.
interface DeclinedLineItem {
  id: string
  description: string
  total_cents: number
  urgency: 'red' | 'yellow' | 'green' | null
  customer: { first_name: string | null; last_name: string | null } | null
  vehicle: { year: number | null; make: string | null; model: string | null } | null
  repair_order: { ro_date: string } | null
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

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; failed?: string }>
}) {
  const { imported, failed } = await searchParams

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

  const { data: lineItems } = membership
    ? await supabase
        .from('repair_order_line_items')
        .select(
          `
            id,
            description,
            total_cents,
            urgency,
            customer:customers ( first_name, last_name ),
            vehicle:vehicles ( year, make, model ),
            repair_order:repair_orders ( ro_date )
          `
        )
        .eq('shop_id', membership.shop_id)
        .eq('status', 'declined')
        .order('created_at', { ascending: false })
    : { data: null }

  const items = (lineItems ?? []) as unknown as DeclinedLineItem[]

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Declined Work</h1>

      {(imported !== undefined || failed !== undefined) && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Import complete — {imported ?? 0} row(s) imported
          {failed && Number(failed) > 0 ? `, ${failed} failed` : ''}.
        </div>
      )}

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            title="No declined work yet."
            description="Connect a data source to import repair orders."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Service
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Urgency
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    RO date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-gray-900">
                      {formatCustomer(item.customer)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatVehicle(item.vehicle)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.description}</td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {formatAmount(item.total_cents)}
                    </td>
                    <td className="px-4 py-3">
                      {item.urgency ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            URGENCY_STYLES[item.urgency] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.urgency}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.repair_order?.ro_date ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
