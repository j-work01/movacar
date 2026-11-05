import type { ColumnFiltersState } from '@tanstack/react-table'
import { X } from 'lucide-react'
import { COLUMN_BY_ID } from '../table/columns.tsx'
import { describeFilter } from '../table/describeFilter.ts'

interface Chip {
  key: string
  label: string
  text: string
  remove: () => void
}

/** The active filters as chips: "Price: up to €1 ×", plus "Clear all". */
export function FilterChips({
  columnFilters,
  search,
  onRemoveFilter,
  onClearSearch,
  onClearAll,
}: {
  columnFilters: ColumnFiltersState
  search: string
  onRemoveFilter: (columnId: string) => void
  onClearSearch: () => void
  onClearAll: () => void
}) {
  const chips: Chip[] = []
  if (search.trim()) {
    chips.push({
      key: 'search',
      label: 'Search',
      text: `“${search.trim()}”`,
      remove: onClearSearch,
    })
  }
  for (const filter of columnFilters) {
    const column = COLUMN_BY_ID.get(filter.id)
    if (!column) continue
    chips.push({
      key: filter.id,
      label: column.label,
      text: describeFilter(column, filter.value),
      remove: () => onRemoveFilter(filter.id),
    })
  }
  if (chips.length === 0) return null

  return (
    <ul
      aria-label="Active filters"
      className="flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:flex-wrap"
    >
      {chips.map((chip) => (
        <li
          key={chip.key}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-0.5 pr-1 pl-2.5 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
        >
          <span>
            <span className="font-medium">{chip.label}:</span> {chip.text}
          </span>
          <button
            type="button"
            aria-label={`Remove filter: ${chip.label}`}
            className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900"
            onClick={chip.remove}
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </li>
      ))}
      <li className="shrink-0">
        <button
          type="button"
          className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          onClick={onClearAll}
        >
          Clear all
        </button>
      </li>
    </ul>
  )
}
