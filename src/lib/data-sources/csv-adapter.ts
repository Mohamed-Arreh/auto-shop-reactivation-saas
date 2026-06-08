import * as Papa from 'papaparse'
import type {
  DataSourceAdapter,
  LineItemStatus,
  NormalizedRecord,
  Urgency,
} from './types'

const VALID_STATUSES: readonly LineItemStatus[] = [
  'approved',
  'declined',
  'deferred',
  'voided',
]
const VALID_URGENCIES: readonly Urgency[] = ['red', 'yellow', 'green']
const RO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type CsvRow = Record<string, string>

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseYear(value: string | null): number | null {
  if (!value) return null
  const year = Number.parseInt(value, 10)
  return Number.isFinite(year) ? year : null
}

// Expected columns: customer_first_name, customer_last_name, customer_phone,
// vehicle_year, vehicle_make, vehicle_model, ro_number, ro_date (YYYY-MM-DD),
// line_item_description, line_item_total (dollars), line_item_status
// (approved/declined/deferred/voided), urgency (red/yellow/green).
// Rows missing a required field are skipped.
function toRecord(row: CsvRow): NormalizedRecord | null {
  const phone = clean(row.customer_phone)
  const roNumber = clean(row.ro_number)
  const roDate = clean(row.ro_date)
  const description = clean(row.line_item_description)
  const totalRaw = clean(row.line_item_total)
  const statusRaw = clean(row.line_item_status)?.toLowerCase() ?? null

  if (
    !phone ||
    !roNumber ||
    !roDate ||
    !description ||
    !totalRaw ||
    !statusRaw ||
    !RO_DATE_PATTERN.test(roDate)
  ) {
    return null
  }

  const total = Number(totalRaw)
  if (!Number.isFinite(total)) {
    return null
  }

  if (!VALID_STATUSES.includes(statusRaw as LineItemStatus)) {
    return null
  }

  const urgencyRaw = clean(row.urgency)?.toLowerCase() ?? null
  const urgency = VALID_URGENCIES.includes(urgencyRaw as Urgency)
    ? (urgencyRaw as Urgency)
    : null

  return {
    customer: {
      firstName: clean(row.customer_first_name),
      lastName: clean(row.customer_last_name),
      phone,
    },
    vehicle: {
      year: parseYear(clean(row.vehicle_year)),
      make: clean(row.vehicle_make),
      model: clean(row.vehicle_model),
    },
    repairOrder: {
      roNumber,
      roDate,
    },
    lineItem: {
      description,
      totalCents: Math.round(total * 100),
      status: statusRaw as LineItemStatus,
      urgency,
    },
  }
}

export class CsvUploadAdapter implements DataSourceAdapter {
  parse(text: string): NormalizedRecord[] {
    const { data } = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    const records: NormalizedRecord[] = []
    for (const row of data) {
      const record = toRecord(row)
      if (record) {
        records.push(record)
      }
    }
    return records
  }
}
