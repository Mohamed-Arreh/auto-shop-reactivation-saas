import { EmptyState } from '../_components/empty-state'

export default function ApprovalsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Approvals</h1>
      <div className="mt-6">
        <EmptyState title="No messages awaiting approval." />
      </div>
    </div>
  )
}
