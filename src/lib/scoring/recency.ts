// How quickly a declined line item's recency score decays toward 0. A decline
// from this week scores near 100; one ~RECENCY_DECAY_DAYS old (or older) scores 0.
const RECENCY_DECAY_DAYS = 365

/**
 * Days between now and the line item's decline, using declined_at when present
 * and falling back to the parent repair order's date otherwise. Negative
 * differences (clock skew, future dates) clamp to 0.
 */
export function daysSinceDecline(
  declinedAt: string | null,
  roDate: string,
  now: Date = new Date()
): number {
  const reference = declinedAt ? new Date(declinedAt) : new Date(`${roDate}T00:00:00Z`)
  const diffDays = (now.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.round(diffDays))
}

/** Linear decay from 100 (declined today) to 0 (declined ~12 months ago or more). */
export function recencyScore(days: number): number {
  const clamped = Math.min(Math.max(days, 0), RECENCY_DECAY_DAYS)
  return 100 - (clamped / RECENCY_DECAY_DAYS) * 100
}
