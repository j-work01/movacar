// Turns the API's answers into the flat offers the website shows. The values
// stay as the API sends them; only the station's country is added.

import type { Offer, Price, Station } from '../../src/data/types.ts'
import { countryOf } from './country.ts'
import { cityPageUrl } from './movacar-api.ts'
import {
  amountAttributes,
  parseOrThrow,
  stationAttributes,
  type OffersResponse,
} from './schema.ts'

/** A pick-up city from the list of locations. */
export interface Origin {
  name: string
  reference: string
}

type Relationship = { data: { type: string; id: string } | null } | undefined

const NO_STATION: Station = {
  id: null,
  reference: null,
  city: '',
  name: '',
  street: null,
  postalCode: null,
  latitude: null,
  longitude: null,
  country: null,
}

/** The API's Unix seconds as an ISO timestamp, in the same style as its other dates. */
export function unixToIso(seconds: number | null): string | null {
  if (seconds === null) return null
  return new Date(seconds * 1000).toISOString().replace('.000Z', 'Z')
}

/** All offers in one pick-up city's answer. */
export function offersFromResponse(
  response: OffersResponse,
  origin: Origin,
): Offer[] {
  const included = new Map(
    response.included.map((item) => [
      `${item.type}:${item.id}`,
      item.attributes,
    ]),
  )
  const stations = new Map<string, Station>()

  const station = (relationship: Relationship): Station => {
    if (!relationship?.data) return NO_STATION
    const key = `${relationship.data.type}:${relationship.data.id}`
    const known = stations.get(key)
    if (known) return known
    const attributes = included.get(key)
    if (!attributes) return NO_STATION

    const a = parseOrThrow(stationAttributes, attributes, `station ${key}`)
    const id = relationship.data.id
    const city = a.city ?? ''
    const result: Station = {
      id,
      reference: a.reference,
      city,
      name: a.alternative_city || city,
      street: a.street ?? null,
      postalCode: a.postal_code ?? null,
      latitude: a.latitude,
      longitude: a.longitude,
      country: countryOf({ id, latitude: a.latitude, longitude: a.longitude }),
    }
    stations.set(key, result)
    return result
  }

  const price = (relationship: Relationship): Price | null => {
    if (!relationship?.data) return null
    const key = `${relationship.data.type}:${relationship.data.id}`
    const attributes = included.get(key)
    if (!attributes) return null
    const a = parseOrThrow(amountAttributes, attributes, `price ${key}`)
    return { amountMinor: a.amount_minor_units, currency: a.currency }
  }

  const url = cityPageUrl(origin.name, origin.reference)

  return response.data.map(({ id, attributes: a, relationships: r }) => ({
    id,
    offerId: a.offer_id,
    from: station(r.origin),
    to: station(r.destination),
    make: a.make,
    model: a.model,
    category: a.vehicle_category_name,
    brandLogoUrl: a.brand_image_url ?? null,
    vehicleImageUrl: a.vehicle_image_url ?? null,
    seats: a.seats,
    sleeps: a.sleeping,
    doors: a.doors ?? null,
    minDriverAge: a.min_drivers_age ?? null,
    minLicenceAge: a.min_licence_age ?? null,
    startDate: a.start_date,
    validUntil: a.valid_until,
    latestPickup: unixToIso(a.latest_pickup),
    endDate: a.end_date,
    periodHours: a.period,
    extraPeriodHours: a.extra_period,
    freeKm: a.free_km,
    centsPerExtraKm: a.cents_per_extra_km,
    distanceMeters: a.distance,
    price: price(r.base_price),
    url,
  }))
}
