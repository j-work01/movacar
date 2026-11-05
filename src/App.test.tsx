import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import type { OffersFile, RefreshStatus } from './data/types.ts'
import type { City, Route, Selection } from './map/routes.ts'
import { makeOffer, station } from './test/offers.ts'

// The real map needs WebGL, which tests don't have. This stand-in has a
// button per city, and shows what's picked.
vi.mock('./map/RoutesMap.tsx', () => ({
  default: ({
    cities,
    routes,
    picked,
    onPickCity,
    onPickRoute,
  }: {
    cities: City[]
    routes: Route[]
    picked: Selection
    onPickCity: (key: string | null) => void
    onPickRoute: (key: string) => void
  }) => (
    <div data-testid="map" data-picked-offer={picked.offer ?? ''}>
      {cities.map((city) => (
        <button
          key={city.key}
          type="button"
          onClick={() => onPickCity(city.key)}
        >
          {`Pick ${city.name}`}
        </button>
      ))}
      {routes.map((route) => (
        <button
          key={route.key}
          type="button"
          onClick={() => onPickRoute(route.key)}
        >
          {`Pick ${route.from.name} → ${route.to.name}`}
        </button>
      ))}
      <button type="button" onClick={() => onPickCity(null)}>
        Tap the map
      </button>
    </div>
  ),
}))

const OFFERS: OffersFile = {
  fetchedAt: '2026-11-04T20:23:00Z',
  offers: [
    makeOffer('1', { from: station('Madrid', 'ES') }),
    makeOffer('2', { from: station('Mannheim', 'DE') }),
    makeOffer('3', { from: station('München', 'DE') }),
  ],
}

/** Offers with places, so they show on the map. */
const placed = (name: string, country: string, lng: number, lat: number) => ({
  ...station(name, country),
  reference: name,
  longitude: lng,
  latitude: lat,
})
const MAP_OFFERS: OffersFile = {
  fetchedAt: '2026-11-04T20:23:00Z',
  offers: [
    makeOffer('1', {
      from: placed('Madrid', 'ES', -3.7, 40.4),
      to: placed('Lisbon', 'PT', -9.14, 38.72),
    }),
    makeOffer('2', {
      from: placed('München', 'DE', 11.58, 48.14),
      to: placed('Madrid', 'ES', -3.7, 40.4),
    }),
    makeOffer('3', {
      from: placed('Mannheim', 'DE', 8.47, 49.49),
      to: placed('München', 'DE', 11.58, 48.14),
    }),
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
    await dataLine()
    expect(screen.getByText('3 offers')).toBeTruthy()
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
      'https://github.com/j-work01/movacar/actions/workflows/refresh.yml',
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
      // The map's size: one row of buttons.
      'Off',
      '10',
      '25',
      '50',
      '75',
      '100',
      // Grouping nearby places, in km.
      'Off',
      '10',
      '25',
      '50',
      '75',
      '100',
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

describe('filters', () => {
  it('narrow the offers, and the web address follows', async () => {
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()
    // There's no search box: the filters sit on the column headers.
    expect(screen.queryByRole('searchbox')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Filter From' }))
    await userEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Filter From' }),
      ).getByLabelText(/^Madrid/),
    )
    expect(rows()).toBe(1)
    await dataLine()
    expect(screen.getByText('1 of 3 offers')).toBeTruthy()
    expect(window.location.search).toBe('?from=Madrid')
    expect(
      within(screen.getByRole('list', { name: 'Active filters' })).getByText(
        'Madrid',
      ),
    ).toBeTruthy()
  })

  it('start from the web address, so bookmarks and shared links work', async () => {
    history.replaceState(null, '', '/?fromCountry=DE&sort=-from')
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()
    expect(screen.getByText('2 of 3 offers')).toBeTruthy()
    // One line: the count and the filter chips share a row.
    expect(
      screen
        .getByText('2 of 3 offers')
        .parentElement?.contains(
          screen.getByRole('list', { name: 'Active filters' }),
        ),
    ).toBe(true)

    const cells = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent)
    expect(cells).toEqual(['München', 'Mannheim'])
    expect(screen.getByText('Germany (DE)')).toBeTruthy() // the chip
  })

  it('can all be cleared at once', async () => {
    history.replaceState(null, '', '/?fromCountry=DE&price=..200')
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(rows()).toBe(3)
    expect(window.location.search).toBe('')
    expect(screen.queryByRole('list', { name: 'Active filters' })).toBeNull()
  })

  it('can be removed one by one', async () => {
    history.replaceState(null, '', '/?fromCountry=DE&from=Mannheim')
    serve({ status: OK, offers: OFFERS })
    render(<App />)
    await dataLine()
    expect(rows()).toBe(1)

    await userEvent.click(
      screen.getByRole('button', { name: 'Remove filter: From' }),
    )
    expect(rows()).toBe(2)
    expect(window.location.search).toBe('?fromCountry=DE')
  })
})

describe('the map', () => {
  const tableRows = () => screen.getAllByRole('row').slice(1)
  const fromColumn = () =>
    tableRows().map((row) => within(row).getAllByRole('cell')[0].textContent)
  const marks = () => tableRows().map((row) => row.getAttribute('data-mark'))

  it('is off by default; ☰ → Map sets its size, remembered on this device', async () => {
    serve({ status: OK, offers: MAP_OFFERS })
    render(<App />)
    await dataLine()
    expect(screen.queryByRole('region', { name: 'Map' })).toBeNull()

    let menu = await openMenu()
    expect(
      within(menu).getByRole('menuitemradio', { name: 'Map off' }),
    ).toHaveProperty('ariaChecked', 'true')
    await userEvent.click(
      within(menu).getByRole('menuitemradio', {
        name: 'Map 50% of the screen',
      }),
    )
    expect(screen.getByRole('region', { name: 'Map' }).style.flexBasis).toBe(
      '50%',
    )
    expect(await screen.findByTestId('map')).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
    expect(localStorage.getItem('movacar-board.map')).toBe('50')

    // Grouping nearby places: 25 km unless changed.
    menu = await openMenu()
    expect(
      within(menu).getByRole('menuitemradio', {
        name: 'Group places within 25 km',
      }),
    ).toHaveProperty('ariaChecked', 'true')
    await userEvent.click(
      within(menu).getByRole('menuitemradio', {
        name: 'Group places within 50 km',
      }),
    )
    expect(localStorage.getItem('movacar-board.group')).toBe('50')

    // All of the screen: no table.
    menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitemradio', {
        name: 'Map 100% of the screen, no table',
      }),
    )
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('ignores a remembered size that makes no sense', async () => {
    localStorage.setItem('movacar-board.map', '"huge"')
    serve({ status: OK, offers: MAP_OFFERS })
    render(<App />)
    await dataLine()
    expect(screen.queryByRole('region', { name: 'Map' })).toBeNull()
  })

  it('lights up the offers of a tapped city in the table, leaving first', async () => {
    localStorage.setItem('movacar-board.map', '25')
    serve({ status: OK, offers: MAP_OFFERS })
    render(<App />)
    await dataLine()
    expect(fromColumn()).toEqual(['Madrid', 'München', 'Mannheim'])

    await userEvent.click(
      await screen.findByRole('button', { name: 'Pick München' }),
    )
    expect(fromColumn()).toEqual(['München', 'Mannheim', 'Madrid'])
    expect(marks()).toEqual(['leaving', 'arriving', null])
    const clear = screen.getByRole('button', {
      name: 'Clear the map selection',
    })
    expect(clear.parentElement?.textContent).toBe(
      'München 1 leaving 1 arriving',
    )

    // Tapping the map itself lets go.
    await userEvent.click(screen.getByRole('button', { name: 'Tap the map' }))
    expect(marks()).toEqual([null, null, null])
    expect(fromColumn()).toEqual(['Madrid', 'München', 'Mannheim'])
  })

  it('lights up the offers of a tapped line in the table, first', async () => {
    localStorage.setItem('movacar-board.map', '25')
    serve({ status: OK, offers: MAP_OFFERS })
    render(<App />)
    await dataLine()
    const line = await screen.findByRole('button', {
      name: 'Pick München → Madrid',
    })
    await userEvent.click(line)
    expect(fromColumn()).toEqual(['München', 'Madrid', 'Mannheim'])
    expect(marks()).toEqual(['route', null, null])
    expect(screen.getByText(/^München → Madrid/).textContent).toBe(
      'München → Madrid · 1 offer',
    )
    // Tap it again to let go.
    await userEvent.click(line)
    expect(marks()).toEqual([null, null, null])
  })

  it('lights up the route of a tapped row on the map', async () => {
    localStorage.setItem('movacar-board.map', '25')
    serve({ status: OK, offers: MAP_OFFERS })
    render(<App />)
    await dataLine()
    const map = await screen.findByTestId('map')

    const row = tableRows()[0]
    await userEvent.click(within(row).getAllByRole('cell')[0])
    expect(row.getAttribute('data-chosen')).toBe('true')
    expect(map.getAttribute('data-picked-offer')).toBe('1')
    expect(screen.getByText('Madrid → Lisbon')).toBeTruthy()

    // Tap it again to let go.
    await userEvent.click(within(row).getAllByRole('cell')[0])
    expect(row.getAttribute('data-chosen')).toBeNull()
    expect(map.getAttribute('data-picked-offer')).toBe('')
  })

  it("doesn't pick rows while the map is off", async () => {
    serve({ status: OK, offers: MAP_OFFERS })
    render(<App />)
    await dataLine()
    const row = tableRows()[0]
    await userEvent.click(within(row).getAllByRole('cell')[0])
    expect(row.getAttribute('data-chosen')).toBeNull()
  })
})
