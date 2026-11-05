// The view (sorting, filters, search) and the web address, so a view can be
// bookmarked or shared: ?fromCountry=NL&sleeps=2..&price=..1&sort=-price

import type { ColumnFiltersState, SortingState } from '@tanstack/react-table'
import { COLUMN_BY_ID, filterKindOf } from './columns.tsx'
import { filterFromUrl, filterToUrl } from './filters.ts'

export interface ViewState {
  sorting: SortingState
  columnFilters: ColumnFiltersState
  search: string
}

/** Sorted by earliest pick-up until the viewer picks another column. */
export const DEFAULT_SORTING: SortingState = [{ id: 'startDate', desc: false }]

export const DEFAULT_VIEW: ViewState = {
  sorting: DEFAULT_SORTING,
  columnFilters: [],
  search: '',
}

/** Reads a view from the web address. Anything that doesn't make sense is ignored. */
export function viewFromUrl(query: string): ViewState {
  const params = new URLSearchParams(query)

  let sorting = DEFAULT_SORTING
  const sort = params.get('sort')
  if (sort) {
    const desc = sort.startsWith('-')
    const id = desc ? sort.slice(1) : sort
    if (COLUMN_BY_ID.has(id)) sorting = [{ id, desc }]
  }

  const columnFilters: ColumnFiltersState = []
  for (const id of new Set(params.keys())) {
    const column = COLUMN_BY_ID.get(id)
    if (!column) continue
    const value = filterFromUrl(filterKindOf(column), params.getAll(id))
    if (value !== undefined) columnFilters.push({ id, value })
  }

  return { sorting, columnFilters, search: params.get('q')?.trim() ?? '' }
}

/** The query part of the web address for a view; empty for the default view. */
export function viewToUrl(view: ViewState): string {
  const params = new URLSearchParams()
  const search = view.search.trim()
  if (search) params.set('q', search)

  for (const filter of view.columnFilters) {
    const column = COLUMN_BY_ID.get(filter.id)
    if (!column) continue
    for (const entry of filterToUrl(filterKindOf(column), filter.value)) {
      params.append(filter.id, entry)
    }
  }

  const [sort] = view.sorting
  const [standard] = DEFAULT_SORTING
  if (sort && (sort.id !== standard.id || sort.desc !== standard.desc)) {
    params.set('sort', `${sort.desc ? '-' : ''}${sort.id}`)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}
