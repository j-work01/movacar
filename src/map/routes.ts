// The offers as routes on a map: one line per pair of cities, with what
// lights up when a city or an offer is picked. Plain data and maths, so it
// can be tested without a map.

import type { Offer, Station } from '../data/types.ts'

/** A pick-up or drop-off city: all stations that share the API's reference. */
export interface City {
  key: string
  /** The name its stations use most, e.g. "Viladecans (near Barcelona)". */
  name: string
  lng: number
  lat: number
  /** Offers in the list that start here, and that end here. */
  leaving: number
  arriving: number
}

/** All offers in the list from one city to another. */
export interface Route {
  key: string
  from: City
  to: City
  offers: Offer[]
}

export const cityKey = (station: Station) =>
  station.reference ?? station.id ?? station.name

export const routeKey = (offer: Offer) =>
  `${cityKey(offer.from)}>${cityKey(offer.to)}`

const hasPlace = (station: Station) =>
  station.latitude !== null && station.longitude !== null

/**
 * Groups offers into cities and routes. Offers without coordinates are left
 * out, and so are routes within one city, which would be lines of no length.
 */
export function buildRoutes(offers: readonly Offer[]): {
  cities: Map<string, City>
  routes: Route[]
} {
  const places = new Map<
    string,
    { names: Map<string, number>; points: Map<string, [number, number]> }
  >()
  const cities = new Map<string, City>()
  const routes = new Map<string, Route>()

  const city = (station: Station) => {
    const key = cityKey(station)
    let place = places.get(key)
    if (!place) {
      place = { names: new Map(), points: new Map() }
      places.set(key, place)
      cities.set(key, {
        key,
        name: '',
        lng: 0,
        lat: 0,
        leaving: 0,
        arriving: 0,
      })
    }
    place.names.set(station.name, (place.names.get(station.name) ?? 0) + 1)
    const point: [number, number] = [station.longitude!, station.latitude!]
    place.points.set(station.id ?? point.join(), point)
    return cities.get(key)!
  }

  for (const offer of offers) {
    if (!hasPlace(offer.from) || !hasPlace(offer.to)) continue
    const from = city(offer.from)
    const to = city(offer.to)
    from.leaving++
    to.arriving++
    if (from === to) continue
    const key = `${from.key}>${to.key}`
    const route = routes.get(key)
    if (route) route.offers.push(offer)
    else routes.set(key, { key, from, to, offers: [offer] })
  }

  // Each city sits in the middle of its stations, named as most of them are.
  for (const [key, place] of places) {
    const c = cities.get(key)!
    const points = [...place.points.values()]
    c.lng = points.reduce((sum, p) => sum + p[0], 0) / points.length
    c.lat = points.reduce((sum, p) => sum + p[1], 0) / points.length
    c.name = [...place.names].sort((a, b) => b[1] - a[1])[0][0]
  }
  return { cities, routes: [...routes.values()] }
}

/** Web Mercator, the flat map: 0..1 across, with y growing southwards. */
export function toMercator(lng: number, lat: number): [number, number] {
  const sin = Math.sin((lat * Math.PI) / 180)
  return [
    (lng + 180) / 360,
    0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  ]
}

export function fromMercator(x: number, y: number): [number, number] {
  return [
    x * 360 - 180,
    (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI,
  ]
}

/**
 * A curved line from A to B, bending to the right as seen from A. So A → B
 * and B → A lie side by side instead of on top of each other. Worked out on
 * the flat map, so the curve keeps its shape at every zoom.
 */
export function curve(
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
  points = 32,
  bend = 0.2,
): [number, number][] {
  const [x1, y1] = toMercator(from.lng, from.lat)
  const [x2, y2] = toMercator(to.lng, to.lat)
  // The bend point: off the middle, to the right of the direction of travel.
  // (With y growing southwards, (−dy, dx) points to the right.)
  const cx = (x1 + x2) / 2 - (y2 - y1) * bend
  const cy = (y1 + y2) / 2 + (x2 - x1) * bend
  const line: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const t = i / points
    const a = (1 - t) * (1 - t)
    const b = 2 * (1 - t) * t
    const c = t * t
    line.push(fromMercator(a * x1 + b * cx + c * x2, a * y1 + b * cy + c * y2))
  }
  return line
}

/** What is picked: a city on the map, and/or an offer in the table. */
export interface Selection {
  city: string | null
  offer: string | null
}

export const NOTHING_PICKED: Selection = { city: null, offer: null }

/** How a route is drawn: as usual, lit up, or faded behind what's picked. */
export type Look = 'normal' | 'leaving' | 'arriving' | 'chosen' | 'faint'

/** Drawing order: what's lit up goes on top. */
export const LOOK_RANK: Record<Look, number> = {
  faint: 0,
  normal: 1,
  arriving: 2,
  leaving: 3,
  chosen: 4,
}

/** How a city's dot is drawn. */
export type CityLook = 'normal' | 'picked' | 'linked' | 'faint'

/**
 * How each route and city is drawn for what's picked. Worked out once for
 * all of them, as this runs on every tap.
 */
export function looksFor(
  routes: readonly Route[],
  picked: Selection,
): { route: (route: Route) => Look; city: (city: City) => CityLook } {
  // An offer within one city has no line, so it changes nothing here.
  const chosen = picked.offer
    ? routes.find((r) => r.offers.some((o) => o.id === picked.offer))
    : undefined
  const anything = Boolean(picked.city || chosen)
  const route = (r: Route): Look => {
    if (r === chosen) return 'chosen'
    if (picked.city) {
      if (r.from.key === picked.city) return 'leaving'
      if (r.to.key === picked.city) return 'arriving'
      return 'faint'
    }
    return anything ? 'faint' : 'normal'
  }
  const linked = new Set<string>()
  if (anything) {
    for (const r of routes) {
      if (route(r) !== 'faint') {
        linked.add(r.from.key)
        linked.add(r.to.key)
      }
    }
  }
  const city = (c: City): CityLook =>
    !anything
      ? 'normal'
      : c.key === picked.city
        ? 'picked'
        : linked.has(c.key)
          ? 'linked'
          : 'faint'
  return { route, city }
}

/** In the table: does this offer leave from, or arrive at, the picked city? */
export type RowMark = 'leaving' | 'arriving' | null

export function rowMark(offer: Offer, city: string | null): RowMark {
  if (!city) return null
  if (cityKey(offer.from) === city) return 'leaving'
  if (cityKey(offer.to) === city) return 'arriving'
  return null
}

/**
 * Puts the offers that leave from the picked city first, then those arriving
 * there, then the rest, each in the order they had.
 */
export function liftMarked<T>(
  items: readonly T[],
  markOf: (item: T) => RowMark,
): T[] {
  const leaving: T[] = []
  const arriving: T[] = []
  const rest: T[] = []
  for (const item of items) {
    const mark = markOf(item)
    if (mark === 'leaving') leaving.push(item)
    else if (mark === 'arriving') arriving.push(item)
    else rest.push(item)
  }
  return [...leaving, ...arriving, ...rest]
}

/**
 * The area where most offers start and end: without the few farthest ones
 * on each side (like Tenerife or the North Cape), which would otherwise
 * shrink everything else to a corner of the map. Each offer counts once at
 * each end. [[W, S], [E, N]], or null without routes.
 */
export function mainArea(
  routes: readonly Route[],
  share = 0.96,
): [[number, number], [number, number]] | null {
  const lngs: number[] = []
  const lats: number[] = []
  for (const route of routes) {
    for (const city of [route.from, route.to]) {
      for (let i = 0; i < route.offers.length; i++) {
        lngs.push(city.lng)
        lats.push(city.lat)
      }
    }
  }
  if (lngs.length === 0) return null
  const cut = (values: number[]) => {
    values.sort((a, b) => a - b)
    const skip = Math.floor((values.length * (1 - share)) / 2)
    return [values[skip], values[values.length - 1 - skip]]
  }
  const [w, e] = cut(lngs)
  const [s, n] = cut(lats)
  return [
    [w, s],
    [e, n],
  ]
}

/** The corners of the area that holds all these points: [[W, S], [E, N]]. */
export function boundsOf(
  points: readonly { lng: number; lat: number }[],
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const p of points) {
    w = Math.min(w, p.lng)
    e = Math.max(e, p.lng)
    s = Math.min(s, p.lat)
    n = Math.max(n, p.lat)
  }
  return [
    [w, s],
    [e, n],
  ]
}
