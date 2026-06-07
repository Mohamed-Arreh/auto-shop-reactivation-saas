import { EmptyState } from '../_components/empty-state'

export default function ConversationsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
      <div className="mt-6">
        <EmptyState title="No conversations yet." />
      </div>
    </div>
  )
}
