// Every column of the offers table, in display order. One list feeds the
// table, the filters, the column chooser and the CSV export, so they can't
// drift apart.

// This module holds definitions, not components. Editing it during
// development reloads the page instead of hot-swapping, which is fine.
/* oxlint-disable react/only-export-components */

import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
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
import { FILTER_FNS, type FilterKind } from './filters.ts'

export const features = tableFeatures({
  columnVisibilityFeature,
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  // Faceting: the values and counts that the tick-lists offer.
  columnFacetingFeature,
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

export type Features = typeof features

/** A cell's value for sorting and filtering; `undefined` is a blank. */
export type Value = string | number | undefined

export interface ColumnConfig {
  id: string
  /** The full name, used in the column chooser, filters and CSV header. */
  label: string
  /** A shorter table header, when the label is long. */
  header?: string
  /** Numbers are right-aligned; dates sort by time. */
  kind: 'text' | 'number' | 'date'
  shownByDefault: boolean
  /** The value the column sorts and filters by. */
  value: (offer: Offer) => Value
  /** What the cell shows; by default the value, formatted for its kind. */
  render?: (offer: Offer) => ReactNode
  /** The full text, shown on hover when a cell is cut off. */
  tooltip?: (offer: Offer) => string | undefined
  /** What the CSV gets; by default the value (dates as YYYY-MM-DD). */
  csv?: (offer: Offer) => Value
  /** The kind of filter. By default: text → list, number → range, date → dates. */
  filter?: FilterKind
  /** How a value reads in a tick-list or a chip, e.g. "Spain (ES)". */
  optionLabel?: (value: string) => string
  /** How a number reads in a chip, e.g. "€1". */
  formatAmount?: (value: number) => string
}

const blank = <T,>(value: T | null | undefined): T | undefined =>
  value ?? undefined

/**
 * `value / by`, or a blank when the value is missing. `typeof` rather than a
 * null check, so a field that an older data file doesn't have yet is a blank
 * too, not NaN.
 */
const per = (value: number | null | undefined, by: number) =>
  typeof value === 'number' ? value / by : undefined

const includedDays = (offer: Offer) => per(offer.periodHours, 24)

/** Days you can buy on top of the included ones ("+ 1 day extra"). */
export const extraDays = (offer: Offer) => {
  const included = includedDays(offer)
  const withExtra = per(offer.extraPeriodHours, 24)
  return included === undefined || withExtra === undefined
    ? undefined
    : Math.max(0, withExtra - included)
}

/** All days, included plus extra. */
export const totalDays = (offer: Offer) => {
  const included = includedDays(offer)
  return included === undefined ? undefined : included + (extraDays(offer) ?? 0)
}

/** "20 (15+5)" with extra days, otherwise just "19". */
export function daysText(offer: Offer): string {
  const included = includedDays(offer)
  if (included === undefined) return '—'
  const extra = extraDays(offer) ?? 0
  if (extra === 0) return formatNumber(included)
  return `${formatNumber(included + extra)} (${formatNumber(included)}+${formatNumber(extra)})`
}

const currencyOf = (offer: Offer) => offer.price?.currency ?? 'EUR'

const countryLabel = (code: string) => `${countryName(code)} (${code})`

/** "Viladecans (near Barcelona)", and its address on a second line. */
const placeTooltip = (station: Offer['from']) =>
  [station.name, stationAddress(station)].filter(Boolean).join('\n') ||
  undefined

const euros = (value: number) => formatMoney(value, 'EUR')

export const COLUMNS: ColumnConfig[] = [
  {
    id: 'from',
    label: 'From',
    kind: 'text',
    shownByDefault: true,
    value: (o) => o.from.name || undefined,
    render: (o) => <Place station={o.from} />,
    tooltip: (o) => placeTooltip(o.from),
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
    optionLabel: countryLabel,
  },
  {
    id: 'to',
    label: 'To',
    kind: 'text',
    shownByDefault: true,
    value: (o) => o.to.name || undefined,
    render: (o) => <Place station={o.to} />,
    tooltip: (o) => placeTooltip(o.to),
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
    optionLabel: countryLabel,
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    kind: 'text',
    shownByDefault: true,
    value: (o) => [o.make, o.model].filter(Boolean).join(' ') || undefined,
    filter: 'text',
  },
  {
    id: 'category',
    label: 'Category',
    kind: 'text',
    shownByDefault: false,
    value: (o) => blank(o.category),
  },
  {
    id: 'company',
    label: 'Company',
    kind: 'text',
    shownByDefault: true,
    value: (o) => companyFromLogo(o.brandLogoUrl),
    render: (o) => <CompanyLogo url={o.brandLogoUrl} />,
  },
  {
    id: 'seats',
    label: 'Seats',
    kind: 'number',
    shownByDefault: false,
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
    value: (o) => per(o.minLicenceMonths, 12),
  },
  {
    id: 'startDate',
    label: 'Earliest pick-up',
    kind: 'date',
    shownByDefault: true,
    value: (o) => blank(o.startDate),
    // Filters on the whole pick-up window, not just the first day.
    filter: 'pickup',
  },
  {
    id: 'latestPickup',
    label: 'Latest pick-up',
    kind: 'date',
    shownByDefault: false,
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
    id: 'totalDays',
    label: 'Days',
    kind: 'number',
    shownByDefault: true,
    value: totalDays,
    render: daysText,
  },
  {
    id: 'days',
    label: 'Days incl.',
    kind: 'number',
    shownByDefault: false,
    value: includedDays,
  },
  {
    id: 'extraDays',
    label: 'Extra days',
    kind: 'number',
    shownByDefault: false,
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
    shownByDefault: false,
    value: (o) => per(o.centsPerExtraKm, 100),
    render: (o) => {
      const amount = per(o.centsPerExtraKm, 100)
      return amount === undefined
        ? '—'
        : formatMoney(amount, currencyOf(o), 'cents')
    },
    formatAmount: (value) => formatMoney(value, 'EUR', 'cents'),
  },
  {
    id: 'routeKm',
    label: 'Route km',
    kind: 'number',
    shownByDefault: true,
    value: (o) => {
      const km = per(o.distanceMeters, 1000)
      return km === undefined ? undefined : Math.round(km)
    },
  },
  {
    id: 'price',
    label: 'Price',
    kind: 'number',
    shownByDefault: true,
    value: (o) => (o.price ? o.price.amountMinor / 100 : undefined),
    render: (o) =>
      o.price ? formatMoney(o.price.amountMinor / 100, o.price.currency) : '—',
    formatAmount: euros,
  },
  {
    id: 'fromAddress',
    label: 'From address',
    kind: 'text',
    shownByDefault: false,
    value: (o) => stationAddress(o.from),
    filter: 'text',
  },
  {
    id: 'toAddress',
    label: 'To address',
    kind: 'text',
    shownByDefault: false,
    value: (o) => stationAddress(o.to),
    filter: 'text',
  },
]

export const COLUMN_BY_ID = new Map(
  COLUMNS.map((column) => [column.id, column]),
)

/** Which columns show until the viewer changes it. */
export const DEFAULT_VISIBILITY: Record<string, boolean> = Object.fromEntries(
  COLUMNS.map((column) => [column.id, column.shownByDefault]),
)

const DEFAULT_FILTER = { text: 'list', number: 'range', date: 'dates' } as const

export const filterKindOf = (column: ColumnConfig): FilterKind =>
  column.filter ?? DEFAULT_FILTER[column.kind]

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

/** Compares two texts the way people expect: "Málaga" before "Mannheim". */
export const compareText = (a: string, b: string) => collator.compare(a, b)

const byText: SortFn<Features, Offer> = (a, b, id) =>
  compareText(String(a.getValue(id)), String(b.getValue(id)))

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
      filterFn: FILTER_FNS[filterKindOf(column)],
    }),
  ),
  helper.display({
    id: 'link',
    header: () => <span className="sr-only">Link</span>,
    enableHiding: false,
    enableSorting: false,
    enableColumnFilter: false,
    cell: (info) => <OfferLink url={info.row.original.url} />,
  }),
])
