// The shape we expect from Movacar's API (JSON:API style), checked with zod.
//
// Every field the board uses must be present, with the right type or null.
// If Movacar changes the API, the refresh stops with a clear message instead
// of quietly publishing blanks. Fields that are only nice to have are allowed
// to go missing. Fields we don't use are ignored.

import { z } from 'zod'

/** The API answered in a shape we don't understand; retrying won't help. */
export class ApiShapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiShapeError'
  }
}

/** Checks `value` against `schema`, or throws an ApiShapeError saying what's wrong. */
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  value: unknown,
  what: string,
): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new ApiShapeError(
      `Unexpected ${what}:\n${z.prettifyError(result.error)}`,
    )
  }
  return result.data
}

const text = z.string().nullable()
const number = z.number().nullable()

// ---------------------------------------------------------------- locations

export const locationsResponse = z.object({
  included: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      attributes: z.object({
        name: z.string(),
        reference: z.string(),
        location_type: z.string(),
        offer_count: z.number(),
        latitude: number,
        longitude: number,
      }),
    }),
  ),
})

export type LocationsResponse = z.infer<typeof locationsResponse>

// ------------------------------------------------------------------- offers

/** A link to another object in `included`, e.g. { type: "station", id: "2487" }. */
const relationship = z.object({
  data: z.object({ type: z.string(), id: z.string() }).nullable(),
})

const offerAttributes = z.object({
  offer_id: text,
  make: text,
  model: text,
  vehicle_category_name: text,
  seats: number,
  sleeping: number,
  start_date: text,
  valid_until: text,
  /** Unix seconds, unlike the other dates. */
  latest_pickup: number,
  end_date: text,
  period: number,
  extra_period: number,
  free_km: number,
  cents_per_extra_km: number,
  distance: number,
  // Nice to have: these may go missing without stopping a refresh.
  brand_image_url: text.optional(),
  vehicle_image_url: text.optional(),
  doors: number.optional(),
  min_drivers_age: number.optional(),
  min_licence_age: number.optional(),
})

export const offersResponse = z.object({
  data: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      attributes: offerAttributes,
      relationships: z.object({
        origin: relationship,
        destination: relationship,
        base_price: relationship.optional(),
      }),
    }),
  ),
  // Stations and prices; each is checked when an offer uses it.
  included: z
    .array(
      z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.record(z.string(), z.unknown()),
      }),
    )
    .default([]),
})

export type OffersResponse = z.infer<typeof offersResponse>

export const stationAttributes = z.object({
  reference: text,
  city: text,
  latitude: number,
  longitude: number,
  alternative_city: text.optional(),
  street: text.optional(),
  postal_code: text.optional(),
})

export const amountAttributes = z.object({
  amount_minor_units: z.number(),
  currency: z.string(),
})
