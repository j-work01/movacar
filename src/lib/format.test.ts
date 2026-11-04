import { describe, expect, it } from 'vitest'
import {
  companyFromLogo,
  countryName,
  formatDay,
  formatMoney,
  formatNumber,
  formatWhole,
  isoDay,
  stationAddress,
} from './format.ts'

describe('dates', () => {
  it('are shown in German/Dutch time, as Movacar means them', () => {
    // 23:00 UTC is midnight in Berlin, so this is Saturday 21 November.
    expect(formatDay('2026-11-20T23:00:00Z')).toBe('Sat 21 Nov')
    expect(formatDay('2026-11-28T22:59:59Z')).toBe('Sat 28 Nov')
    expect(isoDay('2026-11-20T23:00:00Z')).toBe('2026-11-21')
  })
})

describe('numbers and money', () => {
  it('group thousands and keep at most one decimal', () => {
    expect(formatWhole(2600)).toBe('2,600')
    expect(formatNumber(7)).toBe('7')
    expect(formatNumber(1.5)).toBe('1.5')
  })

  it('show whole amounts without cents, and cents when asked', () => {
    expect(formatMoney(1, 'EUR')).toBe('€1')
    expect(formatMoney(129, 'EUR')).toBe('€129')
    expect(formatMoney(99.5, 'EUR')).toBe('€99.50')
    expect(formatMoney(0.5, 'EUR', 'cents')).toBe('€0.50')
  })

  it('cope with a currency code the browser does not know', () => {
    expect(formatMoney(5, 'XYZ1')).toBe('5 XYZ1')
  })
})

describe('names', () => {
  it('come from the browser for countries', () => {
    expect(countryName('DE')).toBe('Germany')
    expect(countryName('ES')).toBe('Spain')
  })

  it('are read from the logo file for companies', () => {
    const logo = (file: string) =>
      companyFromLogo(
        `https://storage.googleapis.com/movacar-prod-assets/${file}`,
      )
    expect(logo('roadsurfer.png')).toBe('roadsurfer')
    expect(logo('SixtLogo.png')).toBe('Sixt')
    expect(logo('IndieCampers.svg')).toBe('IndieCampers')
    expect(companyFromLogo(null)).toBeUndefined()
  })

  it('put a station address together from its parts', () => {
    expect(
      stationAddress({
        street: 'Ingolstädterstr. 172',
        postalCode: '80939',
        city: 'München',
      }),
    ).toBe('Ingolstädterstr. 172, 80939 München')
    expect(
      stationAddress({ street: null, postalCode: null, city: '' }),
    ).toBeUndefined()
  })
})
