import { useEffect, useState, type ReactNode } from 'react'
import { AppMenu } from './components/AppMenu.tsx'
import { FilterChips } from './components/FilterChips.tsx'
import { RefreshNotes } from './components/RefreshNotes.tsx'
import { loadOffers, loadStatus } from './data/load.ts'
import type { Offer, OffersFile, RefreshStatus } from './data/types.ts'
import { useStoredState } from './lib/storage.ts'
import { describeWhen } from './lib/when.ts'
import { REFRESH_URL } from './links.ts'
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
      <main className="min-h-0 flex-1 overflow-y-auto">
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
        {file && (
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
          />
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
