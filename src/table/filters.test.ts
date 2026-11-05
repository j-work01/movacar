import { describe, expect, it } from 'vitest'
import type { Offer } from '../data/types.ts'
import { makeOffer } from '../test/offers.ts'
import {
  canPickUpBetween,
  containsWords,
  filterFromUrl,
  filterToUrl,
  inList,
  inRange,
  matchesWords,
  normalize,
  onDays,
  searchText,
  words,
} from './filters.ts'

/** A stand-in for a table row with one value (and the offer behind it). */
const row = (value: unknown, offer: Offer = makeOffer('1')) =>
  ({ getValue: () => value, original: offer }) as never

describe('list filter', () => {
  it('keeps any of the ticked values', () => {
    expect(inList(row('ES'), 'c', ['ES', 'PT'])).toBe(true)
    expect(inList(row('DE'), 'c', ['ES', 'PT'])).toBe(false)
  })

  it('goes away when nothing is ticked', () => {
    expect(inList.autoRemove?.([], undefined as never)).toBe(true)
  })
})

describe('range filter', () => {
  it('keeps values within the bounds, including the bounds', () => {
    expect(inRange(row(2), 'c', [2, undefined])).toBe(true)
    expect(inRange(row(1), 'c', [2, undefined])).toBe(false)
    expect(inRange(row(1), 'c', [undefined, 1])).toBe(true)
    expect(inRange(row(129), 'c', [undefined, 1])).toBe(false)
    expect(inRange(row(5), 'c', [2, 5])).toBe(true)
  })

  it('leaves out blanks, and 0 is not blank', () => {
    expect(inRange(row(undefined), 'c', [0, undefined])).toBe(false)
    expect(inRange(row(0), 'c', [0, undefined])).toBe(true)
  })
})

describe('date filters', () => {
  it('compare whole days in Dutch/German time', () => {
    // 23:00 UTC on 20 Nov is already 21 Nov in Berlin.
    expect(
      onDays(row('2026-11-20T23:00:00Z'), 'c', ['2026-11-21', undefined]),
    ).toBe(true)
    expect(
      onDays(row('2026-11-20T22:00:00Z'), 'c', ['2026-11-21', undefined]),
    ).toBe(false)
  })

  it('keep an offer whose pick-up window overlaps the chosen days', () => {
    // Can be picked up from 21 to 27 November.
    const offer = makeOffer('1')
    expect(canPickUpBetween(offer, '2026-11-24', '2026-11-25')).toBe(true)
    expect(canPickUpBetween(offer, '2026-11-01', '2026-11-21')).toBe(true)
    expect(canPickUpBetween(offer, '2026-11-27', '2026-12-31')).toBe(true)
    expect(canPickUpBetween(offer, '2026-11-01', '2026-11-20')).toBe(false)
    expect(canPickUpBetween(offer, '2026-11-28', undefined)).toBe(false)
  })

  it('treat an offer without a latest pick-up as one day', () => {
    const offer = makeOffer('1', { latestPickup: null })
    expect(canPickUpBetween(offer, '2026-11-21', '2026-11-21')).toBe(true)
    expect(canPickUpBetween(offer, '2026-11-22', undefined)).toBe(false)
  })
})

describe('text filter and search', () => {
  it('ignore case and accents, and need every word', () => {
    expect(normalize('Málaga')).toBe('malaga')
    expect(words('  VW   Crafter ')).toEqual(['vw', 'crafter'])
    expect(containsWords(row('Volkswagen Crafter'), 'c', 'crafter')).toBe(true)
    expect(containsWords(row('VW Crafter'), 'c', 'vw crafter')).toBe(true)
    expect(containsWords(row('VW Crafter'), 'c', 'vw transit')).toBe(false)
  })

  it('search cities, countries (by name too), vehicles and companies', () => {
    const text = searchText(makeOffer('1'))
    for (const query of [
      'münchen',
      'malaga',
      'spain',
      'germany es',
      'road house',
      'roadsurfer',
    ]) {
      expect(matchesWords(text, words(query)), query).toBe(true)
    }
    expect(matchesWords(text, words('portugal'))).toBe(false)
  })
})

describe('filters in the web address', () => {
  it('write and read back each kind', () => {
    const roundTrip = (
      kind: Parameters<typeof filterToUrl>[0],
      value: unknown,
    ) => filterFromUrl(kind, filterToUrl(kind, value))
    expect(roundTrip('list', ['NL', 'BE'])).toEqual(['NL', 'BE'])
    expect(roundTrip('range', [undefined, 1])).toEqual([undefined, 1])
    expect(roundTrip('range', [2, 5])).toEqual([2, 5])
    expect(roundTrip('pickup', ['2026-11-07', '2026-11-08'])).toEqual([
      '2026-11-07',
      '2026-11-08',
    ])
    expect(roundTrip('text', 'crafter')).toEqual('crafter')
  })

  it('look readable', () => {
    expect(filterToUrl('range', [undefined, 1])).toEqual(['..1'])
    expect(filterToUrl('dates', ['2026-11-07', undefined])).toEqual([
      '2026-11-07..',
    ])
  })

  it('ignore values that make no sense', () => {
    expect(filterFromUrl('range', ['abc..'])).toBeUndefined()
    expect(filterFromUrl('range', ['..'])).toBeUndefined()
    expect(filterFromUrl('range', ['5'])).toBeUndefined()
    expect(filterFromUrl('dates', ['tomorrow..'])).toBeUndefined()
    expect(filterFromUrl('list', [''])).toBeUndefined()
    expect(filterFromUrl('text', ['  '])).toBeUndefined()
  })
})
