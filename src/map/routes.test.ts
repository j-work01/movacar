import { describe, expect, it } from 'vitest'
import type { Station } from '../data/types.ts'
import { makeOffer, station } from '../test/offers.ts'
import {
  boundsOf,
  buildRoutes,
  curve,
  fromMercator,
  liftMarked,
  looksFor,
  mainArea,
  NOTHING_PICKED,
  rowMark,
  toMercator,
  type Selection,
} from './routes.ts'

/** A station somewhere, in a city that may have several stations. */
const at = (
  name: string,
  lng: number,
  lat: number,
  reference: string | null = name,
  id = `${name}-${lng}`,
): Station => ({
  ...station(name),
  id,
  reference,
  longitude: lng,
  latitude: lat,
})

const MUNICH = at('München', 11.58, 48.14)
const MUNICH_AIRPORT = at('München Flughafen', 11.78, 48.35, 'München')
const MALAGA = at('Málaga', -4.42, 36.72)
const LISBON = at('Lisbon', -9.14, 38.72)

describe('routes', () => {
  it('are one per pair of cities, whichever station', () => {
    const { cities, routes } = buildRoutes([
      makeOffer('1', { from: MUNICH, to: MALAGA }),
      makeOffer('2', { from: MUNICH_AIRPORT, to: MALAGA }),
      makeOffer('3', { from: MALAGA, to: MUNICH }),
      makeOffer('4', { from: MUNICH, to: LISBON }),
    ])
    expect(routes.map((r) => [r.key, r.offers.map((o) => o.id)])).toEqual([
      ['München>Málaga', ['1', '2']],
      ['Málaga>München', ['3']],
      ['München>Lisbon', ['4']],
    ])
    const munich = cities.get('München')!
    expect(munich).toMatchObject({ name: 'München', leaving: 3, arriving: 1 })
    // In the middle of its two stations.
    expect(munich.lng).toBeCloseTo(11.68)
    expect(munich.lat).toBeCloseTo(48.245)
  })

  it('leave out offers without coordinates, and trips within one city', () => {
    const { cities, routes } = buildRoutes([
      makeOffer('1', { from: station('Nowhere'), to: MALAGA }),
      makeOffer('2', { from: MUNICH, to: MUNICH_AIRPORT }),
    ])
    expect(routes).toEqual([])
    // The trip within München still counts for the city.
    expect(cities.get('München')).toMatchObject({ leaving: 1, arriving: 1 })
    expect(cities.has('Nowhere')).toBe(false)
  })

  it('fall back to the station when there is no reference', () => {
    const { routes } = buildRoutes([
      makeOffer('1', { from: at('A', 1, 50, null, 'a1'), to: MALAGA }),
    ])
    expect(routes[0].key).toBe('a1>Málaga')
  })
})

describe('curves', () => {
  it('survive the flat map and back', () => {
    const [x, y] = toMercator(11.58, 48.14)
    const [lng, lat] = fromMercator(x, y)
    expect(lng).toBeCloseTo(11.58)
    expect(lat).toBeCloseTo(48.14)
  })

  it('start at A, end at B, and bend to the right', () => {
    // West to east: "right" is south.
    const line = curve({ lng: 0, lat: 50 }, { lng: 10, lat: 50 }, 10)
    expect(line).toHaveLength(11)
    expect(line[0][0]).toBeCloseTo(0)
    expect(line[0][1]).toBeCloseTo(50)
    expect(line[10][0]).toBeCloseTo(10)
    expect(line[10][1]).toBeCloseTo(50)
    expect(line[5][1]).toBeLessThan(50)

    // The way back bends to its own right: north. So they don't overlap.
    const back = curve({ lng: 10, lat: 50 }, { lng: 0, lat: 50 }, 10)
    expect(back[5][1]).toBeGreaterThan(50)
  })
})

describe('what lights up', () => {
  const { cities, routes } = buildRoutes([
    makeOffer('1', { from: MUNICH, to: MALAGA }),
    makeOffer('2', { from: MALAGA, to: LISBON }),
    makeOffer('3', { from: LISBON, to: MUNICH }),
    makeOffer('4', { from: MUNICH, to: MUNICH_AIRPORT }),
  ])
  const [munichMalaga, malagaLisbon, lisbonMunich] = routes
  const city = (key: string) => cities.get(key)!
  const looks = (picked: Selection) => {
    const look = looksFor(routes, picked)
    return {
      routes: routes.map(look.route),
      cities: ['München', 'Málaga', 'Lisbon'].map((k) => look.city(city(k))),
    }
  }

  it('nothing, when nothing is picked', () => {
    expect(looks(NOTHING_PICKED)).toEqual({
      routes: ['normal', 'normal', 'normal'],
      cities: ['normal', 'normal', 'normal'],
    })
  })

  it("a picked city's routes, leaving and arriving; the rest fades", () => {
    expect(looks({ city: 'München', offer: null })).toEqual({
      routes: ['leaving', 'faint', 'arriving'],
      cities: ['picked', 'linked', 'linked'],
    })
    expect(routes).toEqual([munichMalaga, malagaLisbon, lisbonMunich])
  })

  it("a picked offer's route, on top of a picked city", () => {
    expect(looks({ city: 'München', offer: '2' }).routes).toEqual([
      'leaving',
      'chosen',
      'arriving',
    ])
    // Without a city, everything else fades.
    expect(looks({ city: null, offer: '2' })).toEqual({
      routes: ['faint', 'chosen', 'faint'],
      cities: ['faint', 'linked', 'linked'],
    })
  })

  it('nothing, for an offer within one city (it has no line)', () => {
    expect(looks({ city: null, offer: '4' }).routes).toEqual([
      'normal',
      'normal',
      'normal',
    ])
  })
})

describe('the table', () => {
  const offers = [
    makeOffer('1', { from: MALAGA, to: LISBON }),
    makeOffer('2', { from: LISBON, to: MUNICH }),
    makeOffer('3', { from: MUNICH_AIRPORT, to: MALAGA }),
    makeOffer('4', { from: MUNICH, to: LISBON }),
  ]

  it('marks the offers leaving from and arriving at the picked city', () => {
    expect(offers.map((o) => rowMark(o, 'München'))).toEqual([
      null,
      'arriving',
      'leaving',
      'leaving',
    ])
    expect(rowMark(offers[0], null)).toBeNull()
  })

  it("marks a tapped line's offers, and lists them first", () => {
    const marks = offers.map((o) => rowMark(o, 'München', 'München>Lisbon'))
    expect(marks).toEqual([null, 'arriving', 'leaving', 'route'])
    const lifted = liftMarked(offers, (o) =>
      rowMark(o, 'München', 'München>Lisbon'),
    )
    expect(lifted.map((o) => o.id)).toEqual(['4', '3', '2', '1'])
    const { routes } = buildRoutes(offers)
    const look = looksFor(routes, {
      city: null,
      offer: null,
      route: 'München>Lisbon',
    })
    expect(routes.map(look.route)).toEqual([
      'faint',
      'faint',
      'faint',
      'chosen',
    ])
  })

  it('lists them first: leaving, then arriving, then the rest', () => {
    const lifted = liftMarked(offers, (o) => rowMark(o, 'München'))
    expect(lifted.map((o) => o.id)).toEqual(['3', '4', '2', '1'])
  })
})

describe('the main area', () => {
  it('leaves out the few farthest offers', () => {
    const tenerife = at('Tenerife', -16.5, 28.1)
    const offers = [
      ...Array.from({ length: 30 }, (_, i) =>
        makeOffer(`m${i}`, { from: MUNICH, to: MALAGA }),
      ),
      makeOffer('t', { from: MUNICH, to: tenerife }),
    ]
    const [[w, s], [e, n]] = mainArea(buildRoutes(offers).routes)!
    expect([w, s, e, n]).toEqual([-4.42, 36.72, 11.58, 48.14])
  })

  it('keeps everything when there are only a few', () => {
    const tenerife = at('Tenerife', -16.5, 28.1)
    const area = mainArea(
      buildRoutes([makeOffer('t', { from: MUNICH, to: tenerife })]).routes,
    )
    expect(area).toEqual([
      [-16.5, 28.1],
      [11.58, 48.14],
    ])
    expect(mainArea([])).toBeNull()
  })
})

describe('bounds', () => {
  it('hold all points', () => {
    expect(
      boundsOf([
        { lng: 11, lat: 48 },
        { lng: -4, lat: 36 },
        { lng: 2, lat: 50 },
      ]),
    ).toEqual([
      [-4, 36],
      [11, 50],
    ])
    expect(boundsOf([])).toBeNull()
  })
})
