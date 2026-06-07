import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <form action={signout}>
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="px-6 py-10">
        <p className="text-gray-700">
          Welcome, <span className="font-medium">{user?.email}</span>
        </p>
      </main>
    </div>
  )
}
