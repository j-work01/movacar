import {
  useTable,
  type ColumnVisibilityState,
  type SortingState,
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import type { Offer } from '../data/types.ts'
import { readStored, writeStored } from '../lib/storage.ts'
import {
  COLUMNS,
  DEFAULT_VISIBILITY,
  features,
  tableColumns,
} from './columns.tsx'

const VISIBILITY_KEY = 'movacar-board.columns'

/** Sorted by earliest pick-up until the viewer picks another column. */
export const DEFAULT_SORTING: SortingState = [{ id: 'startDate', desc: false }]

/**
 * Which columns show. Remembered per device, so the phone can show fewer
 * columns than the laptop. Columns added later start with their default.
 */
export function useColumnVisibility() {
  const [visibility, setVisibility] = useState<ColumnVisibilityState>(() => ({
    ...DEFAULT_VISIBILITY,
    ...readStored<ColumnVisibilityState>(VISIBILITY_KEY),
  }))
  useEffect(() => writeStored(VISIBILITY_KEY, visibility), [visibility])

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

export function useOffersTable(offers: Offer[]) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const columns = useColumnVisibility()

  const table = useTable({
    features,
    columns: tableColumns,
    data: offers,
    getRowId: (offer) => offer.id,
    state: { sorting, columnVisibility: columns.visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: columns.setVisibility,
    // One column at a time, ascending first, and always sorted by something.
    enableMultiSort: false,
    enableSortingRemoval: false,
    sortDescFirst: false,
  })

  return { table, columns }
}

export type OffersTableApi = ReturnType<typeof useOffersTable>
export type OffersTableInstance = OffersTableApi['table']
