/**
 * A customer's lifetime value in cents: the stored aggregate when it has been
 * populated, otherwise the sum of their repair orders' totals.
 */
export function customerLtvCents(
  lifetimeValueCents: number,
  repairOrderTotalsCents: readonly number[]
): number {
  if (lifetimeValueCents > 0) return lifetimeValueCents
  return repairOrderTotalsCents.reduce((sum, cents) => sum + cents, 0)
}

/**
 * Where a value ranks (0-100) among a set of values, using the "mean rank"
 * percentile: values strictly below count fully and ties split the
 * difference, so customers with identical LTV land on the same percentile.
 * A shop with zero or one customer has no spread, so everyone is "average".
 */
export function ltvPercentile(value: number, allValues: readonly number[]): number {
  if (allValues.length <= 1) return 50

  let countBelow = 0
  let countEqual = 0
  for (const other of allValues) {
    if (other < value) countBelow++
    else if (other === value) countEqual++
  }

  return ((countBelow + countEqual / 2) / allValues.length) * 100
}
