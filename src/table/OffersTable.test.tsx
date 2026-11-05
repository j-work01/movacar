import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Offer } from '../data/types.ts'
import { makeOffer, station } from '../test/offers.ts'
import { ColumnsDialog } from './ColumnsDialog.tsx'
import { OffersTable } from './OffersTable.tsx'
import { useOffersTable } from './useOffersTable.ts'
import { DEFAULT_VIEW } from './view.ts'

function Board({ offers, wrap = false }: { offers: Offer[]; wrap?: boolean }) {
  const { table, columns } = useOffersTable(offers, DEFAULT_VIEW)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Choose columns</button>
      <OffersTable table={table} wrap={wrap} emptyMessage="Nothing matches" />
      <ColumnsDialog
        open={open}
        onOpenChange={setOpen}
        table={table}
        onShowAll={columns.showAll}
        onReset={columns.reset}
      />
    </>
  )
}

// `hidden: true` because an open dialog hides the page behind it from
// screen readers, and these helpers still need to read the table.
/** The column headers as screen readers read them: "From country" for "C". */
const headers = () =>
  screen.getAllByRole('columnheader', { hidden: true }).map((th) => {
    const copy = th.cloneNode(true) as HTMLElement
    copy.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove())
    return copy.textContent ?? ''
  })

/** The text of one column, top to bottom. */
function column(label: string) {
  const index = headers().indexOf(label)
  if (index === -1) throw new Error(`no column "${label}" in ${headers()}`)
  return screen
    .getAllByRole('row', { hidden: true })
    .slice(1)
    .map(
      (row) =>
        within(row).getAllByRole('cell', { hidden: true })[index].textContent,
    )
}

const sortBy = (label: string) =>
  userEvent.click(screen.getByRole('button', { name: label }))

async function openFilter(label: string) {
  await userEvent.click(screen.getByRole('button', { name: `Filter ${label}` }))
  return screen.getByRole('dialog', { name: `Filter ${label}` })
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

// Kept outside the tests: the table needs a stable list.
const OFFERS = [
  makeOffer('a', {
    from: station('Murcia', 'ES'),
    sleeps: 2,
    freeKm: 2600,
    startDate: '2026-11-21T23:00:00Z',
  }),
  makeOffer('b', {
    from: station('Madrid', 'ES'),
    sleeps: null,
    freeKm: 450,
    startDate: '2026-11-04T11:46:25Z',
  }),
  makeOffer('c', {
    from: station('Málaga', 'ES'),
    sleeps: 0,
    freeKm: 1064,
    startDate: '2026-11-09T07:00:00Z',
  }),
  makeOffer('d', {
    from: station('Mannheim'),
    sleeps: 5,
    freeKm: null,
    startDate: '2026-11-06T05:00:00Z',
    make: 'VW',
    model: 'Crafter',
  }),
]

describe('OffersTable', () => {
  it('shows the default columns', () => {
    render(<Board offers={OFFERS} />)
    expect(headers()).toEqual([
      'From',
      'From country',
      'To',
      'To country',
      'Vehicle',
      'Company',
      'Earliest pick-up',
      'Return by',
      'Days',
      'Free km',
      'Route km',
      'Price',
      'Sleeps',
      'Link',
    ])
    expect(screen.getByRole('table').getAttribute('aria-rowcount')).toBe('5')
  })

  it('shows "C" for the countries, with the full name on hover', () => {
    render(<Board offers={OFFERS} />)
    const th = screen.getByRole('columnheader', { name: /^From country/ })
    expect(th.textContent).toMatch(/^C/)
    expect(th.title).toBe('From country')
    // Sorting by it still works under its full name.
    expect(screen.getByRole('button', { name: 'From country' })).toBeTruthy()
  })

  it('starts sorted by earliest pick-up', () => {
    render(<Board offers={OFFERS} />)
    expect(column('From')).toEqual(['Madrid', 'Mannheim', 'Málaga', 'Murcia'])
    expect(
      screen.getByRole('columnheader', { name: /^Earliest pick-up/ }),
    ).toHaveProperty('ariaSort', 'ascending')
  })

  it('sorts text alphabetically, accents included', async () => {
    render(<Board offers={OFFERS} />)
    await sortBy('From')
    expect(column('From')).toEqual(['Madrid', 'Málaga', 'Mannheim', 'Murcia'])
  })

  it('sorts numbers as numbers, and a second click reverses', async () => {
    render(<Board offers={OFFERS} />)
    await sortBy('Free km')
    expect(column('Free km')).toEqual(['450', '1,064', '2,600', '—'])
    await sortBy('Free km')
    expect(column('Free km')).toEqual(['2,600', '1,064', '450', '—'])
  })

  it('keeps blanks at the bottom in both directions, and 0 is not blank', async () => {
    render(<Board offers={OFFERS} />)
    await sortBy('Sleeps')
    expect(column('Sleeps')).toEqual(['0', '2', '5', '—'])
    await sortBy('Sleeps')
    expect(column('Sleeps')).toEqual(['5', '2', '0', '—'])
  })

  it('shows all days, with the extra ones in brackets', () => {
    render(<Board offers={OFFERS} />)
    // makeOffer: 5 days included, 1 extra day you can buy.
    expect(column('Days')).toEqual(['6 (5+1)', '6 (5+1)', '6 (5+1)', '6 (5+1)'])
  })

  it('links each offer to its own page on movacar.com', () => {
    render(<Board offers={OFFERS} />)
    const links = screen.getAllByRole('link', { name: 'Open on movacar.com' })
    expect(links[0].getAttribute('href')).toBe(
      'https://movacar.com/en-US/checkout/b?origin=1&destination=2',
    )
    expect(links[0].getAttribute('target')).toBe('_blank')
  })
})

describe('long text', () => {
  const vehicleCell = () =>
    screen.getAllByText('ROAD HOUSE Westfalia Eliseo C540 - Fiat Ducato 8')[0]

  it('stays on one line, cut off, with the full text on hover', () => {
    render(<Board offers={OFFERS} />)
    const box = vehicleCell()
    expect(box.className).toContain('truncate')
    expect(box.getAttribute('title')).toBe(
      'ROAD HOUSE Westfalia Eliseo C540 - Fiat Ducato 8',
    )
  })

  it('wraps over several lines when "Wrap text" is on', () => {
    render(<Board offers={OFFERS} wrap />)
    expect(vehicleCell().className).not.toContain('truncate')
  })
})

describe('choosing columns', () => {
  it('hides and shows columns, and this device remembers it', async () => {
    const { unmount } = render(<Board offers={OFFERS} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Choose columns' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Columns' })

    await userEvent.click(within(dialog).getByLabelText('Company'))
    await userEvent.click(within(dialog).getByLabelText('Category'))
    expect(headers()).not.toContain('Company')
    expect(headers()).toContain('Category')

    // Only the changes are stored, so new defaults still reach other columns.
    expect(
      JSON.parse(localStorage.getItem('movacar-board.columns.v2') ?? ''),
    ).toEqual({ company: false, category: true })

    // Open the board again: the choice is still there.
    unmount()
    render(<Board offers={OFFERS} />)
    expect(headers()).not.toContain('Company')
    expect(headers()).toContain('Category')
  })

  it('forgets the old way of storing columns, so the new defaults show', () => {
    localStorage.setItem(
      'movacar-board.columns',
      JSON.stringify({ category: true, company: false }),
    )
    render(<Board offers={OFFERS} />)
    expect(headers()).toContain('Company')
    expect(headers()).not.toContain('Category')
    expect(localStorage.getItem('movacar-board.columns')).toBeNull()
  })

  it('can show everything, and go back to the default', async () => {
    render(<Board offers={OFFERS} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Choose columns' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Columns' })

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Show all' }),
    )
    expect(headers()).toContain('From address')
    expect(headers()).toContain('Min. driver age')

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reset to default' }),
    )
    expect(headers()).not.toContain('From address')
    expect(headers()).toContain('Company')
  })
})

describe('filters', () => {
  it('keep the ticked values of a list, with counts', async () => {
    render(<Board offers={OFFERS} />)
    const filter = await openFilter('From country')
    expect(
      within(filter)
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual(['Germany (DE)1', 'Spain (ES)3'])

    await userEvent.click(within(filter).getByLabelText(/^Germany/))
    expect(column('From')).toEqual(['Mannheim'])
  })

  it('keep numbers within a minimum and maximum, without blanks', async () => {
    render(<Board offers={OFFERS} />)
    const filter = await openFilter('Sleeps')
    await userEvent.type(within(filter).getByLabelText('Minimum'), '2')
    expect(column('From')).toEqual(['Mannheim', 'Murcia'])
  })

  it('keep offers you can pick up on at least one of the chosen days', async () => {
    render(<Board offers={OFFERS} />)
    const filter = await openFilter('Earliest pick-up')
    // Every offer can be picked up until 27 Nov; they start on different days.
    fireEvent.change(within(filter).getByLabelText('From'), {
      target: { value: '2026-11-07' },
    })
    fireEvent.change(within(filter).getByLabelText('To'), {
      target: { value: '2026-11-08' },
    })
    expect(column('From')).toEqual(['Madrid', 'Mannheim'])
  })

  it('keep text containing all the words, ignoring case and accents', async () => {
    render(<Board offers={OFFERS} />)
    const filter = await openFilter('Vehicle')
    await userEvent.type(within(filter).getByRole('searchbox'), 'crafter vw')
    expect(column('From')).toEqual(['Mannheim'])
  })

  it('combine, and say so when nothing matches', async () => {
    render(<Board offers={OFFERS} />)
    const countries = await openFilter('From country')
    await userEvent.click(within(countries).getByLabelText(/^Spain/))
    expect(column('From')).toEqual(['Madrid', 'Málaga', 'Murcia'])

    await userEvent.keyboard('{Escape}')
    const vehicle = await openFilter('Vehicle')
    await userEvent.type(within(vehicle).getByRole('searchbox'), 'crafter')
    expect(screen.getByText('Nothing matches')).toBeTruthy()
  })
})
