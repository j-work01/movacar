import {
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type SortingState,
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import type { Offer } from '../data/types.ts'
import { readStored, removeStored, writeStored } from '../lib/storage.ts'
import {
  COLUMNS,
  DEFAULT_VISIBILITY,
  features,
  tableColumns,
} from './columns.tsx'
import type { ViewState } from './view.ts'

const VISIBILITY_KEY = 'movacar-board.columns.v2'
/** Version 1 stored every column, which kept new defaults from showing. */
const OLD_VISIBILITY_KEY = 'movacar-board.columns'

/**
 * Only the columns the viewer changed are stored. A column they never
 * touched follows the default, also when the default changes later.
 */
const changesFromDefault = (visibility: ColumnVisibilityState) =>
  Object.fromEntries(
    Object.entries(visibility).filter(
      ([id, shown]) =>
        id in DEFAULT_VISIBILITY && shown !== DEFAULT_VISIBILITY[id],
    ),
  )

/**
 * Which columns show. Remembered per device, so the phone can show fewer
 * columns than the laptop.
 */
export function useColumnVisibility() {
  const [visibility, setVisibility] = useState<ColumnVisibilityState>(() => {
    removeStored(OLD_VISIBILITY_KEY)
    return {
      ...DEFAULT_VISIBILITY,
      ...readStored<ColumnVisibilityState>(VISIBILITY_KEY),
    }
  })
  useEffect(
    () => writeStored(VISIBILITY_KEY, changesFromDefault(visibility)),
    [visibility],
  )

  const showAll = useCallback(
    () =>
      setVisibility(
        Object.fromEntries(COLUMNS.map((column) => [column.id, true])),
      ),
    [],
  )
  const reset = useCallback(() => setVisibility(DEFAULT_VISIBILITY), [])
  return { visibility, setVisibility, showAll, reset }
}

export function useOffersTable(offers: Offer[], initial: ViewState) {
  const [sorting, setSorting] = useState<SortingState>(initial.sorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initial.columnFilters,
  )
  const columns = useColumnVisibility()

  const table = useTable({
    features,
    columns: tableColumns,
    data: offers,
    getRowId: (offer) => offer.id,
    state: { sorting, columnVisibility: columns.visibility, columnFilters },
    onSortingChange: setSorting,
    onColumnVisibilityChange: columns.setVisibility,
    onColumnFiltersChange: setColumnFilters,
    // One column at a time, ascending first, and always sorted by something.
    enableMultiSort: false,
    enableSortingRemoval: false,
    sortDescFirst: false,
  })

  return { table, columns, sorting, columnFilters, setColumnFilters }
}

export type OffersTableApi = ReturnType<typeof useOffersTable>
export type OffersTableInstance = OffersTableApi['table']
