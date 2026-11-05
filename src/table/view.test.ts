import { describe, expect, it } from 'vitest'
import { DEFAULT_VIEW, viewFromUrl, viewToUrl, type ViewState } from './view.ts'

describe('the view in the web address', () => {
  it('is empty for the default view', () => {
    expect(viewToUrl(DEFAULT_VIEW)).toBe('')
    expect(viewFromUrl('')).toEqual(DEFAULT_VIEW)
  })

  it('holds sorting, search and filters, and reads them back', () => {
    const view: ViewState = {
      sorting: [{ id: 'price', desc: true }],
      search: 'camper',
      columnFilters: [
        { id: 'fromCountry', value: ['NL', 'BE'] },
        { id: 'sleeps', value: [2, undefined] },
        { id: 'price', value: [undefined, 1] },
        { id: 'startDate', value: ['2026-11-07', '2026-11-08'] },
        { id: 'vehicle', value: 'crafter' },
      ],
    }
    const query = viewToUrl(view)
    expect(query).toBe(
      '?q=camper&fromCountry=NL&fromCountry=BE&sleeps=2..&price=..1' +
        '&startDate=2026-11-07..2026-11-08&vehicle=crafter&sort=-price',
    )
    expect(viewFromUrl(query)).toEqual(view)
  })

  it('keeps names with accents', () => {
    const query = viewToUrl({
      ...DEFAULT_VIEW,
      columnFilters: [{ id: 'from', value: ['Málaga'] }],
    })
    expect(viewFromUrl(query).columnFilters).toEqual([
      { id: 'from', value: ['Málaga'] },
    ])
  })

  it('ignores what it does not know or cannot read', () => {
    expect(
      viewFromUrl(
        '?sort=nonsense&colour=red&price=cheap&sleeps=2..&utm_source=x',
      ),
    ).toEqual({
      ...DEFAULT_VIEW,
      columnFilters: [{ id: 'sleeps', value: [2, undefined] }],
    })
  })
})
