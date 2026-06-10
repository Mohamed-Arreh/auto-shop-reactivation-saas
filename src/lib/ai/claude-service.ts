import Anthropic from '@anthropic-ai/sdk'
import type { AIService, RecoveryMessageContext, RecoveryMessageResult } from './types'

export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 300

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

function formatVehicle(context: RecoveryMessageContext): string {
  return [context.vehicleYear, context.vehicleMake, context.vehicleModel]
    .filter(Boolean)
    .join(' ')
}

function buildSystemPrompt(context: RecoveryMessageContext): string {
  const lines = [
    "You write short, friendly, non-pushy SMS messages from an auto repair shop to a customer, reminding them of a specific repair their vehicle needs that they previously declined, and inviting them to book.",
    '',
    'Rules:',
    '- Keep the message under ~320 characters.',
    '- Reference the specific declined service and the specific vehicle.',
    '- Do not invent prices, discounts, or facts that are not provided in the context.',
    `- Sign off as the shop: "${context.shopName}".`,
    '- No emojis unless the shop voice below uses them.',
  ]

  const voice = context.voiceConfig
  if (voice) {
    lines.push('', "Match this shop's voice:")
    if (voice.toneKeywords.length > 0) {
      lines.push(`- Tone: ${voice.toneKeywords.join(', ')}`)
    }
    if (voice.doUse.length > 0) {
      lines.push(`- Do use: ${voice.doUse.join(', ')}`)
    }
    if (voice.doNotUse.length > 0) {
      lines.push(`- Do not use: ${voice.doNotUse.join(', ')}`)
    }
    if (voice.signature) {
      lines.push(`- Sign off with: "${voice.signature}"`)
    }
    if (voice.sampleMessages.length > 0) {
      lines.push('', 'Example messages in this shop\'s style:')
      for (const sample of voice.sampleMessages) {
        lines.push(`- ${sample}`)
      }
    }
  } else {
    lines.push('', 'No shop voice profile is set — use a friendly, professional default tone.')
  }

  lines.push(
    '',
    'Respond with only the SMS message text, nothing else.'
  )

  return lines.join('\n')
}

function buildUserPrompt(context: RecoveryMessageContext): string {
  const vehicle = formatVehicle(context) || 'their vehicle'

  return [
    `Customer name: ${context.customerName}`,
    `Vehicle: ${vehicle}`,
    `Declined service: ${context.declinedServiceDescription}`,
    `Estimated cost: ${formatAmount(context.amountCents)}`,
    `Days since declined: ${context.daysSinceDeclined}`,
    `Shop name: ${context.shopName}`,
  ].join('\n')
}

export class ClaudeAIService implements AIService {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  async generateRecoveryMessage(
    context: RecoveryMessageContext
  ): Promise<RecoveryMessageResult> {
    const response = await this.client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(context),
      messages: [{ role: 'user', content: buildUserPrompt(context) }],
    })

    const message = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    return {
      message,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }
  }
}
