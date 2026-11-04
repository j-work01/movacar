import { useEffect, useState, type ReactNode } from 'react'
import { AppMenu } from './components/AppMenu.tsx'
import { RefreshNotes } from './components/RefreshNotes.tsx'
import { loadOffers, loadStatus } from './data/load.ts'
import type { Offer, OffersFile, RefreshStatus } from './data/types.ts'
import { describeWhen } from './lib/when.ts'
import { REFRESH_URL } from './links.ts'
import { ColumnsDialog } from './table/ColumnsDialog.tsx'
import { exportCsv } from './table/exportCsv.ts'
import { OffersTable } from './table/OffersTable.tsx'
import { useOffersTable } from './table/useOffersTable.ts'

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
  const file = data.kind === 'loaded' ? data.file : null
  const offers = file?.offers ?? NO_OFFERS
  const { table, columns } = useOffersTable(offers)
  const [columnsOpen, setColumnsOpen] = useState(false)

  return (
    <div className="flex h-dvh flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold tracking-tight">Movacar board</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {data.kind === 'loading' && 'Loading…'}
              {file &&
                `Data from ${describeWhen(new Date(file.fetchedAt), now)} · ${offers.length} offers`}
              {data.kind === 'loaded' && !file && 'No data yet'}
            </p>
          </div>
          <AppMenu
            onColumns={() => setColumnsOpen(true)}
            onExport={() =>
              exportCsv(
                table.getRowModel().rows.map((row) => row.original),
                file?.fetchedAt,
              )
            }
            canExport={offers.length > 0}
          />
        </div>
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
        {file && <OffersTable table={table} />}
      </main>

      <ColumnsDialog
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        table={table}
        onShowAll={columns.showAll}
        onReset={columns.reset}
      />
    </div>
  )
}
