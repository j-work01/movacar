import type { Station } from '../data/types.ts'
import { companyFromLogo, countryName, formatNumber } from '../lib/format.ts'

/** A city name. (The table shows the full name and address on hover.) */
export function Place({ station }: { station: Station }) {
  return <>{station.name || '—'}</>
}

/**
 * "20 (15+5)": the total in a slot of its own, right-aligned so totals line
 * up from row to row, and the sum next to it in grey.
 */
export function DaysCell({
  total,
  included,
  extra,
}: {
  total: number | undefined
  included: number | undefined
  extra: number | undefined
}) {
  if (total === undefined || included === undefined) return <>—</>
  return (
    <span className="inline-grid grid-cols-[3ch_auto] tabular-nums">
      <span className="text-right">{formatNumber(total)}</span>
      {extra ? (
        // The space is real text (kept by whitespace-pre), so copying the
        // cell or reading it aloud gives "20 (15+5)".
        <span className="whitespace-pre text-zinc-500 dark:text-zinc-400">
          {` (${formatNumber(included)}+${formatNumber(extra)})`}
        </span>
      ) : null}
    </span>
  )
}

/** "DE", with "Germany" on hover. */
export function Country({ code }: { code: string | null }) {
  if (!code) return <>—</>
  return (
    <span
      title={countryName(code)}
      className="inline-block min-w-8 rounded bg-zinc-100 px-1.5 py-0.5 text-center text-xs font-semibold tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
    >
      {code}
    </span>
  )
}

export function CompanyLogo({ url }: { url: string | null }) {
  if (!url) return <>—</>
  const name = companyFromLogo(url)
  return (
    <img
      src={url}
      alt={name ?? ''}
      title={name}
      // Logos are made for white backgrounds, so dark mode puts one behind them.
      className="h-4 max-w-24 object-contain dark:rounded-sm dark:bg-white dark:px-0.5"
      loading="lazy"
    />
  )
}

/** The offer's own page on movacar.com, where it can be booked. */
export function OfferLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Open on movacar.com"
      className="text-blue-700 underline-offset-2 hover:underline dark:text-blue-400"
    >
      Open&nbsp;↗
    </a>
  )
}
