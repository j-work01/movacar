// @vitest-environment node
import { describe, expect, it } from 'vitest'
import offersFixture from './__fixtures__/offers-muenchen.json' with { type: 'json' }
import { offersResponse } from './schema.ts'
import { offersFromResponse, unixToIso } from './transform.ts'

const MUENCHEN = { name: 'München', reference: '01JCR8QJ9K2K68BYKVSC0EE42Q' }
const offers = offersFromResponse(offersResponse.parse(offersFixture), MUENCHEN)

describe('offersFromResponse', () => {
  it('returns one flat offer per offer in the answer', () => {
    expect(offers.map((offer) => offer.id)).toEqual([
      '262262_202011_3695',
      '261387_4003_18477',
      '261802_4003_7256',
    ])
  })

  it('keeps the values as the API sends them, plus the countries', () => {
    expect(offers.find((offer) => offer.offerId === '261802')).toEqual({
      id: '261802_4003_7256',
      offerId: '261802',
      from: {
        id: '2308',
        reference: '01JCR8QJ9K2K68BYKVSC0EE42Q',
        city: 'München',
        name: 'München',
        street: 'Ingolstädterstr. 172',
        postalCode: '80939',
        latitude: 48.204,
        longitude: 11.586,
        country: 'DE',
      },
      to: {
        id: '3003',
        reference: '01JCRNKBZBYCV24BQA6Z7F09Y3',
        city: 'Málaga',
        name: 'Málaga',
        street: 'C. José Calderón, 120',
        postalCode: '29590',
        latitude: 36.7264949,
        longitude: -4.5427975,
        country: 'ES',
      },
      make: 'ROAD HOUSE',
      model: 'Westfalia Eliseo C540 - Fiat Ducato 8',
      category: 'ROAD HOUSE',
      brandLogoUrl:
        'https://storage.googleapis.com/movacar-prod-assets/roadsurfer.png',
      vehicleImageUrl:
        'https://storage.googleapis.com/movacar-prod-assets/phpMFALOL.jpeg',
      seats: 4,
      sleeps: 4,
      doors: 5,
      minDriverAge: 18,
      minLicenceMonths: 12,
      startDate: '2026-11-20T23:00:00Z',
      latestPickup: '2026-11-27T22:59:59Z',
      endDate: '2026-11-28T22:59:59Z',
      periodHours: 168,
      extraPeriodHours: 168,
      freeKm: 2600,
      centsPerExtraKm: 50,
      distanceMeters: 2331671,
      price: { amountMinor: 12900, currency: 'EUR' },
      // The same link as "Select offer" on movacar.com.
      url: 'https://movacar.com/en-US/checkout/261802?origin=2308&destination=3003',
    })
  })

  it('keeps zero beds as 0, not blank', () => {
    const van = offers.find((offer) => offer.category === 'Mystery Van')
    expect(van?.sleeps).toBe(0)
  })

  it('uses a station that is missing from the answer as empty, without failing', () => {
    const broken = structuredClone(offersFixture)
    broken.included = broken.included.filter((item) => item.id !== '3003')
    const [, , camper] = offersFromResponse(
      offersResponse.parse(broken),
      MUENCHEN,
    )
    expect(camper.to.name).toBe('')
    expect(camper.to.country).toBeNull()
    // Without the station's id there's no offer page, so link to the city's list.
    expect(camper.url).toBe(
      'https://movacar.com/en-US/offers?origin=M%C3%BCnchen&oid=01JCR8QJ9K2K68BYKVSC0EE42Q',
    )
  })
})

describe('unixToIso', () => {
  it('writes Unix seconds like the API writes its other dates', () => {
    expect(unixToIso(1793970000)).toBe('2026-11-06T13:00:00Z')
    expect(unixToIso(null)).toBeNull()
  })
})
