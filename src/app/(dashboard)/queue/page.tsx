import { EmptyState } from '../_components/empty-state'

export default function QueuePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Declined Work</h1>
      <div className="mt-6">
        <EmptyState
          title="No declined work yet."
          description="Connect a data source to import repair orders."
        />
      </div>
    </div>
  )
}
