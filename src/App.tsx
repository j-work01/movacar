import { useEffect, useState } from 'react'
import { loadStatus } from './data/load.ts'
import type { RefreshStatus } from './data/types.ts'
import { describeWhen } from './lib/when.ts'

const REPO_URL = 'https://github.com/j-work01/movacar-board'
const REFRESH_URL = `${REPO_URL}/actions/workflows/refresh.yml`

type StatusState =
  | { kind: 'loading' }
  | { kind: 'loaded'; status: RefreshStatus | null }
  | { kind: 'error'; message: string }

/** The current time, updated every `ms` so "12 min ago" stays right. */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(timer)
  }, [ms])
  return now
}

function useStatus(): StatusState {
  const [state, setState] = useState<StatusState>({ kind: 'loading' })
  useEffect(() => {
    loadStatus().then(
      (status) => setState({ kind: 'loaded', status }),
      (error: unknown) => setState({ kind: 'error', message: String(error) }),
    )
  }, [])
  return state
}

const link =
  'underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100'

function DataStatus({ status, now }: { status: RefreshStatus; now: Date }) {
  const failed = !status.ok
  const [firstLine, ...details] = (status.error ?? '').split('\n')
  return (
    <div className="space-y-3">
      {status.dataFetchedAt ? (
        <p>
          Data from {describeWhen(new Date(status.dataFetchedAt), now)} ·{' '}
          {status.offers} offers
        </p>
      ) : (
        <p>No data yet.</p>
      )}

      {failed && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <p>
            The last refresh failed{' '}
            {describeWhen(new Date(status.finishedAt), now)}: {firstLine}
          </p>
          {details.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer">Details</summary>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                {details.join('\n')}
              </pre>
            </details>
          )}
          {status.dataFetchedAt && (
            <p className="mt-1 text-sm">The data above is the last good one.</p>
          )}
        </div>
      )}

      {status.warnings.map((warning) => (
        <p
          key={warning}
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {warning}
        </p>
      ))}
    </div>
  )
}

export default function App() {
  const state = useStatus()
  const now = useNow()

  return (
    <div className="flex min-h-dvh flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">
            Movacar board
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-10">
        {state.kind === 'loading' && <p>Loading…</p>}
        {state.kind === 'error' && <p role="alert">{state.message}</p>}
        {state.kind === 'loaded' &&
          (state.status ? (
            <DataStatus status={state.status} now={now} />
          ) : (
            <p>No data yet.</p>
          ))}

        <p className="max-w-prose text-zinc-600 dark:text-zinc-400">
          The table of offers is being built. To fetch fresh data, open{' '}
          <a className={link} href={REFRESH_URL}>
            Refresh data on GitHub
          </a>{' '}
          and press <strong>Run workflow</strong>.
        </p>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-zinc-500">
          Offers come from Movacar&rsquo;s API. Source code on{' '}
          <a className={link} href={REPO_URL}>
            GitHub
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
