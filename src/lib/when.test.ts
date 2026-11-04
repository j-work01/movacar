import { describe, expect, it } from 'vitest'
import { describeWhen, timeAgo } from './when.ts'

const NL = 'Europe/Amsterdam'
const at = (iso: string) => new Date(iso)
const now = at('2026-11-04T20:36:00Z') // 4 November, 21:36 in the Netherlands

describe('describeWhen', () => {
  it('says "today" and how long ago', () => {
    expect(describeWhen(at('2026-11-04T20:24:00Z'), now, NL)).toBe(
      '4 November (today) at 21:24 (12 min ago)',
    )
  })

  it('says "yesterday"', () => {
    expect(describeWhen(at('2026-11-03T20:24:00Z'), now, NL)).toBe(
      '3 November (yesterday) at 21:24',
    )
  })

  it('counts calendar days, not 24-hour periods', () => {
    // 2 Nov 23:50 is less than 46 hours ago, but two calendar days back;
    // 3 Nov 23:50 is less than 22 hours ago, and yesterday.
    expect(describeWhen(at('2026-11-02T22:50:00Z'), now, NL)).toBe(
      '2 November (2 days ago) at 23:50',
    )
    expect(describeWhen(at('2026-11-03T22:50:00Z'), now, NL)).toBe(
      '3 November (yesterday) at 23:50',
    )
  })

  it('uses the time zone it is given', () => {
    expect(describeWhen(at('2026-11-04T20:24:00Z'), now, 'Europe/London')).toBe(
      '4 November (today) at 20:24 (12 min ago)',
    )
  })

  it('adds the year when it is a different one', () => {
    expect(describeWhen(at('2025-12-30T10:00:00Z'), now, NL)).toBe(
      '30 December 2025 (309 days ago) at 11:00',
    )
  })

  it('treats a moment slightly in the future (clock skew) as just now', () => {
    expect(describeWhen(at('2026-11-04T20:37:00Z'), now, NL)).toBe(
      '4 November (today) at 21:37 (just now)',
    )
  })
})

describe('timeAgo', () => {
  it.each([
    [0, 'just now'],
    [59_000, 'just now'],
    [60_000, '1 min ago'],
    [12 * 60_000, '12 min ago'],
    [60 * 60_000, '1 hour ago'],
    [3.5 * 60 * 60_000, '3 hours ago'],
  ])('%i ms is "%s"', (ms, text) => {
    expect(timeAgo(ms)).toBe(text)
  })
})
