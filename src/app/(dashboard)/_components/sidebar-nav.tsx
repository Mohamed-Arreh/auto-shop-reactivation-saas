'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/queue', label: 'Declined Work' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
