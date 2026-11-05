import { describe, expect, it } from 'vitest'
import { COLUMN_BY_ID } from './columns.tsx'
import { describeFilter, shortDay } from './describeFilter.ts'

const describeOn = (id: string, value: unknown) => {
  const column = COLUMN_BY_ID.get(id)
  if (!column) throw new Error(`no column ${id}`)
  return describeFilter(column, value)
}

describe('filter chips', () => {
  it('name the ticked values, and count the rest', () => {
    expect(describeOn('fromCountry', ['ES'])).toBe('Spain (ES)')
    expect(describeOn('fromCountry', ['ES', 'PT', 'FR', 'IT'])).toBe(
      'Spain (ES), Portugal (PT) +2',
    )
  })

  it('describe a range in words, with money as money', () => {
    expect(describeOn('price', [undefined, 1])).toBe('up to €1')
    expect(describeOn('sleeps', [2, undefined])).toBe('at least 2')
    expect(describeOn('totalDays', [5, 10])).toBe('5 to 10')
    expect(describeOn('freeKm', [1000, undefined])).toBe('at least 1,000')
  })

  it('show dates short', () => {
    expect(shortDay('2026-11-07')).toBe('7 Nov')
    expect(describeOn('startDate', ['2026-11-07', '2026-11-08'])).toBe(
      '7 Nov – 8 Nov',
    )
    expect(describeOn('endDate', ['2026-11-07', undefined])).toBe('from 7 Nov')
    expect(describeOn('endDate', [undefined, '2026-11-30'])).toBe(
      'until 30 Nov',
    )
    expect(describeOn('startDate', ['2026-11-07', '2026-11-07'])).toBe('7 Nov')
  })

  it('quote text', () => {
    expect(describeOn('vehicle', 'crafter')).toBe('“crafter”')
  })
})
