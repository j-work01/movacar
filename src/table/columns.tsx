// Every column of the offers table, in display order. One list feeds the
// table, the column chooser and the CSV export, so they can't drift apart.

// This module holds definitions, not components. Editing it during
// development reloads the page instead of hot-swapping, which is fine.
/* oxlint-disable react/only-export-components */

import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  type SortFn,
} from '@tanstack/react-table'
import type { ReactNode } from 'react'
import type { Offer } from '../data/types.ts'
import {
  companyFromLogo,
  countryName,
  formatDay,
  formatMoney,
  formatNumber,
  formatWhole,
  isoDay,
  stationAddress,
} from '../lib/format.ts'
import { CompanyLogo, Country, OfferLink, Place } from './cells.tsx'

export const features = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

export type Features = typeof features

/** A cell's value for sorting; `undefined` is a blank, which always sorts last. */
export type Value = string | number | undefined

export interface ColumnConfig {
  id: string
  /** The full name, used in the column chooser and the CSV header. */
  label: string
  /** A shorter table header, when the label is long. */
  header?: string
  /** Numbers are right-aligned; dates sort by time. */
  kind: 'text' | 'number' | 'date'
  shownByDefault: boolean
  /** The value the column sorts by. */
  value: (offer: Offer) => Value
  /** What the cell shows; by default the value, formatted for its kind. */
  render?: (offer: Offer) => ReactNode
  /** What the CSV gets; by default the value (dates as YYYY-MM-DD). */
  csv?: (offer: Offer) => Value
}

const blank = <T,>(value: T | null | undefined): T | undefined =>
  value ?? undefined

const hoursToDays = (hours: number | null) =>
  hours === null ? undefined : hours / 24

/** Days you can buy on top of the included ones ("+ 1 day extra"). */
export const extraDays = (offer: Offer) =>
  offer.periodHours === null || offer.extraPeriodHours === null
    ? undefined
    : Math.max(0, (offer.extraPeriodHours - offer.periodHours) / 24)

const currencyOf = (offer: Offer) => offer.price?.currency ?? 'EUR'

export const COLUMNS: ColumnConfig[] = [
  {
    id: 'from',
    label: 'From',
    kind: 'text',
    shownByDefault: true,
    value: (o) => o.from.name || undefined,
    render: (o) => <Place station={o.from} />,
  },
  {
    id: 'fromCountry',
    label: 'From country',
    header: 'Country',
    kind: 'text',
    shownByDefault: true,
    value: (o) => blank(o.from.country),
    render: (o) => <Country code={o.from.country} />,
    csv: (o) => (o.from.country ? countryName(o.from.country) : undefined),
  },
  {
    id: 'to',
    label: 'To',
    kind: 'text',
    shownByDefault: true,
    value: (o) => o.to.name || undefined,
    render: (o) => <Place station={o.to} />,
  },
  {
    id: 'toCountry',
    label: 'To country',
    header: 'Country',
    kind: 'text',
    shownByDefault: true,
    value: (o) => blank(o.to.country),
    render: (o) => <Country code={o.to.country} />,
    csv: (o) => (o.to.country ? countryName(o.to.country) : undefined),
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    kind: 'text',
    shownByDefault: true,
    value: (o) => [o.make, o.model].filter(Boolean).join(' ') || undefined,
  },
  {
    id: 'category',
    label: 'Category',
    kind: 'text',
    shownByDefault: true,
    value: (o) => blank(o.category),
  },
  {
    id: 'company',
    label: 'Company',
    kind: 'text',
    shownByDefault: false,
    value: (o) => companyFromLogo(o.brandLogoUrl),
    render: (o) => <CompanyLogo url={o.brandLogoUrl} />,
  },
  {
    id: 'seats',
    label: 'Seats',
    kind: 'number',
    shownByDefault: true,
    value: (o) => blank(o.seats),
  },
  {
    id: 'sleeps',
    label: 'Sleeps',
    kind: 'number',
    shownByDefault: true,
    value: (o) => blank(o.sleeps),
  },
  {
    id: 'doors',
    label: 'Doors',
    kind: 'number',
    shownByDefault: false,
    value: (o) => blank(o.doors),
  },
  {
    id: 'minDriverAge',
    label: 'Min. driver age',
    header: 'Min. age',
    kind: 'number',
    shownByDefault: false,
    value: (o) => blank(o.minDriverAge),
  },
  {
    id: 'minLicence',
    label: 'Min. licence (years)',
    header: 'Licence (yrs)',
    kind: 'number',
    shownByDefault: false,
    value: (o) =>
      o.minLicenceMonths === null ? undefined : o.minLicenceMonths / 12,
  },
  {
    id: 'startDate',
    label: 'Earliest pick-up',
    kind: 'date',
    shownByDefault: true,
    value: (o) => blank(o.startDate),
  },
  {
    id: 'latestPickup',
    label: 'Latest pick-up',
    kind: 'date',
    shownByDefault: true,
    value: (o) => blank(o.latestPickup),
  },
  {
    id: 'endDate',
    label: 'Return by',
    kind: 'date',
    shownByDefault: true,
    value: (o) => blank(o.endDate),
  },
  {
    id: 'days',
    label: 'Days incl.',
    kind: 'number',
    shownByDefault: true,
    value: (o) => hoursToDays(o.periodHours),
  },
  {
    id: 'extraDays',
    label: 'Extra days',
    kind: 'number',
    shownByDefault: true,
    value: extraDays,
  },
  {
    id: 'freeKm',
    label: 'Free km',
    kind: 'number',
    shownByDefault: true,
    value: (o) => blank(o.freeKm),
  },
  {
    id: 'extraKm',
    label: '€/extra km',
    kind: 'number',
    shownByDefault: true,
    value: (o) =>
      o.centsPerExtraKm === null ? undefined : o.centsPerExtraKm / 100,
    render: (o) =>
      o.centsPerExtraKm === null
        ? '—'
        : formatMoney(o.centsPerExtraKm / 100, currencyOf(o), 'cents'),
  },
  {
    id: 'routeKm',
    label: 'Route km',
    kind: 'number',
    shownByDefault: true,
    value: (o) =>
      o.distanceMeters === null
        ? undefined
        : Math.round(o.distanceMeters / 1000),
  },
  {
    id: 'price',
    label: 'Price',
    kind: 'number',
    shownByDefault: true,
    value: (o) => (o.price ? o.price.amountMinor / 100 : undefined),
    render: (o) =>
      o.price ? formatMoney(o.price.amountMinor / 100, o.price.currency) : '—',
  },
  {
    id: 'fromAddress',
    label: 'From address',
    kind: 'text',
    shownByDefault: false,
    value: (o) => stationAddress(o.from),
  },
  {
    id: 'toAddress',
    label: 'To address',
    kind: 'text',
    shownByDefault: false,
    value: (o) => stationAddress(o.to),
  },
]

export const COLUMN_BY_ID = new Map(
  COLUMNS.map((column) => [column.id, column]),
)

/** Which columns show until the viewer changes it. */
export const DEFAULT_VISIBILITY: Record<string, boolean> = Object.fromEntries(
  COLUMNS.map((column) => [column.id, column.shownByDefault]),
)

/** How a value looks when the column has no `render` of its own. */
export function formatValue(column: ColumnConfig, value: Value): string {
  if (value === undefined) return '—'
  if (column.kind === 'date') return formatDay(String(value))
  if (column.kind === 'number') {
    return Number.isInteger(value) && Math.abs(Number(value)) >= 1000
      ? formatWhole(Number(value))
      : formatNumber(Number(value))
  }
  return String(value)
}

/** The value written to the CSV file. */
export function csvValue(column: ColumnConfig, offer: Offer): Value {
  if (column.csv) return column.csv(offer)
  const value = column.value(offer)
  return column.kind === 'date' && value !== undefined
    ? isoDay(String(value))
    : value
}

// --- sorting: ascending comparisons only; the table flips them for descending.
// Blanks never reach these: `sortUndefined: 'last'` puts them at the bottom.

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

const byText: SortFn<Features, Offer> = (a, b, id) =>
  collator.compare(String(a.getValue(id)), String(b.getValue(id)))

const byNumber: SortFn<Features, Offer> = (a, b, id) =>
  Number(a.getValue(id)) - Number(b.getValue(id))

const byTime: SortFn<Features, Offer> = (a, b, id) =>
  Date.parse(String(a.getValue(id))) - Date.parse(String(b.getValue(id)))

const SORT_BY_KIND = { text: byText, number: byNumber, date: byTime }

const helper = createColumnHelper<Features, Offer>()

export const tableColumns = helper.columns([
  ...COLUMNS.map((column) =>
    helper.accessor((offer) => column.value(offer), {
      id: column.id,
      header: column.header ?? column.label,
      cell: (info) =>
        column.render
          ? column.render(info.row.original)
          : formatValue(column, info.getValue()),
      sortFn: SORT_BY_KIND[column.kind],
      sortUndefined: 'last',
    }),
  ),
  helper.display({
    id: 'link',
    header: () => <span className="sr-only">Link</span>,
    enableHiding: false,
    enableSorting: false,
    cell: (info) => <OfferLink url={info.row.original.url} />,
  }),
])
