import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VoiceForm } from './voice-form'

export default async function VoiceSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('shop_users')
    .select('shop_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  let activeVoice: {
    version: number
    sample_messages: string[]
    tone_keywords: string[]
    signature: string | null
  } | null = null

  if (membership) {
    const { data: shop } = await supabase
      .from('shops')
      .select('active_voice_config_id')
      .eq('id', membership.shop_id)
      .maybeSingle()

    if (shop?.active_voice_config_id) {
      const { data: voiceConfig } = await supabase
        .from('shop_voice_configs')
        .select('version, sample_messages, tone_keywords, signature')
        .eq('id', shop.active_voice_config_id)
        .maybeSingle()

      activeVoice = voiceConfig ?? null
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/settings" className="hover:text-gray-900">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-900">Shop voice</span>
      </div>

      <h1 className="mt-1 text-xl font-semibold text-gray-900">Shop voice</h1>
      <p className="mt-1 text-sm text-gray-500">
        Tell us how your shop talks to customers so AI-drafted messages sound
        like you. Saving creates a new version and makes it active.
      </p>

      <div className="mt-6 max-w-xl rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-medium text-gray-900">Current active voice</h2>
        {activeVoice ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="text-gray-500">Version {activeVoice.version}</p>
            <div>
              <p className="font-medium text-gray-700">Sample messages</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-gray-600">
                {activeVoice.sample_messages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
            {activeVoice.tone_keywords.length > 0 && (
              <div>
                <p className="font-medium text-gray-700">Tone keywords</p>
                <p className="mt-1 text-gray-600">
                  {activeVoice.tone_keywords.join(', ')}
                </p>
              </div>
            )}
            {activeVoice.signature && (
              <div>
                <p className="font-medium text-gray-700">Signature</p>
                <p className="mt-1 text-gray-600">{activeVoice.signature}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No voice configured yet — using a friendly, professional default.
          </p>
        )}
      </div>

      <div className="mt-6 max-w-xl rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-medium text-gray-900">Update voice</h2>
        <div className="mt-4">
          <VoiceForm />
        </div>
      </div>
    </div>
  )
}
