// Builds offers for tests: realistic values that a test can override.

import type { Offer, Station } from '../data/types.ts'

export function station(name: string, country: string | null = 'DE'): Station {
  return {
    id: name,
    reference: null,
    city: name,
    name,
    street: null,
    postalCode: null,
    latitude: null,
    longitude: null,
    country,
  }
}

export function makeOffer(id: string, overrides: Partial<Offer> = {}): Offer {
  return {
    id,
    offerId: id,
    from: station('München'),
    to: station('Málaga', 'ES'),
    make: 'ROAD HOUSE',
    model: 'Westfalia Eliseo C540 - Fiat Ducato 8',
    category: 'ROAD HOUSE',
    brandLogoUrl:
      'https://storage.googleapis.com/movacar-prod-assets/roadsurfer.png',
    vehicleImageUrl: null,
    seats: 4,
    sleeps: 4,
    doors: 5,
    minDriverAge: 18,
    minLicenceMonths: 12,
    startDate: '2026-11-20T23:00:00Z',
    latestPickup: '2026-11-27T22:59:59Z',
    endDate: '2026-11-28T22:59:59Z',
    periodHours: 120,
    extraPeriodHours: 144,
    freeKm: 2600,
    centsPerExtraKm: 50,
    distanceMeters: 2331671,
    price: { amountMinor: 12900, currency: 'EUR' },
    url: `https://movacar.com/en-US/checkout/${id}?origin=1&destination=2`,
    ...overrides,
  }
}
