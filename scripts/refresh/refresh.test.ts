// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { OffersFile } from '../../src/data/types.ts'
import locationsFixture from './__fixtures__/locations.json' with { type: 'json' }
import offersFixture from './__fixtures__/offers-muenchen.json' with { type: 'json' }
import { locationsUrl, offersUrl } from './movacar-api.ts'
import {
  errorText,
  refresh,
  RESULT_LIMIT,
  type RefreshOptions,
} from './refresh.ts'

const MUENCHEN = '01JCR8QJ9K2K68BYKVSC0EE42Q'
const MARBURG = '01JCREA8S3YSVJ9A69X9XJDVR4'
const EMPTY = { data: [], included: [] }

type Answer = object | number | Error

/** A fake fetch: each URL gets its answers in turn (the last one repeats). */
function fakeApi(answers: Record<string, Answer[]>) {
  const calls: string[] = []
  const fetch = async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    const list = answers[url] ?? [404]
    const answer = list.length > 1 ? list.shift()! : list[0]
    if (answer instanceof Error) throw answer
    if (typeof answer === 'number') return new Response('', { status: answer })
    return Response.json(answer)
  }
  return { fetch: fetch as typeof globalThis.fetch, calls }
}

function run(api: ReturnType<typeof fakeApi>, options: RefreshOptions = {}) {
  const pauses: number[] = []
  const result = refresh({
    now: () => new Date('2026-11-04T21:24:00Z'),
    ...options,
    http: {
      fetch: api.fetch,
      sleep: async (ms) => void pauses.push(ms),
      retryDelaysMs: [10, 20],
    },
  })
  return { result, pauses }
}

const PREVIOUS: OffersFile = {
  fetchedAt: '2026-11-02T08:00:00Z',
  offers: [],
}

describe('refresh', () => {
  it('fetches every pick-up city, one at a time with a pause', async () => {
    const api = fakeApi({
      [locationsUrl()]: [locationsFixture],
      [offersUrl(MUENCHEN)]: [offersFixture],
      [offersUrl(MARBURG)]: [EMPTY],
    })
    const { result, pauses } = run(api)
    const { status, data } = await result

    expect(api.calls).toEqual([
      locationsUrl(),
      offersUrl(MUENCHEN),
      offersUrl(MARBURG),
    ])
    expect(pauses).toEqual([300, 300])
    expect(status).toEqual({
      startedAt: '2026-11-04T21:24:00.000Z',
      finishedAt: '2026-11-04T21:24:00.000Z',
      ok: true,
      error: null,
      warnings: [],
      cities: 2,
      failedCities: [],
      offers: 3,
      dataFetchedAt: '2026-11-04T21:24:00.000Z',
    })
    // Sorted by earliest pick-up.
    expect(data?.offers.map((offer) => offer.startDate)).toEqual([
      '2026-11-04T11:46:25Z',
      '2026-11-09T07:00:00Z',
      '2026-11-20T23:00:00Z',
    ])
  })

  it('retries a city that fails for a moment', async () => {
    const api = fakeApi({
      [locationsUrl()]: [locationsFixture],
      [offersUrl(MUENCHEN)]: [
        503,
        new TypeError('fetch failed'),
        offersFixture,
      ],
      [offersUrl(MARBURG)]: [EMPTY],
    })
    const { result, pauses } = run(api)
    const { status } = await result

    expect(status.ok).toBe(true)
    expect(status.offers).toBe(3)
    expect(pauses).toEqual([300, 10, 20, 300])
  })

  it('does not retry an answer that will not change, like 404', async () => {
    const api = fakeApi({
      [locationsUrl()]: [locationsFixture],
      [offersUrl(MUENCHEN)]: [offersFixture],
      [offersUrl(MARBURG)]: [404],
    })
    const { result } = run(api, { maxFailedShare: 0.5 })
    await result
    expect(api.calls.filter((url) => url === offersUrl(MARBURG))).toHaveLength(
      1,
    )
  })

  it('publishes with a warning when only a few cities fail', async () => {
    const api = fakeApi({
      [locationsUrl()]: [locationsFixture],
      [offersUrl(MUENCHEN)]: [offersFixture],
      [offersUrl(MARBURG)]: [500],
    })
    const { result } = run(api, { maxFailedShare: 0.5 })
    const { status, data } = await result

    expect(status.ok).toBe(true)
    expect(status.failedCities).toEqual(['Marburg'])
    expect(status.warnings).toEqual([
      "1 of 2 pick-up cities couldn't be loaded: Marburg.",
    ])
    expect(data?.offers).toHaveLength(3)
  })

  it('keeps the previous data when too many cities fail', async () => {
    const api = fakeApi({
      [locationsUrl()]: [locationsFixture],
      [offersUrl(MUENCHEN)]: [offersFixture],
      [offersUrl(MARBURG)]: [500],
    })
    const { result } = run(api, { previous: PREVIOUS })
    const { status, data } = await result

    expect(data).toBeNull()
    expect(status.ok).toBe(false)
    expect(status.error).toBe('1 of 2 pick-up cities failed to load: Marburg.')
    expect(status.dataFetchedAt).toBe(PREVIOUS.fetchedAt)
  })

  it('stops when the API answers in a shape it no longer understands', async () => {
    const api = fakeApi({
      [locationsUrl()]: [locationsFixture],
      [offersUrl(MUENCHEN)]: [{ offers: [] }],
    })
    const { result } = run(api, { previous: PREVIOUS })
    const { status, data } = await result

    expect(data).toBeNull()
    expect(status.ok).toBe(false)
    expect(status.error).toMatch(/^Unexpected offers for München/)
    expect(api.calls).toHaveLength(2) // it doesn't carry on with Marburg
  })

  it('fails when the list of cities cannot be fetched', async () => {
    const api = fakeApi({ [locationsUrl()]: [503] })
    const { result } = run(api, { previous: PREVIOUS })
    const { status } = await result

    expect(status.ok).toBe(false)
    expect(status.error).toMatch(/^HTTP 503 from https:\/\//)
    expect(status.cities).toBe(0)
    expect(api.calls).toHaveLength(3) // first try plus two retries
  })

  it(`warns when a city returns ${RESULT_LIMIT} offers, which may be a limit`, async () => {
    const many = structuredClone(offersFixture)
    many.data = Array.from({ length: RESULT_LIMIT }, (_, i) => ({
      ...offersFixture.data[i % offersFixture.data.length],
      id: `offer-${i}`,
    }))
    const api = fakeApi({
      [locationsUrl()]: [locationsFixture],
      [offersUrl(MUENCHEN)]: [many],
      [offersUrl(MARBURG)]: [EMPTY],
    })
    const { result } = run(api)
    const { status } = await result

    expect(status.ok).toBe(true)
    expect(status.offers).toBe(RESULT_LIMIT)
    expect(status.warnings).toEqual([
      'München returned 100 offers, which may be a limit, so some of its offers could be missing.',
    ])
  })
})

describe('errorText', () => {
  it('adds the cause, because "fetch failed" alone says little', () => {
    const error = new TypeError('fetch failed', {
      cause: new Error('getaddrinfo ENOTFOUND example.invalid'),
    })
    expect(errorText(error)).toBe(
      'fetch failed (getaddrinfo ENOTFOUND example.invalid)',
    )
    expect(errorText(new Error('HTTP 503'))).toBe('HTTP 503')
    expect(errorText('plain text')).toBe('plain text')
  })
})
