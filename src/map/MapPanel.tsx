import { X } from 'lucide-react'
import { lazy, Suspense } from 'react'
import type { City, Route, Selection } from './routes.ts'

// The map library is big: it loads only once the map is turned on.
const RoutesMap = lazy(() => import('./RoutesMap.tsx'))

const dot = 'inline-block size-2 shrink-0 rounded-full'

/** What's picked, or how to pick something; also explains the colours. */
function MapNote({
  city,
  route,
  routeOffers,
  onClear,
}: {
  city: City | undefined
  route: Route | undefined
  /** For a tapped line: how many offers it has. */
  routeOffers?: number
  onClear: () => void
}) {
  const box =
    'rounded-md bg-white/90 px-2 py-1 text-xs shadow-sm ring-1 ring-zinc-900/10 dark:bg-zinc-900/90 dark:ring-white/10'
  if (!city && !route) {
    return (
      <p className={`${box} text-zinc-600 dark:text-zinc-400`}>
        Tap a city to light up its routes
      </p>
    )
  }
  return (
    <div
      className={`${box} pointer-events-auto flex items-start gap-2 text-zinc-800 dark:text-zinc-200`}
    >
      <div className="min-w-0 space-y-0.5">
        {city && (
          <p>
            <span className="font-semibold">{city.name}</span>{' '}
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span aria-hidden className={`${dot} bg-blue-600`} />
              {city.leaving} leaving
            </span>{' '}
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span aria-hidden className={`${dot} bg-orange-500`} />
              {city.arriving} arriving
            </span>
          </p>
        )}
        {route && (
          <p className="truncate">
            <span
              aria-hidden
              className={`${dot} mr-1 bg-zinc-900 dark:bg-white`}
            />
            {route.from.name} → {route.to.name}
            {routeOffers !== undefined &&
              ` · ${routeOffers} ${routeOffers === 1 ? 'offer' : 'offers'}`}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Clear the map selection"
        onClick={onClear}
        className="-m-0.5 rounded p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  )
}

/** The map, with a note on top saying what's picked. */
export function MapPanel({
  cities,
  routes,
  picked,
  onPickCity,
  onPickRoute,
  onClear,
  dark,
}: {
  cities: readonly City[]
  routes: readonly Route[]
  picked: Selection
  onPickCity: (key: string | null) => void
  onPickRoute: (key: string) => void
  onClear: () => void
  dark: boolean
}) {
  const city = cities.find((c) => c.key === picked.city)
  const route = picked.offer
    ? routes.find((r) => r.offers.some((o) => o.id === picked.offer))
    : picked.route
      ? routes.find((r) => r.key === picked.route)
      : undefined
  return (
    <div className="relative h-full">
      <Suspense
        fallback={
          <p className="grid h-full place-items-center text-sm text-zinc-500">
            Loading the map…
          </p>
        }
      >
        <RoutesMap
          cities={cities}
          routes={routes}
          picked={picked}
          onPickCity={onPickCity}
          onPickRoute={onPickRoute}
          dark={dark}
        />
      </Suspense>
      <div className="pointer-events-none absolute top-2 left-2 z-10 max-w-[calc(100%-3.5rem)]">
        <MapNote
          city={city}
          route={route}
          routeOffers={picked.offer ? undefined : route?.offers.length}
          onClear={onClear}
        />
      </div>
    </div>
  )
}
