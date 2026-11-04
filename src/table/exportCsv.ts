import type { Offer } from '../data/types.ts'
import { downloadCsv, toCsv } from '../lib/csv.ts'
import { isoDay } from '../lib/format.ts'
import { COLUMNS, csvValue } from './columns.tsx'

/** Every column (shown or hidden) plus the link, for the given offers. */
export function offersToCsv(offers: Offer[]): string {
  const header = [...COLUMNS.map((column) => column.label), 'Link']
  const rows = offers.map((offer) => [
    ...COLUMNS.map((column) => csvValue(column, offer)),
    offer.url,
  ])
  return toCsv(header, rows)
}

/** Downloads the offers in the order the table shows them. */
export function exportCsv(offers: Offer[], fetchedAt: string | undefined) {
  const day = fetchedAt ? isoDay(fetchedAt) : 'data'
  downloadCsv(`movacar-offers-${day}.csv`, offersToCsv(offers))
}
