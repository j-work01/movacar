// How an active filter reads in its chip: "Price: up to €1",
// "From country: Spain (ES), Portugal (PT) +1", "Earliest pick-up: 7–8 Nov".

import { type ColumnConfig, filterKindOf, formatValue } from './columns.tsx'
import {
  EITHER_END,
  type DatesValue,
  type ListValue,
  type RangeValue,
} from './filters.ts'

const dayMonth = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
})

/** "2026-11-07" → "7 Nov" */
export function shortDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return dayMonth.format(new Date(Date.UTC(year, month - 1, date)))
}

function between(
  low: string | undefined,
  high: string | undefined,
  words: { both: string; from: string; to: string },
) {
  if (low && high) return low === high ? low : `${low} ${words.both} ${high}`
  if (low) return `${words.from} ${low}`
  return `${words.to} ${high}`
}

export function describeFilter(column: ColumnConfig, value: unknown): string {
  switch (filterKindOf(column)) {
    case 'list': {
      const ticked = (value as ListValue).filter((item) => item !== EITHER_END)
      const labels = ticked.map((item) => column.optionLabel?.(item) ?? item)
      const extra = labels.length > 2 ? ` +${labels.length - 2}` : ''
      // "From country: Germany (DE) · or To"
      const either = (value as ListValue).includes(EITHER_END)
        ? ` · or ${column.id.startsWith('from') ? 'To' : 'From'}`
        : ''
      return labels.slice(0, 2).join(', ') + extra + either
    }
    case 'range': {
      const [min, max] = value as RangeValue
      const amount = (n: number | undefined) =>
        n === undefined
          ? undefined
          : (column.formatAmount?.(n) ?? formatValue(column, n))
      return between(amount(min), amount(max), {
        both: 'to',
        from: 'at least',
        to: 'up to',
      })
    }
    case 'dates':
    case 'pickup': {
      const [from, to] = value as DatesValue
      return between(from && shortDay(from), to && shortDay(to), {
        both: '–',
        from: 'from',
        to: 'until',
      })
    }
    case 'text':
      return `“${String(value)}”`
  }
}
