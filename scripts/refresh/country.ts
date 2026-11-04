// Works out a station's country, because Movacar's API doesn't include one.
//
// This is the only place that knows how, so the method can be swapped later
// without touching anything else. Today it uses:
//   1. a manual override for the station, if there is one;
//   2. otherwise @rapideditor/country-coder, the offline country lookup used
//      by OpenStreetMap's Rapid editor.

import { iso1A2Code } from '@rapideditor/country-coder'
import { COUNTRY_OVERRIDES } from './country-overrides.ts'

export interface Located {
  /** The API's station id, used to find a manual override. */
  id?: string | null
  latitude: number | null
  longitude: number | null
}

/** The station's ISO 3166-1 alpha-2 code (e.g. "DE"), or null if unknown. */
export function countryOf(station: Located): string | null {
  const override = station.id ? COUNTRY_OVERRIDES[station.id] : undefined
  if (override) return override

  const { latitude, longitude } = station
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  return iso1A2Code([longitude, latitude]) ?? null
}
