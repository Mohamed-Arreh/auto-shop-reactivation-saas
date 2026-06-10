// Shared shapes for generating AI recovery messages, independent of which
// model provider produces them.

export interface ShopVoiceConfig {
  sampleMessages: string[]
  toneKeywords: string[]
  doUse: string[]
  doNotUse: string[]
  signature: string | null
}

export interface RecoveryMessageContext {
  customerName: string
  vehicleYear: number | null
  vehicleMake: string | null
  vehicleModel: string | null
  declinedServiceDescription: string
  amountCents: number
  daysSinceDeclined: number
  shopName: string
  voiceConfig: ShopVoiceConfig | null
}

export interface RecoveryMessageResult {
  message: string
  inputTokens: number
  outputTokens: number
}

export interface AIService {
  generateRecoveryMessage(context: RecoveryMessageContext): Promise<RecoveryMessageResult>
}
