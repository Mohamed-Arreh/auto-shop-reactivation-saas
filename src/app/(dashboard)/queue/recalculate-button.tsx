'use client'

import { useActionState } from 'react'
import { computeShopScores, type ScoringResult } from '@/app/actions/scoring'

const initialState: ScoringResult = { error: null }

export function RecalculateButton() {
  const [state, formAction, pending] = useActionState(computeShopScores, initialState)

  return (
    <form action={formAction} className="flex items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Recalculating…' : 'Recalculate priority'}
      </button>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
