export type LineItemUrgency = 'red' | 'yellow' | 'green'

export const PRIORITY_WEIGHTS = {
  recency: 0.6,
  ltvPercentile: 0.2,
  closeRate: 0.1,
  urgency: 0.1,
} as const

const URGENCY_SCORES: Record<LineItemUrgency, number> = {
  red: 100,
  yellow: 60,
  green: 30,
}
const URGENCY_SCORE_UNKNOWN = 40
const CLOSE_RATE_NEUTRAL = 50

export function urgencyScore(urgency: LineItemUrgency | null): number {
  return urgency ? URGENCY_SCORES[urgency] : URGENCY_SCORE_UNKNOWN
}

export function closeRateScore(closeRatePercent: number | null): number {
  return closeRatePercent ?? CLOSE_RATE_NEUTRAL
}

export interface PriorityComponents {
  recency: number
  ltvPercentile: number
  closeRate: number
  urgency: number
}

export interface PriorityScore {
  priorityScore: number
  components: PriorityComponents
}

/** Combines the four 0-100 component scores into the weighted 0-100 priority score. */
export function computePriorityScore(components: PriorityComponents): PriorityScore {
  const priorityScore =
    PRIORITY_WEIGHTS.recency * components.recency +
    PRIORITY_WEIGHTS.ltvPercentile * components.ltvPercentile +
    PRIORITY_WEIGHTS.closeRate * components.closeRate +
    PRIORITY_WEIGHTS.urgency * components.urgency

  return { priorityScore, components }
}
