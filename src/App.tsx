import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AppMenu } from './components/AppMenu.tsx'
import { FilterChips } from './components/FilterChips.tsx'
import { RefreshNotes } from './components/RefreshNotes.tsx'
import { loadOffers, loadStatus } from './data/load.ts'
import type { Offer, OffersFile, RefreshStatus } from './data/types.ts'
import { useStoredState } from './lib/storage.ts'
import { useDarkMode } from './lib/useDarkMode.ts'
import { describeWhen } from './lib/when.ts'
import { REFRESH_URL } from './links.ts'
import { MapPanel } from './map/MapPanel.tsx'
import {
  buildRoutes,
  NOTHING_PICKED,
  rowMark,
  type Selection,
} from './map/routes.ts'
import { MAP_SIZE_KEY, toMapSize } from './map/settings.ts'
import { ColumnsDialog } from './table/ColumnsDialog.tsx'
import { exportCsv } from './table/exportCsv.ts'
import { OffersTable } from './table/OffersTable.tsx'
import { useOffersTable } from './table/useOffersTable.ts'
import { viewFromUrl, viewToUrl } from './table/view.ts'

/** Stable on purpose: a new empty array each render would redo the table. */
const NO_OFFERS: Offer[] = []

type DataState =
  | { kind: 'loading' }
  | { kind: 'loaded'; status: RefreshStatus | null; file: OffersFile | null }
  | { kind: 'error'; message: string }

function useData(): DataState {
  const [state, setState] = useState<DataState>({ kind: 'loading' })
  useEffect(() => {
    Promise.all([loadStatus(), loadOffers()]).then(
      ([status, file]) => setState({ kind: 'loaded', status, file }),
      (error: unknown) =>
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        }),
    )
  }, [])
  return state
}

/** The current time, updated every `ms` so "12 min ago" stays right. */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(timer)
  }, [ms])
  return now
}

/** A short message at the bottom of the screen, e.g. "Link copied". */
function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])
  return [toast, setToast] as const
}

const link =
  'text-blue-700 underline underline-offset-2 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300'

function Message({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-prose px-4 py-10 text-zinc-600 dark:text-zinc-400">
      {children}
    </div>
  )
}

export default function App() {
  const data = useData()
  const now = useNow()
  // The view starts from the web address, so bookmarks and shared links work.
  const [initialView] = useState(() => viewFromUrl(window.location.search))
  const [wrap, setWrap] = useStoredState('movacar-board.wrap', false)
  const [storedMapSize, setMapSize] = useStoredState<unknown>(MAP_SIZE_KEY, 0)
  const mapSize = toMapSize(storedMapSize)
  const [picked, setPicked] = useState<Selection>(NOTHING_PICKED)
  const dark = useDarkMode()
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [toast, setToast] = useToast()

  const file = data.kind === 'loaded' ? data.file : null
  const allOffers = file?.offers ?? NO_OFFERS
  const { table, columns, sorting, columnFilters, setColumnFilters } =
    useOffersTable(allOffers, initialView)

  // Keep the web address in step with the view.
  useEffect(() => {
    const query = viewToUrl({ sorting, columnFilters })
    const { pathname, hash } = window.location
    if (query !== window.location.search) {
      history.replaceState(history.state, '', `${pathname}${query}${hash}`)
    }
  }, [sorting, columnFilters])

  const shown = table.getRowModel().rows.length
  const filtering = columnFilters.length > 0
  const clearFilters = () => setColumnFilters([])

  // The map shows the same offers as the table: the filtered ones.
  const filteredRows = table.getFilteredRowModel().rows
  const map = useMemo(() => {
    const offers = filteredRows.map((row) => row.original)
    const { cities, routes } = buildRoutes(offers)
    return { offers, cities, cityList: [...cities.values()], routes }
  }, [filteredRows])

  // What's picked on the map or in the table, while it's still in the list.
  const pickedCity =
    mapSize > 0 && picked.city && map.cities.has(picked.city)
      ? picked.city
      : null
  const pickedOffer =
    mapSize > 0 &&
    picked.offer &&
    map.offers.some((offer) => offer.id === picked.offer)
      ? picked.offer
      : null
  const pickedRoute =
    mapSize > 0 &&
    picked.route &&
    map.routes.some((route) => route.key === picked.route)
      ? picked.route
      : null
  const shownPick = useMemo(
    () => ({ city: pickedCity, offer: pickedOffer, route: pickedRoute }),
    [pickedCity, pickedOffer, pickedRoute],
  )
  const mark = useMemo(
    () =>
      pickedCity || pickedRoute
        ? (offer: Offer) => rowMark(offer, pickedCity, pickedRoute)
        : undefined,
    [pickedCity, pickedRoute],
  )
  // Tapping a city picks it, or lets go of it; tapping the map lets go of all.
  const pickCity = useCallback(
    (key: string | null) =>
      setPicked((current) =>
        key === null
          ? NOTHING_PICKED
          : { ...current, city: current.city === key ? null : key },
      ),
    [],
  )
  const pickOffer = useCallback(
    (offer: Offer) =>
      setPicked((current) => ({
        ...current,
        offer: current.offer === offer.id ? null : offer.id,
      })),
    [],
  )
  const clearPicked = useCallback(() => setPicked(NOTHING_PICKED), [])
  // Tapping a line picks its route, or lets go of it.
  const pickRoute = useCallback(
    (key: string) =>
      setPicked((current) => ({
        ...current,
        offer: null,
        route: current.route === key ? null : key,
      })),
    [],
  )

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Movacar board', url })
      } catch {
        // The viewer closed the share sheet.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied')
    } catch {
      setToast("Couldn't copy the link; copy it from the address bar")
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold tracking-tight">Movacar board</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {data.kind === 'loading' && 'Loading…'}
              {file &&
                `Data from ${describeWhen(new Date(file.fetchedAt), now)} · ` +
                  (filtering
                    ? `${shown} of ${allOffers.length} offers`
                    : `${allOffers.length} offers`)}
              {data.kind === 'loaded' && !file && 'No data yet'}
            </p>
          </div>
          <AppMenu
            onColumns={() => setColumnsOpen(true)}
            wrap={wrap}
            onWrapChange={setWrap}
            mapSize={mapSize}
            onMapSizeChange={(size) => {
              setMapSize(size)
              // Turning the map off lets go of what was picked on it.
              if (size === 0) clearPicked()
            }}
            onShare={share}
            onClearFilters={clearFilters}
            canClearFilters={filtering}
            onExport={() =>
              exportCsv(
                table.getRowModel().rows.map((row) => row.original),
                file?.fetchedAt,
              )
            }
            canExport={shown > 0}
          />
        </div>
        <FilterChips
          columnFilters={columnFilters}
          onRemoveFilter={(id) =>
            setColumnFilters((filters) =>
              filters.filter((filter) => filter.id !== id),
            )
          }
          onClearAll={clearFilters}
        />
        {data.kind === 'loaded' && data.status && (
          <RefreshNotes status={data.status} now={now} />
        )}
      </header>

      {/* The table scrolls inside itself; messages scroll here. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {data.kind === 'error' && (
          <Message>
            <p role="alert">{data.message}</p>
          </Message>
        )}
        {data.kind === 'loaded' && !file && (
          <Message>
            <p>
              There are no offers yet. To fetch them, open{' '}
              <a className={link} href={REFRESH_URL}>
                Refresh data on GitHub
              </a>{' '}
              and press <strong>Run workflow</strong>.
            </p>
          </Message>
        )}
        {file && mapSize > 0 && (
          <section
            aria-label="Map"
            className="relative min-h-0 shrink-0 border-b border-zinc-200 dark:border-zinc-800"
            style={{ flexBasis: `${mapSize}%` }}
          >
            <MapPanel
              cities={map.cityList}
              routes={map.routes}
              picked={shownPick}
              onPickCity={pickCity}
              onPickRoute={pickRoute}
              onClear={clearPicked}
              dark={dark}
            />
          </section>
        )}
        {file && mapSize < 100 && (
          <div className="min-h-0 flex-1">
            <OffersTable
              table={table}
              wrap={wrap}
              emptyMessage={
                <>
                  No offers match.{' '}
                  <button type="button" className={link} onClick={clearFilters}>
                    Clear filters
                  </button>
                </>
              }
              mark={mark}
              markKey={`${pickedCity}|${pickedRoute}`}
              chosenId={pickedOffer}
              onRowClick={mapSize > 0 ? pickOffer : undefined}
            />
          </div>
        )}
      </main>

      <ColumnsDialog
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        table={table}
        onShowAll={columns.showAll}
        onReset={columns.reset}
      />

      {toast && (
        <p
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {toast}
        </p>
      )}
    </div>
  )
}
