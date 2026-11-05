import { describe, expect, it } from 'vitest'
import { makeOffer } from '../test/offers.ts'
import {
  COLUMN_BY_ID,
  COLUMNS,
  csvValue,
  daysText,
  DEFAULT_VISIBILITY,
} from './columns.tsx'

const column = (id: string) => {
  const found = COLUMN_BY_ID.get(id)
  if (!found) throw new Error(`no column ${id}`)
  return found
}
const valueOf = (id: string, offer = makeOffer('1')) => column(id).value(offer)

describe('columns', () => {
  it('show the agreed columns by default', () => {
    const shown = COLUMNS.filter((c) => DEFAULT_VISIBILITY[c.id]).map(
      (c) => c.label,
    )
    expect(shown).toEqual([
      'From',
      'From country',
      'To',
      'To country',
      'Vehicle',
      'Company',
      'Sleeps',
      'Earliest pick-up',
      'Return by',
      'Days',
      'Free km',
      'Route km',
      'Price',
    ])
  })

  it('turn the API units into days, euros and km', () => {
    expect(valueOf('days')).toBe(5) // period 120 hours
    expect(valueOf('extraDays')).toBe(1) // "+ 1 day extra": 144 − 120 hours
    expect(valueOf('price')).toBe(129)
    expect(valueOf('extraKm')).toBe(0.5)
    expect(valueOf('routeKm')).toBe(2332)
    expect(valueOf('minLicence')).toBe(1) // 12 months
  })

  it('show all days, with the included + extra ones in brackets', () => {
    const days = (included: number, extra: number) =>
      makeOffer('1', {
        periodHours: included * 24,
        extraPeriodHours: (included + extra) * 24,
      })
    expect(daysText(days(15, 5))).toBe('20 (15+5)')
    expect(daysText(days(19, 0))).toBe('19')
    expect(daysText(days(2, 6))).toBe('8 (2+6)')
    expect(daysText(days(1, 1))).toBe('2 (1+1)')
    // Sorted and filtered by all days together.
    expect(valueOf('totalDays', days(15, 5))).toBe(20)
    expect(daysText(makeOffer('1', { periodHours: null }))).toBe('—')
  })

  it('never show negative extra days', () => {
    const offer = makeOffer('1', { periodHours: 384, extraPeriodHours: 168 })
    expect(valueOf('extraDays', offer)).toBe(0)
  })

  it('treat missing values as blanks, which sort last', () => {
    const offer = makeOffer('1', {
      sleeps: null,
      price: null,
      category: null,
      periodHours: null,
    })
    for (const id of ['sleeps', 'price', 'category', 'days', 'extraDays']) {
      expect(valueOf(id, offer)).toBeUndefined()
    }
  })

  it('keep 0 beds as 0', () => {
    expect(valueOf('sleeps', makeOffer('1', { sleeps: 0 }))).toBe(0)
  })

  it('write plain values to the CSV', () => {
    const offer = makeOffer('1')
    expect(csvValue(column('startDate'), offer)).toBe('2026-11-21')
    expect(csvValue(column('fromCountry'), offer)).toBe('Germany')
    expect(csvValue(column('toCountry'), offer)).toBe('Spain')
    expect(csvValue(column('price'), offer)).toBe(129)
  })
})

describe('older data files', () => {
  it('show a field they do not have yet as a blank, not NaN', () => {
    const old = makeOffer('1') as unknown as Record<string, unknown>
    delete old.minLicenceMonths
    delete old.centsPerExtraKm
    const offer = old as unknown as ReturnType<typeof makeOffer>
    expect(valueOf('minLicence', offer)).toBeUndefined()
    expect(valueOf('extraKm', offer)).toBeUndefined()
  })
})
