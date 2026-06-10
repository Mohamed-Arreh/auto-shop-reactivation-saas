import Link from 'next/link'

const sections = [
  { title: 'Shop details', description: 'Coming soon.', href: null },
  {
    title: 'Data sources',
    description: 'Import repair order history from a CSV export.',
    href: '/settings/data-sources',
  },
  {
    title: 'Shop voice',
    description: 'Configure how AI-drafted messages sound for your shop.',
    href: '/settings/voice',
  },
  { title: 'Phone numbers', description: 'Coming soon.', href: null },
  { title: 'Team', description: 'Coming soon.', href: null },
  { title: 'Notifications', description: 'Coming soon.', href: null },
]

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      <div className="mt-6 space-y-4">
        {sections.map((section) => {
          const card = (
            <>
              <h2 className="text-sm font-medium text-gray-900">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {section.description}
              </p>
            </>
          )

          if (section.href) {
            return (
              <Link
                key={section.title}
                href={section.href}
                className="block rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                {card}
              </Link>
            )
          }

          return (
            <div
              key={section.title}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
