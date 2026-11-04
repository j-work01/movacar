// The data files that the refresh script writes and the website reads.
//
// Values stay as close to Movacar's API as possible: the API's own text and
// units (hours, cents, metres). The website does the formatting. The only
// value that isn't in the API is a station's country. See docs/api.md.

export interface Station {
  /** The API's id for this station, e.g. "2487"; unique per station. */
  id: string | null
  /** The pick-up/drop-off location's reference. Shared by all stations of a city. */
  reference: string | null
  /** `city`, e.g. "Viladecans". */
  city: string
  /** `alternative_city` when set (e.g. "Viladecans (near Barcelona)"), else `city`. */
  name: string
  street: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  /** ISO 3166-1 alpha-2 code, worked out from the coordinates. */
  country: string | null
}

export interface Price {
  /** In minor units: 100 means 1.00. */
  amountMinor: number
  currency: string
}

export interface Offer {
  /** The API's id for this offer; unique. */
  id: string
  /** `offer_id`, Movacar's offer number. */
  offerId: string | null
  from: Station
  to: Station
  make: string | null
  model: string | null
  /** `vehicle_category_name`, e.g. "Transporter" or "ROAD HOUSE". */
  category: string | null
  /** The rental company's logo; the API's name field is always empty. */
  brandLogoUrl: string | null
  vehicleImageUrl: string | null
  seats: number | null
  /** `sleeping`: 0 for vehicles without beds. */
  sleeps: number | null
  doors: number | null
  minDriverAge: number | null
  /** `min_licence_age`: how long you must have had a licence, in months. */
  minLicenceMonths: number | null
  /** Timestamps in UTC (ISO 8601), exactly as the API sends them. */
  startDate: string | null
  /** The API sends this one as Unix seconds; stored as ISO 8601 like the others. */
  latestPickup: string | null
  endDate: string | null
  /** `period`: included rental time, in hours. */
  periodHours: number | null
  /** `extra_period`: included plus extra time you can buy, in hours. */
  extraPeriodHours: number | null
  freeKm: number | null
  centsPerExtraKm: number | null
  /** `distance`: route length in metres. */
  distanceMeters: number | null
  price: Price | null
  /** The offer's own page on movacar.com, where it can be booked. */
  url: string
}

export interface OffersFile {
  /** When this data was fetched (ISO 8601). */
  fetchedAt: string
  offers: Offer[]
}

export interface RefreshStatus {
  startedAt: string
  finishedAt: string
  /** True when this refresh published new data. */
  ok: boolean
  /** Why the refresh failed, when `ok` is false. */
  error: string | null
  /** Things worth knowing that didn't stop the refresh. */
  warnings: string[]
  /** Pick-up cities requested. */
  cities: number
  /** Pick-up cities that still failed after retrying. */
  failedCities: string[]
  /** Number of offers in the published data. */
  offers: number
  /** When the published data was fetched (may be older than this refresh). */
  dataFetchedAt: string | null
}
