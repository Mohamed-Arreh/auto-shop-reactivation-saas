'use client'

import { useActionState } from 'react'
import { saveVoiceConfig } from '@/app/actions/voice'

export function VoiceForm() {
  const [state, formAction, pending] = useActionState(saveVoiceConfig, { error: null })

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="sample_messages"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Sample messages
        </label>
        <p className="mb-2 text-sm text-gray-500">
          Paste 3–5 texts you&apos;d normally send customers, one per line.
        </p>
        <textarea
          id="sample_messages"
          name="sample_messages"
          rows={6}
          required
          placeholder={
            'Hey John, this is Mike from Main St Auto. Just a heads up your front brakes were looking thin at your last visit — happy to get you in whenever works. Thanks!'
          }
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="tone_keywords"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Tone keywords (optional)
        </label>
        <input
          id="tone_keywords"
          name="tone_keywords"
          type="text"
          placeholder="friendly, casual, direct"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">Comma-separated.</p>
      </div>

      <div>
        <label
          htmlFor="signature"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Signature (optional)
        </label>
        <input
          id="signature"
          name="signature"
          type="text"
          placeholder="- Mike at Main St Auto"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="text-sm text-green-600" role="status">
          Voice settings saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save voice'}
      </button>
    </form>
  )
}
