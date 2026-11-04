// @vitest-environment node
import { describe, expect, it } from 'vitest'
import locationsFixture from './__fixtures__/locations.json' with { type: 'json' }
import offersFixture from './__fixtures__/offers-muenchen.json' with { type: 'json' }
import {
  ApiShapeError,
  locationsResponse,
  offersResponse,
  parseOrThrow,
} from './schema.ts'

describe('response checks', () => {
  it('accept real answers from the API', () => {
    expect(() =>
      parseOrThrow(locationsResponse, locationsFixture, 'locations'),
    ).not.toThrow()
    expect(() =>
      parseOrThrow(offersResponse, offersFixture, 'offers'),
    ).not.toThrow()
  })

  it('stop with a clear message when a field the board needs is missing', () => {
    const changed = structuredClone(offersFixture) as {
      data: { attributes: Record<string, unknown> }[]
    }
    delete changed.data[1].attributes.start_date

    expect(() =>
      parseOrThrow(offersResponse, changed, 'offers for München'),
    ).toThrow(ApiShapeError)
    expect(() =>
      parseOrThrow(offersResponse, changed, 'offers for München'),
    ).toThrow(/offers for München[\s\S]*data\[1\]\.attributes\.start_date/)
  })

  it('stop when a field changes type', () => {
    const changed = structuredClone(offersFixture) as {
      data: { attributes: Record<string, unknown> }[]
    }
    changed.data[0].attributes.seats = 'five'
    expect(() => parseOrThrow(offersResponse, changed, 'offers')).toThrow(
      /seats/,
    )
  })

  it('carry on when a nice-to-have field is missing', () => {
    const changed = structuredClone(offersFixture) as {
      data: { attributes: Record<string, unknown> }[]
    }
    delete changed.data[0].attributes.doors
    delete changed.data[0].attributes.brand_image_url
    expect(() => parseOrThrow(offersResponse, changed, 'offers')).not.toThrow()
  })
})
