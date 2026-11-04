import { FlexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../lib/cn.ts'
import { COLUMN_BY_ID } from './columns.tsx'
import type { OffersTableInstance } from './useOffersTable.ts'

const kindOf = (columnId: string) => COLUMN_BY_ID.get(columnId)?.kind

/**
 * Only the rows on screen are drawn (see below), so column widths can't come
 * from the content: they would jump while scrolling. Long text gets a fixed
 * width and wraps ("Saint-Jean-de-Gonville (near Geneva)"); dates get a
 * minimum width. The width sits on a box inside the cell, because browsers
 * don't reliably apply widths to table cells themselves.
 */
const TEXT_WIDTH: Record<string, string> = {
  from: 'w-40',
  to: 'w-40',
  vehicle: 'w-60',
  category: 'w-44',
  fromAddress: 'w-64',
  toAddress: 'w-64',
}

/** A typical row's height. Rows are measured once drawn, since long text wraps. */
const ROW_HEIGHT = 33

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  const Icon =
    sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <Icon
      aria-hidden
      className={cn('size-3.5 shrink-0', !sorted && 'opacity-40')}
    />
  )
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
export function OffersTable({ table }: { table: OffersTableInstance }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
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

  // After a new sort, show the top of the list.
  const sorting = JSON.stringify(table.state.sorting)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [sorting])

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
                const numeric = kindOf(column.id) === 'number'
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : undefined
                    }
                    className={cn(
                      'sticky top-0 z-10 border-b border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold whitespace-nowrap text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
                      numeric ? 'text-right' : 'text-left',
                    )}
                  >
                    {column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={column.getToggleSortingHandler()}
                        className={cn(
                          // Numbers: the label lines up with the right-aligned values.
                          'flex w-full items-center gap-1 rounded hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:text-white',
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
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          <Spacer height={spaceAbove} columns={columnCount} />
          {items.map((item) => {
            const row = rows[item.index]
            return (
              <tr
                key={row.id}
                data-index={item.index}
                ref={virtualizer.measureElement}
                aria-rowindex={item.index + 2}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              >
                {row.getVisibleCells().map((cell) => {
                  const kind = kindOf(cell.column.id)
                  const width = TEXT_WIDTH[cell.column.id]
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'border-b border-zinc-100 px-3 py-1.5 align-top dark:border-zinc-800/70',
                        kind === 'number' && 'text-right tabular-nums',
                        kind === 'date' && 'min-w-28',
                        !width && 'whitespace-nowrap',
                      )}
                    >
                      {width ? (
                        <div className={width}>
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
