'use client'

import { useActionState } from 'react'
import { importCsv } from '@/app/actions/data-sources'

export function CsvImportForm() {
  const [state, formAction, pending] = useActionState(importCsv, { error: null })

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="file"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          CSV file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Importing…' : 'Import CSV'}
      </button>
    </form>
  )
}
