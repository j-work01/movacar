// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { countryOf } from './country.ts'

vi.mock('./country-overrides.ts', () => ({
  COUNTRY_OVERRIDES: { '9999': 'NL' },
}))

// Real Movacar coordinates, including cities near a border.
const places: [string, number, number, string][] = [
  ['München', 48.18654, 11.5843, 'DE'],
  ['Krefeld (near the Dutch border)', 51.3331, 6.5623, 'DE'],
  ['Strasbourg (on the German border)', 48.5846, 7.7507, 'FR'],
  ['Zürich', 47.3744, 8.541, 'CH'],
  ['Malmö (across from Copenhagen)', 55.5189, 13.0134, 'SE'],
  ['Venezia', 45.542, 12.2898, 'IT'],
  ['Hounslow', 51.4686, -0.3613, 'GB'],
  ['Granadilla de Abona (Tenerife)', 28.0549, -16.5937, 'ES'],
  ['Málaga', 36.7264949, -4.5427975, 'ES'],
]

describe('countryOf', () => {
  it.each(places)(
    '%s is in the right country',
    (_, latitude, longitude, cc) => {
      expect(countryOf({ latitude, longitude })).toBe(cc)
    },
  )

  it('returns null without coordinates', () => {
    expect(countryOf({ latitude: null, longitude: 11.5 })).toBeNull()
  })

  it('returns null far out at sea', () => {
    // Mid-Atlantic. Near the coast, country-coder generously picks the
    // nearest country, which suits stations by the sea.
    expect(countryOf({ latitude: 30, longitude: -45 })).toBeNull()
  })

  it('lets a manual override win', () => {
    expect(
      countryOf({ id: '9999', latitude: 48.18654, longitude: 11.5843 }),
    ).toBe('NL')
  })
})
