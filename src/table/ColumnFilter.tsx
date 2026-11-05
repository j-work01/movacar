import type { Column } from '@tanstack/react-table'
import { Funnel } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useMemo, useState } from 'react'
import type { Offer } from '../data/types.ts'
import { cn } from '../lib/cn.ts'
import {
  COLUMN_BY_ID,
  compareText,
  filterKindOf,
  type ColumnConfig,
  type Features,
} from './columns.tsx'
import {
  matchesWords,
  normalize,
  words,
  type DatesValue,
  type ListValue,
  type RangeValue,
} from './filters.ts'

type OffersColumn = Column<Features, Offer>

/** Shared, so an empty tick-list doesn't count as a change on every render. */
const NOTHING_TICKED: ListValue = []

const input =
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950'

/** Tick the values to keep. Counts follow the other active filters. */
function ListEditor({
  column,
  config,
}: {
  column: OffersColumn
  config: ColumnConfig
}) {
  const selected =
    (column.getFilterValue() as ListValue | undefined) ?? NOTHING_TICKED
  const counts = column.getFacetedUniqueValues()
  const [query, setQuery] = useState('')

  const options = useMemo(() => {
    const values = new Set<string>()
    for (const value of counts.keys()) {
      if (value !== undefined) values.add(String(value))
    }
    for (const value of selected) values.add(value) // keep ticked ones visible
    return [...values]
      .map((value) => ({
        value,
        label: config.optionLabel?.(value) ?? value,
        count: counts.get(value) ?? 0,
      }))
      .sort((a, b) => compareText(a.label, b.label))
  }, [counts, selected, config])

  const queryWords = words(query)
  const shown = queryWords.length
    ? options.filter((option) =>
        matchesWords(normalize(option.label), queryWords),
      )
    : options

  const toggle = (value: string) =>
    column.setFilterValue(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )

  return (
    <div className="space-y-2">
      {options.length > 8 && (
        <input
          type="search"
          aria-label={`Search ${config.label}`}
          placeholder="Search…"
          className={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      <ul className="-mx-1 max-h-64 overflow-y-auto">
        {shown.map((option) => (
          <li key={option.value}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-blue-700"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span className="flex-1">{option.label}</span>
              <span className="text-xs text-zinc-500 tabular-nums">
                {option.count}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {shown.length === 0 && (
        <p className="text-sm text-zinc-500">Nothing matches.</p>
      )}
    </div>
  )
}

/** Text the viewer is typing; the filter gets the number once it is one. */
function NumberInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: number | undefined
  placeholder: string
  onChange: (value: number | undefined) => void
}) {
  // Keeps "1." while typing "1.5", which a number-only state would lose.
  const [text, setText] = useState(value === undefined ? '' : String(value))
  return (
    <label className="block text-xs text-zinc-600 dark:text-zinc-400">
      {label}
      <input
        type="number"
        inputMode="decimal"
        className={cn(input, 'mt-1')}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const number =
            event.target.value === '' ? undefined : Number(event.target.value)
          if (number === undefined || Number.isFinite(number)) onChange(number)
        }}
      />
    </label>
  )
}

function RangeEditor({ column }: { column: OffersColumn }) {
  const [min, max] = (column.getFilterValue() as RangeValue | undefined) ?? [
    undefined,
    undefined,
  ]
  const bounds = column.getFacetedMinMaxValues()
  const set = (next: RangeValue) =>
    column.setFilterValue(
      next[0] === undefined && next[1] === undefined ? undefined : next,
    )
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberInput
        label="Minimum"
        value={min}
        placeholder={bounds ? String(bounds[0]) : ''}
        onChange={(value) => set([value, max])}
      />
      <NumberInput
        label="Maximum"
        value={max}
        placeholder={bounds ? String(bounds[1]) : ''}
        onChange={(value) => set([min, value])}
      />
    </div>
  )
}

function DatesEditor({
  column,
  pickup,
}: {
  column: OffersColumn
  pickup: boolean
}) {
  const [from, to] = (column.getFilterValue() as DatesValue | undefined) ?? [
    undefined,
    undefined,
  ]
  const set = (next: DatesValue) =>
    column.setFilterValue(
      next[0] === undefined && next[1] === undefined ? undefined : next,
    )
  return (
    <div className="space-y-2">
      {pickup && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Shows offers you can pick up on at least one of these days.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-zinc-600 dark:text-zinc-400">
          From
          <input
            type="date"
            className={cn(input, 'mt-1')}
            value={from ?? ''}
            max={to}
            onChange={(event) => set([event.target.value || undefined, to])}
          />
        </label>
        <label className="block text-xs text-zinc-600 dark:text-zinc-400">
          To
          <input
            type="date"
            className={cn(input, 'mt-1')}
            value={to ?? ''}
            min={from}
            onChange={(event) => set([from, event.target.value || undefined])}
          />
        </label>
      </div>
    </div>
  )
}

function TextEditor({
  column,
  config,
}: {
  column: OffersColumn
  config: ColumnConfig
}) {
  return (
    <input
      type="search"
      aria-label={`${config.label} contains`}
      placeholder="Contains…"
      className={input}
      value={(column.getFilterValue() as string | undefined) ?? ''}
      onChange={(event) =>
        column.setFilterValue(event.target.value || undefined)
      }
    />
  )
}

/** The funnel button in a column header, and the filter it opens. */
export function ColumnFilter({ column }: { column: OffersColumn }) {
  // Bumped by "Clear", so the editors forget what was typed in them.
  const [resets, setResets] = useState(0)
  const config = COLUMN_BY_ID.get(column.id)
  if (!config || !column.getCanFilter()) return null
  const kind = filterKindOf(config)
  const active = column.getIsFiltered()

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Filter ${config.label}`}
        className={cn(
          // A small icon, so it hardly widens the column, with a bigger
          // invisible area around it (24 × 28 px) that's easy to tap.
          "relative shrink-0 rounded after:absolute after:-inset-x-1.5 after:-inset-y-2 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
          active
            ? 'text-blue-700 dark:text-blue-400'
            : 'text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100',
        )}
      >
        <Funnel
          aria-hidden
          className={cn('size-3', active && 'fill-current')}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          aria-label={`Filter ${config.label}`}
          tabIndex={-1}
          // Focus the panel itself rather than its first box: on a phone,
          // focusing a box pops up the keyboard before anything is ticked.
          // A text filter is all typing, so that one does focus its box.
          onOpenAutoFocus={(event) => {
            if (kind === 'text') return
            event.preventDefault()
            ;(event.currentTarget as HTMLElement | null)?.focus()
          }}
          className="z-30 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-zinc-200 bg-white p-3 text-left text-zinc-900 shadow-lg focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{config.label}</p>
            {active && (
              <button
                type="button"
                className="text-xs text-blue-700 hover:underline dark:text-blue-400"
                onClick={() => {
                  column.setFilterValue(undefined)
                  setResets((count) => count + 1)
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div key={resets}>
            {kind === 'list' && <ListEditor column={column} config={config} />}
            {kind === 'range' && <RangeEditor column={column} />}
            {(kind === 'dates' || kind === 'pickup') && (
              <DatesEditor column={column} pickup={kind === 'pickup'} />
            )}
            {kind === 'text' && <TextEditor column={column} config={config} />}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
