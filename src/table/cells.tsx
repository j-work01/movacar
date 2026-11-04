import type { Station } from '../data/types.ts'
import { companyFromLogo, countryName, stationAddress } from '../lib/format.ts'

/** A city name; the address shows on hover. */
export function Place({ station }: { station: Station }) {
  return <span title={stationAddress(station)}>{station.name || '—'}</span>
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
      className="h-4 max-w-24 object-contain"
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
