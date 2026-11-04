import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import type { RefreshStatus } from './data/types.ts'

const OK: RefreshStatus = {
  startedAt: '2026-11-04T20:20:00Z',
  finishedAt: '2026-11-04T20:23:00Z',
  ok: true,
  error: null,
  warnings: [],
  cities: 110,
  failedCities: [],
  offers: 813,
  dataFetchedAt: '2026-11-04T20:23:00Z',
}

/** Serves this status.json to the page, or a 404 when there's none yet. */
function serve(status: RefreshStatus | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      status ? Response.json(status) : new Response('', { status: 404 }),
    ),
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows the board title', () => {
    serve(OK)
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Movacar board',
    )
  })

  it('shows how old the data is and how many offers there are', async () => {
    serve(OK)
    render(<App />)
    expect(await screen.findByText(/^Data from .+ · 813 offers$/)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('says so when no refresh has run yet', async () => {
    serve(null)
    render(<App />)
    expect(await screen.findByText('No data yet.')).toBeTruthy()
  })

  it('shows why the last refresh failed, and that older data is shown', async () => {
    serve({
      ...OK,
      ok: false,
      error:
        'Unexpected offers for München:\n✖ Invalid input\n  → at data[1].attributes.start_date',
      offers: 790,
      dataFetchedAt: '2026-11-02T08:00:00Z',
    })
    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(
      /^The last refresh failed .+: Unexpected offers for München:/,
    )
    expect(alert.textContent).toContain('data[1].attributes.start_date')
    expect(alert.textContent).toContain('The data above is the last good one.')
    expect(screen.getByText(/^Data from .+ · 790 offers$/)).toBeTruthy()
  })

  it('shows warnings from the last refresh', async () => {
    serve({ ...OK, warnings: ["1 of 110 pick-up cities couldn't be loaded"] })
    render(<App />)
    expect(
      await screen.findByText("1 of 110 pick-up cities couldn't be loaded"),
    ).toBeTruthy()
  })
})
