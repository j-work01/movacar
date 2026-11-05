// The filters: what each kind keeps, how it tests an offer, and how it reads
// in a chip ("Price: up to €1") and in the web address ("price=..1").

import type { FilterFn } from '@tanstack/react-table'
import type { Offer } from '../data/types.ts'
import { companyFromLogo, countryName, isoDay } from '../lib/format.ts'

/**
 * - `list`: tick the values to keep (cities, countries, …)
 * - `range`: a minimum and/or maximum (numbers)
 * - `dates`: a first and/or last day
 * - `pickup`: like `dates`, but keeps offers you can pick up on at least one
 *   of the days: the pick-up window (earliest to latest pick-up) overlaps
 * - `text`: the value contains these words
 */
export type FilterKind = 'list' | 'range' | 'dates' | 'pickup' | 'text'

/** Values to keep; an offer matching any of them stays. */
export type ListValue = string[]
/** Lowest and highest value to keep; either may be missing. */
export type RangeValue = [min: number | undefined, max: number | undefined]
/** First and last day (YYYY-MM-DD, Dutch/German calendar); either may be missing. */
export type DatesValue = [from: string | undefined, to: string | undefined]
export type TextValue = string

type Fn = FilterFn<any, Offer>

/** Lower case, without accents: "Málaga" → "malaga". */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const words = (query: string) =>
  normalize(query).split(/\s+/).filter(Boolean)

const isEmptyPair = (value: unknown) =>
  !Array.isArray(value) || (value[0] === undefined && value[1] === undefined)

export const inList: Fn = Object.assign(
  (row: Parameters<Fn>[0], id: string, selected: ListValue) =>
    selected.includes(String(row.getValue(id))),
  {
    autoRemove: (value: unknown) => !Array.isArray(value) || value.length === 0,
  },
)

export const inRange: Fn = Object.assign(
  (row: Parameters<Fn>[0], id: string, [min, max]: RangeValue) => {
    const value = row.getValue(id)
    if (typeof value !== 'number') return false
    return (
      (min === undefined || value >= min) && (max === undefined || value <= max)
    )
  },
  { autoRemove: isEmptyPair },
)

export const onDays: Fn = Object.assign(
  (row: Parameters<Fn>[0], id: string, [from, to]: DatesValue) => {
    const value = row.getValue(id)
    if (typeof value !== 'string') return false
    const day = isoDay(value)
    return (!from || day >= from) && (!to || day <= to)
  },
  { autoRemove: isEmptyPair },
)

/** True if the offer can be picked up on at least one day from `from` to `to`. */
export function canPickUpBetween(
  offer: Offer,
  from: string | undefined,
  to: string | undefined,
): boolean {
  if (!offer.startDate) return false
  const first = isoDay(offer.startDate)
  const last = offer.latestPickup ? isoDay(offer.latestPickup) : first
  return (!to || first <= to) && (!from || last >= from)
}

export const pickupOverlaps: Fn = Object.assign(
  (row: Parameters<Fn>[0], _id: string, [from, to]: DatesValue) =>
    canPickUpBetween(row.original, from, to),
  { autoRemove: isEmptyPair },
)

export const containsWords: Fn = Object.assign(
  (row: Parameters<Fn>[0], id: string, query: TextValue) => {
    const value = row.getValue(id)
    if (value === undefined) return false
    const text = normalize(String(value))
    return words(query).every((word) => text.includes(word))
  },
  {
    autoRemove: (value: unknown) =>
      typeof value !== 'string' || value.trim() === '',
  },
)

export const FILTER_FNS: Record<FilterKind, Fn> = {
  list: inList,
  range: inRange,
  dates: onDays,
  pickup: pickupOverlaps,
  text: containsWords,
}

// --- the search box: all words must appear somewhere in the offer.

/** The text the search box looks through, without accents. */
export function searchText(offer: Offer): string {
  const country = (code: string | null) =>
    code ? `${code} ${countryName(code)}` : ''
  return normalize(
    [
      offer.from.name,
      offer.from.city,
      country(offer.from.country),
      offer.to.name,
      offer.to.city,
      country(offer.to.country),
      offer.make,
      offer.model,
      offer.category,
      companyFromLogo(offer.brandLogoUrl),
    ]
      .filter(Boolean)
      .join(' '),
  )
}

export const matchesWords = (text: string, queryWords: string[]) =>
  queryWords.every((word) => text.includes(word))

// --- web address: "price=..1", "startDate=2026-11-07..2026-11-08".

const DAY = /^\d{4}-\d{2}-\d{2}$/

const pairToText = (pair: [unknown, unknown]) =>
  `${pair[0] ?? ''}..${pair[1] ?? ''}`

/** A filter value as it's written in the web address (one or more entries). */
export function filterToUrl(kind: FilterKind, value: unknown): string[] {
  switch (kind) {
    case 'list':
      return value as ListValue
    case 'range':
    case 'dates':
    case 'pickup':
      return [pairToText(value as [unknown, unknown])]
    case 'text':
      return [value as TextValue]
  }
}

/** A filter value read back from the web address; undefined if it doesn't make sense. */
export function filterFromUrl(
  kind: FilterKind,
  entries: string[],
): unknown | undefined {
  if (entries.length === 0) return undefined
  if (kind === 'list') {
    const values = entries.filter(Boolean)
    return values.length > 0 ? values : undefined
  }
  if (kind === 'text') return entries[0].trim() || undefined

  const [left, right, ...rest] = entries[0].split('..')
  if (right === undefined || rest.length > 0) return undefined
  if (kind === 'range') {
    const number = (text: string) => {
      if (text === '') return undefined
      const value = Number(text)
      return Number.isFinite(value) ? value : null
    }
    const pair = [number(left), number(right)]
    if (pair.includes(null) || pair.every((v) => v === undefined))
      return undefined
    return pair as RangeValue
  }
  const day = (text: string) =>
    text === '' ? undefined : DAY.test(text) ? text : null
  const pair = [day(left), day(right)]
  if (pair.includes(null) || pair.every((v) => v === undefined))
    return undefined
  return pair as DatesValue
}
