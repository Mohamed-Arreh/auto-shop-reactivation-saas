const sections = [
  'Shop details',
  'Data sources',
  'Shop voice',
  'Phone numbers',
  'Team',
  'Notifications',
]

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      <div className="mt-6 space-y-4">
        {sections.map((section) => (
          <div
            key={section}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <h2 className="text-sm font-medium text-gray-900">{section}</h2>
            <p className="mt-1 text-sm text-gray-500">Coming soon.</p>
          </div>
        ))}
      </div>
    </div>
  )
}
