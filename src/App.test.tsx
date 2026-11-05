import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import type { OffersFile, RefreshStatus } from './data/types.ts'
import { makeOffer, station } from './test/offers.ts'

const OFFERS: OffersFile = {
  fetchedAt: '2026-11-04T20:23:00Z',
  offers: [
    makeOffer('1', { from: station('Madrid', 'ES') }),
    makeOffer('2', { from: station('Mannheim', 'DE') }),
    makeOffer('3', { from: station('München', 'DE') }),
  ],
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

const rows = () => screen.getAllByRole('row').length - 1
const dataLine = () => screen.findByText(/^Data from /)

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
  return screen.findByRole('menu')
}

beforeEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '/')
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows how old the data is, and the offers', async () => {
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    expect((await dataLine()).textContent).toMatch(/ · 3 offers$/)
    expect(rows()).toBe(3)
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
    expect(rows()).toBe(3)
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
})

describe('the menu', () => {
  it('has the actions, and opens the column chooser', async () => {
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()

    const menu = await openMenu()
    expect(
      [...menu.querySelectorAll('[role^="menuitem"]')].map(
        (item) => item.textContent,
      ),
    ).toEqual([
      'Columns…',
      'Wrap text',
      'Share this view',
      'Clear filters',
      'Export CSV',
      'Refresh data (on GitHub)',
      'About this board',
    ])

    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Columns…' }),
    )
    expect(await screen.findByRole('dialog', { name: 'Columns' })).toBeTruthy()
  })

  it('turns "Wrap text" on, and this device remembers it', async () => {
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()

    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitemcheckbox', { name: 'Wrap text' }),
    )
    expect(localStorage.getItem('movacar-board.wrap')).toBe('true')
  })

  it('copies a link to the current view', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    })
    history.replaceState(null, '', '/?fromCountry=DE')
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()

    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Share this view' }),
    )
    expect(writeText).toHaveBeenCalledWith(
      'http://localhost:3000/?fromCountry=DE',
    )
    expect(await screen.findByRole('status')).toHaveProperty(
      'textContent',
      'Link copied',
    )
  })
})

describe('search and filters', () => {
  it('search narrows the offers, and the web address follows', async () => {
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()

    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search' }),
      'madrid',
    )
    expect(rows()).toBe(1)
    expect((await dataLine()).textContent).toMatch(/ · 1 of 3 offers$/)
    expect(window.location.search).toBe('?q=madrid')
    expect(
      within(screen.getByRole('list', { name: 'Active filters' })).getByText(
        '“madrid”',
      ),
    ).toBeTruthy()
  })

  it('start from the web address, so bookmarks and shared links work', async () => {
    history.replaceState(null, '', '/?fromCountry=DE&sort=-from')
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    expect((await dataLine()).textContent).toMatch(/ · 2 of 3 offers$/)

    const cells = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent)
    expect(cells).toEqual(['München', 'Mannheim'])
    expect(screen.getByText('Germany (DE)')).toBeTruthy() // the chip
  })

  it('can all be cleared at once', async () => {
    history.replaceState(null, '', '/?fromCountry=DE&q=m')
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(rows()).toBe(3)
    expect(window.location.search).toBe('')
    expect(screen.queryByRole('list', { name: 'Active filters' })).toBeNull()
  })

  it('can be removed one by one', async () => {
    history.replaceState(null, '', '/?fromCountry=DE&q=mannheim')
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()
    expect(rows()).toBe(1)

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove filter: Search' }),
    )
    expect(rows()).toBe(2)
    expect(window.location.search).toBe('?fromCountry=DE')
  })
})
