'use client'

import { useActionState } from 'react'
import { generateRecoveryMessage, type GenerateMessageState } from '@/app/actions/ai'

const initialState: GenerateMessageState = { error: null }

export function GenerateMessageButton({ lineItemId }: { lineItemId: string }) {
  const [state, formAction, pending] = useActionState(generateRecoveryMessage, initialState)

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="lineItemId" value={lineItemId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Generating…' : state.success ? 'Drafted ✓' : 'Generate message'}
      </button>
      {state.error && (
        <p className="text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
