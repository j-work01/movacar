// Talks to Movacar's API. It isn't documented, so we're polite: the caller
// asks for one thing at a time, and failures are retried a few times with
// growing pauses.

export const API_BASE =
  'https://crowd-api-production-615013621295.europe-west1.run.app/v1'

export const locationsUrl = () => `${API_BASE}/locations/offers?locale=en`

export const offersUrl = (originReference: string) =>
  `${API_BASE}/offers?locale=en&origin=${encodeURIComponent(originReference)}`

/** The pick-up city's page on movacar.com, which lists its offers. */
export const cityPageUrl = (name: string, reference: string) =>
  `https://movacar.com/en-US/offers?origin=${encodeURIComponent(name)}` +
  `&oid=${encodeURIComponent(reference)}`

/** One offer's page on movacar.com, where it can be booked ("Select offer"). */
export const offerPageUrl = (
  offerId: string,
  originStationId: string,
  destinationStationId: string,
) =>
  `https://movacar.com/en-US/checkout/${encodeURIComponent(offerId)}` +
  `?origin=${encodeURIComponent(originStationId)}` +
  `&destination=${encodeURIComponent(destinationStationId)}`

export class HttpError extends Error {
  readonly status: number
  constructor(status: number, url: string) {
    super(`HTTP ${status} from ${url}`)
    this.name = 'HttpError'
    this.status = status
  }
}

export interface HttpOptions {
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  /** Pauses before each retry; their count is the number of retries. */
  retryDelaysMs?: number[]
  timeoutMs?: number
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * GETs a URL and returns its parsed JSON. Network errors, timeouts, 429 and
 * 5xx answers are retried; other answers (like 404) fail straight away.
 */
export async function getJson(
  url: string,
  options: HttpOptions = {},
): Promise<unknown> {
  const {
    fetch: fetchFn = fetch,
    sleep: pause = sleep,
    retryDelaysMs = [2_000, 6_000],
    timeoutMs = 30_000,
  } = options

  let lastError: unknown
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await pause(retryDelaysMs[attempt - 1])

    let response: Response
    try {
      response = await fetchFn(url, {
        headers: {
          Accept: 'application/vnd.api+json',
          'User-Agent':
            'movacar-board (+https://github.com/j-work01/movacar-board)',
        },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      lastError = error // network error or timeout: try again
      continue
    }

    if (response.ok) return response.json()
    lastError = new HttpError(response.status, url)
    if (response.status !== 429 && response.status < 500) break
  }
  throw lastError
}
