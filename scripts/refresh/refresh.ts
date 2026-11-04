// One full refresh: the list of pick-up cities, then each city's offers, one
// request at a time with a pause in between. Returns the new data plus a
// status. When the refresh fails, the data that's online now stays.

import type { Offer, OffersFile, RefreshStatus } from '../../src/data/types.ts'
import {
  getJson,
  locationsUrl,
  offersUrl,
  sleep,
  type HttpOptions,
} from './movacar-api.ts'
import {
  ApiShapeError,
  locationsResponse,
  offersResponse,
  parseOrThrow,
} from './schema.ts'
import { offersFromResponse, type Origin } from './transform.ts'

/** An answer with this many offers may have been cut off by the API. */
export const RESULT_LIMIT = 100

export interface RefreshOptions {
  http?: HttpOptions
  /** Pause between two requests, to be polite. */
  paceMs?: number
  /** Share of pick-up cities that may fail before the refresh counts as failed. */
  maxFailedShare?: number
  now?: () => Date
  log?: (line: string) => void
  /** The data that's online now; it stays when this refresh fails. */
  previous?: OffersFile | null
}

export interface RefreshResult {
  status: RefreshStatus
  /** The new data to publish, or null when the refresh failed. */
  data: OffersFile | null
}

/** The error's message, plus its cause: Node's "fetch failed" alone says little. */
export function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause
  if (cause instanceof Error && cause.message) {
    return `${error.message} (${cause.message})`
  }
  return error.message
}

const byStartThenId = (a: Offer, b: Offer) =>
  (a.startDate ?? '').localeCompare(b.startDate ?? '') ||
  a.id.localeCompare(b.id)

export async function refresh(
  options: RefreshOptions = {},
): Promise<RefreshResult> {
  const {
    http = {},
    paceMs = 300,
    maxFailedShare = 0.1,
    now = () => new Date(),
    log = () => {},
    previous = null,
  } = options
  const pause = http.sleep ?? sleep
  const startedAt = now().toISOString()
  const warnings: string[] = []
  const failedCities: string[] = []
  let origins: Origin[] = []

  const result = (error: string | null, data: OffersFile | null) => {
    const published = data ?? previous
    const status: RefreshStatus = {
      startedAt,
      finishedAt: now().toISOString(),
      ok: error === null,
      error,
      warnings,
      cities: origins.length,
      failedCities,
      offers: published?.offers.length ?? 0,
      dataFetchedAt: published?.fetchedAt ?? null,
    }
    return { status, data }
  }

  try {
    log('Fetching the list of pick-up cities…')
    const locations = parseOrThrow(
      locationsResponse,
      await getJson(locationsUrl(), http),
      'list of locations',
    )
    origins = locations.included
      .map((location) => location.attributes)
      .filter((l) => l.location_type === 'origin' && l.offer_count > 0)
      .map((l) => ({ name: l.name, reference: l.reference }))
    if (origins.length === 0) {
      throw new ApiShapeError('The list of locations has no pick-up cities.')
    }

    const offers = new Map<string, Offer>()
    for (const [index, origin] of origins.entries()) {
      await pause(paceMs)
      const label = `[${index + 1}/${origins.length}] ${origin.name}`

      let json: unknown
      try {
        json = await getJson(offersUrl(origin.reference), http)
      } catch (error) {
        failedCities.push(origin.name)
        log(`${label}: failed (${errorText(error)})`)
        continue
      }

      // An answer in an unexpected shape stops the whole refresh.
      const response = parseOrThrow(
        offersResponse,
        json,
        `offers for ${origin.name}`,
      )
      if (response.data.length >= RESULT_LIMIT) {
        warnings.push(
          `${origin.name} returned ${response.data.length} offers, which may ` +
            'be a limit, so some of its offers could be missing.',
        )
      }
      for (const offer of offersFromResponse(response, origin)) {
        if (!offers.has(offer.id)) offers.set(offer.id, offer)
      }
      const count = response.data.length
      log(`${label}: ${count} offer${count === 1 ? '' : 's'}`)
    }

    const allowed = Math.floor(origins.length * maxFailedShare)
    if (failedCities.length > allowed) {
      throw new Error(
        `${failedCities.length} of ${origins.length} pick-up cities failed ` +
          `to load: ${failedCities.join(', ')}.`,
      )
    }
    if (failedCities.length > 0) {
      warnings.push(
        `${failedCities.length} of ${origins.length} pick-up cities couldn't ` +
          `be loaded: ${failedCities.join(', ')}.`,
      )
    }
    if (offers.size === 0)
      throw new ApiShapeError('There are no offers at all.')

    const sorted = [...offers.values()].sort(byStartThenId)
    return result(null, { fetchedAt: now().toISOString(), offers: sorted })
  } catch (error) {
    return result(errorText(error), null)
  }
}
