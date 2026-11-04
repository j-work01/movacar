import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import type { OffersFile, RefreshStatus } from './data/types.ts'
import { makeOffer } from './test/offers.ts'

const OFFERS: OffersFile = {
  fetchedAt: '2026-11-04T20:23:00Z',
  offers: [makeOffer('1'), makeOffer('2'), makeOffer('3')],
}

const OK: RefreshStatus = {
  startedAt: '2026-11-04T20:20:00Z',
  finishedAt: '2026-11-04T20:23:00Z',
  ok: true,
  error: null,
  warnings: [],
  cities: 110,
  failedCities: [],
  offers: 3,
  dataFetchedAt: OFFERS.fetchedAt,
}

/** Serves these data files to the page; anything else is a 404. */
function serve(files: { status?: RefreshStatus; offers?: OffersFile }) {
  const byName: Record<string, unknown> = {
    'status.json': files.status,
    'offers.json': files.offers,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = byName[String(url).split('/').pop() ?? '']
      return body ? Response.json(body) : new Response('', { status: 404 })
    }),
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows how old the data is, and the offers', async () => {
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    expect(await screen.findByText(/^Data from .+ · 3 offers$/)).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(1 + 3)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('explains how to get data when there is none yet', async () => {
    serve({})
    render(<App />)
    expect(await screen.findByText(/There are no offers yet/)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Refresh data on GitHub' }),
    ).toHaveProperty(
      'href',
      'https://github.com/j-work01/movacar-board/actions/workflows/refresh.yml',
    )
  })

  it('says why the last refresh failed, and still shows the last good offers', async () => {
    serve({
      status: {
        ...OK,
        ok: false,
        error:
          'Unexpected offers for München:\n✖ Invalid input\n  → at data[1].attributes.start_date',
      },
      offers: OFFERS,
    })
    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(
      /^The last refresh failed .+: Unexpected offers for München:/,
    )
    expect(alert.textContent).toContain('data[1].attributes.start_date')
    expect(alert.textContent).toContain('from the last good refresh')
    expect(screen.getAllByRole('row')).toHaveLength(1 + 3)
  })

  it('shows warnings from the last refresh', async () => {
    serve({
      status: {
        ...OK,
        warnings: ["1 of 110 pick-up cities couldn't be loaded"],
      },
      offers: OFFERS,
    })
    render(<App />)
    expect(
      await screen.findByText("1 of 110 pick-up cities couldn't be loaded"),
    ).toBeTruthy()
  })

  it('opens the column chooser from the menu', async () => {
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await screen.findByText(/^Data from/)

    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Columns…',
      'Export CSV',
      'Refresh data (on GitHub)',
      'About this board',
    ])

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Columns…' }),
    )
    expect(await screen.findByRole('dialog', { name: 'Columns' })).toBeTruthy()
  })
})
