const stats = [
  { label: 'Recovered this month' },
  { label: 'Active conversations' },
  { label: 'Booked appointments' },
  { label: 'Declined work pile' },
]

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">0</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-6">
        <p className="text-sm font-medium text-gray-900">
          Get started: connect a data source
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Import your shop&apos;s repair orders to start recovering declined
          work and tracking results here.
        </p>
      </div>
    </div>
  )
}
