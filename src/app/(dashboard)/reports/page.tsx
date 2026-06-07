import { EmptyState } from '../_components/empty-state'

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
      <div className="mt-6">
        <EmptyState title="No recovery data yet." />
      </div>
    </div>
  )
}
