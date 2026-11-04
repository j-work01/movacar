import type { RefreshStatus } from '../data/types.ts'
import { describeWhen } from '../lib/when.ts'

/** Tells the viewer when the last refresh failed, or warned about something. */
export function RefreshNotes({
  status,
  now,
}: {
  status: RefreshStatus
  now: Date
}) {
  if (status.ok && status.warnings.length === 0) return null
  const [firstLine, ...details] = (status.error ?? '').split('\n')

  return (
    <div className="space-y-2 px-4 pb-3 text-sm">
      {!status.ok && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <p>
            The last refresh failed{' '}
            {describeWhen(new Date(status.finishedAt), now)}: {firstLine}
          </p>
          {details.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">Details</summary>
              <pre className="mt-1 overflow-x-auto text-xs whitespace-pre-wrap">
                {details.join('\n')}
              </pre>
            </details>
          )}
          {status.dataFetchedAt && (
            <p className="mt-1">
              The offers below are from the last good refresh.
            </p>
          )}
        </div>
      )}
      {status.warnings.map((warning) => (
        <p
          key={warning}
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {warning}
        </p>
      ))}
    </div>
  )
}
