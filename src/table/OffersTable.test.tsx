import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Offer } from '../data/types.ts'
import { makeOffer, station } from '../test/offers.ts'
import { ColumnsDialog } from './ColumnsDialog.tsx'
import { OffersTable } from './OffersTable.tsx'
import { useOffersTable } from './useOffersTable.ts'

function Board({ offers }: { offers: Offer[] }) {
  const { table, columns } = useOffersTable(offers)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Choose columns</button>
      <OffersTable table={table} />
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
const headers = () =>
  screen
    .getAllByRole('columnheader', { hidden: true })
    .map((th) => th.textContent ?? '')

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
  }),
]

describe('OffersTable', () => {
  it('shows the default columns', () => {
    render(<Board offers={OFFERS} />)
    expect(headers()).toEqual([
      'From',
      'Country',
      'To',
      'Country',
      'Vehicle',
      'Category',
      'Seats',
      'Sleeps',
      'Earliest pick-up',
      'Latest pick-up',
      'Return by',
      'Days incl.',
      'Extra days',
      'Free km',
      '€/extra km',
      'Route km',
      'Price',
      'Link',
    ])
  })

  it('starts sorted by earliest pick-up', () => {
    render(<Board offers={OFFERS} />)
    expect(column('From')).toEqual(['Madrid', 'Mannheim', 'Málaga', 'Murcia'])
    expect(
      screen.getByRole('columnheader', { name: 'Earliest pick-up' }),
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

  it('links each offer to its own page on movacar.com', () => {
    render(<Board offers={OFFERS} />)
    const links = screen.getAllByRole('link', { name: 'Open on movacar.com' })
    expect(links[0].getAttribute('href')).toBe(
      'https://movacar.com/en-US/checkout/b?origin=1&destination=2',
    )
    expect(links[0].getAttribute('target')).toBe('_blank')
  })
})

describe('choosing columns', () => {
  it('hides and shows columns, and this device remembers it', async () => {
    const { unmount } = render(<Board offers={OFFERS} />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Choose columns' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Columns' })

    await userEvent.click(within(dialog).getByLabelText('Category'))
    await userEvent.click(within(dialog).getByLabelText('Company'))
    expect(headers()).not.toContain('Category')
    expect(headers()).toContain('Company')

    // Open the board again: the choice is still there.
    unmount()
    render(<Board offers={OFFERS} />)
    expect(headers()).not.toContain('Category')
    expect(headers()).toContain('Company')
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
    expect(headers()).toContain('Min. age')

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Reset to default' }),
    )
    expect(headers()).not.toContain('From address')
    expect(headers()).toContain('Category')
  })
})
