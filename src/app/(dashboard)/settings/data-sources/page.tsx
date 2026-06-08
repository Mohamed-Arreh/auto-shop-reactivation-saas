import Link from 'next/link'
import { CsvImportForm } from './csv-import-form'

export default function DataSourcesPage() {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/settings" className="hover:text-gray-900">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-900">Data sources</span>
      </div>

      <h1 className="mt-1 text-xl font-semibold text-gray-900">Data sources</h1>
      <p className="mt-1 text-sm text-gray-500">
        Import repair order history from a CSV export to populate your Declined
        Work queue.
      </p>

      <div className="mt-6 max-w-xl rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-medium text-gray-900">Import from CSV</h2>
        <p className="mt-1 text-sm text-gray-500">
          Expected columns: customer_first_name, customer_last_name,
          customer_phone, vehicle_year, vehicle_make, vehicle_model, ro_number,
          ro_date (YYYY-MM-DD), line_item_description, line_item_total,
          line_item_status (approved/declined), urgency (red/yellow/green).
        </p>
        <div className="mt-4">
          <CsvImportForm />
        </div>
      </div>
    </div>
  )
}
