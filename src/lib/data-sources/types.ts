// Common shape that every data source (CSV upload, Tekmetric, Mitchell, ...)
// must normalize its raw records into before they're written to the database.
// Each NormalizedRecord describes one repair-order line item, along with the
// customer, vehicle, and repair order it belongs to. The import pipeline
// upserts customer -> vehicle -> repair order, then inserts the line item.

export type LineItemStatus = 'approved' | 'declined' | 'deferred' | 'voided'

export type Urgency = 'red' | 'yellow' | 'green'

export interface NormalizedCustomer {
  firstName: string | null
  lastName: string | null
  phone: string
}

export interface NormalizedVehicle {
  year: number | null
  make: string | null
  model: string | null
}

export interface NormalizedRepairOrder {
  roNumber: string
  /** ISO date string, e.g. "2026-04-01" */
  roDate: string
}

export interface NormalizedLineItem {
  description: string
  totalCents: number
  status: LineItemStatus
  urgency: Urgency | null
}

export interface NormalizedRecord {
  customer: NormalizedCustomer
  vehicle: NormalizedVehicle
  repairOrder: NormalizedRepairOrder
  lineItem: NormalizedLineItem
}

/**
 * The seam every data source plugs into: given raw source text (a CSV file's
 * contents, an API response body, etc.), return normalized records ready for
 * the import pipeline. Adapters are responsible for skipping rows that don't
 * contain enough information to produce a valid record.
 */
export interface DataSourceAdapter {
  parse(text: string): NormalizedRecord[]
}
