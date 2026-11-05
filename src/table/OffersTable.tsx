import { FlexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Offer } from '../data/types.ts'
import { cn } from '../lib/cn.ts'
import { liftMarked, type RowMark } from '../map/routes.ts'
import { ColumnFilter } from './ColumnFilter.tsx'
import { COLUMN_BY_ID } from './columns.tsx'
import type { OffersTableInstance } from './useOffersTable.ts'

/** Numbers line up on the right, unless their column says otherwise. */
const alignsEnd = (columnId: string) => {
  const config = COLUMN_BY_ID.get(columnId)
  return (
    (config?.align ?? (config?.kind === 'number' ? 'end' : 'start')) === 'end'
  )
}

/**
 * Long text gets a fixed width: cut off with "…" (the full text shows on
 * hover), or wrapped when "Wrap text" is on. Fixed, because only the rows on
 * screen are drawn (see below): widths taken from the content would jump
 * while scrolling. The width sits on a box inside the cell, because browsers
 * don't reliably apply widths to table cells themselves.
 */
const TEXT_WIDTH: Record<string, string> = {
  from: 'min-w-40',
  to: 'min-w-40',
  vehicle: 'min-w-60',
  category: 'min-w-44',
  fromAddress: 'min-w-64',
  toAddress: 'min-w-64',
}

/** A one-line row's height. Rows are measured once drawn, for wrapped text. */
const ROW_HEIGHT = 33

/** Only the sorted column shows an arrow, so the others stay narrow. */
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (!sorted) return null
  const Icon = sorted === 'asc' ? ArrowUp : ArrowDown
  return <Icon aria-hidden className="size-3 shrink-0" />
}

/** Stands in for the rows above or below the screen, which aren't drawn. */
function Spacer({ height, columns }: { height: number; columns: number }) {
  if (height <= 0) return null
  return (
    <tr aria-hidden="true">
      <td colSpan={columns} style={{ height, padding: 0, border: 0 }} />
    </tr>
  )
}

/**
 * The offers table. With 800+ offers, drawing every row makes a phone slow
 * (seconds per sort), so only the rows on screen, plus a few, are drawn.
 */
export function OffersTable({
  table,
  wrap = false,
  emptyMessage,
  mark,
  markKey = null,
  chosenId = null,
  onRowClick,
}: {
  table: OffersTableInstance
  /** Wrap long text over several lines instead of cutting it off. */
  wrap?: boolean
  /** Shown instead of rows when nothing matches. */
  emptyMessage?: ReactNode
  /**
   * Lights up the offers of a city picked on the map: those leaving from it,
   * then those arriving there, come first.
   */
  mark?: (offer: Offer) => RowMark
  /** Which city is marked; a new one scrolls back to the top. */
  markKey?: string | null
  /** The offer whose route the map shows. */
  chosenId?: string | null
  /** Tapping a row (when the map is on). */
  onRowClick?: (offer: Offer) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sortedRows = table.getRowModel().rows
  const rows = useMemo(
    () =>
      mark ? liftMarked(sortedRows, (row) => mark(row.original)) : sortedRows,
    [sortedRows, mark],
  )
  const headerGroups = table.getHeaderGroups()
  const columnCount = headerGroups[0]?.headers.length ?? 1

  // The linter warns that React Compiler can't optimise this hook. This
  // project doesn't use React Compiler, and would just skip this component.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => rows[index].id,
    overscan: 12,
  })
  const items = virtualizer.getVirtualItems()
  const spaceAbove = items.length > 0 ? items[0].start : 0
  const spaceBelow =
    items.length > 0
      ? virtualizer.getTotalSize() - items[items.length - 1].end
      : 0

  // After a new sort, filter or city on the map, show the top of the list.
  const view = JSON.stringify([
    table.state.sorting,
    table.state.columnFilters,
    markKey,
  ])
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [view])

  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <table
        aria-rowcount={rows.length + 1}
        className="min-w-full border-separate border-spacing-0 text-sm"
      >
        <thead>
          {headerGroups.map((group) => (
            <tr key={group.id} aria-rowindex={1}>
              {group.headers.map((header) => {
                const column = header.column
                const sorted = column.getIsSorted()
                const numeric = alignsEnd(column.id)
                const config = COLUMN_BY_ID.get(column.id)
                return (
                  <th
                    key={header.id}
                    scope="col"
                    // "C" shows "From country" on hover.
                    title={config?.header ? config.label : undefined}
                    aria-sort={
                      sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : undefined
                    }
                    className="sticky top-0 z-10 border-b border-zinc-300 bg-zinc-50 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {/* Numbers: right-aligned, like their values. */}
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        numeric && 'flex-row-reverse',
                      )}
                    >
                      {column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={column.getToggleSortingHandler()}
                          className={cn(
                            'flex items-center gap-0.5 rounded hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:text-white',
                            numeric && 'flex-row-reverse',
                            sorted && 'text-zinc-950 dark:text-white',
                          )}
                        >
                          <FlexRender header={header} />
                          <SortIcon sorted={sorted} />
                        </button>
                      ) : (
                        <FlexRender header={header} />
                      )}
                      <ColumnFilter column={column} />
                    </div>
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 && emptyMessage && (
            <tr>
              <td
                colSpan={columnCount}
                className="px-4 py-10 text-center text-zinc-600 dark:text-zinc-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          <Spacer height={spaceAbove} columns={columnCount} />
          {items.map((item) => {
            const row = rows[item.index]
            const rowMark = mark?.(row.original) ?? null
            const chosen = chosenId === row.original.id
            return (
              <tr
                key={row.id}
                data-index={item.index}
                ref={virtualizer.measureElement}
                aria-rowindex={item.index + 2}
                data-mark={rowMark ?? undefined}
                data-chosen={chosen || undefined}
                onClick={
                  onRowClick &&
                  ((event) => {
                    // Not when opening the link, or selecting text to copy.
                    if ((event.target as HTMLElement).closest('a, button'))
                      return
                    if (window.getSelection()?.toString()) return
                    onRowClick(row.original)
                  })
                }
                className={cn(
                  // Lit up like its route on the map: blue leaving, orange
                  // arriving, yellow for the one tapped.
                  chosen
                    ? 'bg-yellow-100 dark:bg-yellow-900/50'
                    : rowMark === 'leaving'
                      ? 'bg-blue-100 dark:bg-blue-950'
                      : rowMark === 'arriving'
                        ? 'bg-orange-100 dark:bg-orange-950/70'
                        : // Every other row is shaded, by position in the list
                          // (the drawn rows change while scrolling, so CSS
                          // can't count them).
                          cn(
                            item.index % 2 === 1 &&
                              'bg-zinc-100/70 dark:bg-zinc-900',
                            'hover:bg-blue-50 dark:hover:bg-zinc-800',
                          ),
                  onRowClick && 'cursor-pointer',
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const config = COLUMN_BY_ID.get(cell.column.id)
                  const width = TEXT_WIDTH[cell.column.id]
                  const value = cell.getValue()
                  const tooltip =
                    config?.tooltip?.(row.original) ??
                    (typeof value === 'string' ? value : undefined)
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-2 py-1.5 align-top',
                        alignsEnd(cell.column.id) && 'text-right tabular-nums',
                        config?.kind === 'date' && 'min-w-28',
                        !(width && wrap) && 'whitespace-nowrap',
                      )}
                    >
                      {width ? (
                        <div
                          className={cn(
                            // At least this wide, and wider when the table
                            // stretches to fill a wide screen. (Its text
                            // doesn't widen the column: that would jump
                            // while scrolling.)
                            'w-full [contain:inline-size]',
                            width,
                            !wrap && 'truncate',
                          )}
                          title={tooltip}
                        >
                          <FlexRender cell={cell} />
                        </div>
                      ) : (
                        <FlexRender cell={cell} />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          <Spacer height={spaceBelow} columns={columnCount} />
        </tbody>
      </table>
    </div>
  )
}
