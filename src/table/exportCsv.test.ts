import { describe, expect, it } from 'vitest'
import { toCsv } from '../lib/csv.ts'
import { makeOffer } from '../test/offers.ts'
import { offersToCsv } from './exportCsv.ts'

describe('toCsv', () => {
  it('quotes values with commas, quotes or line breaks', () => {
    expect(toCsv(['a', 'b'], [['Ford Transit, or similar', 'say "hi"']])).toBe(
      'a,b\r\n"Ford Transit, or similar","say ""hi"""',
    )
  })

  it('leaves blanks empty', () => {
    expect(toCsv(['a', 'b', 'c'], [[undefined, 0, '']])).toBe('a,b,c\r\n,0,')
  })
})

describe('offersToCsv', () => {
  it('has every column, shown or hidden, plus the link', () => {
    const [header, row] = offersToCsv([makeOffer('261802')]).split('\r\n')
    expect(header).toBe(
      'From,From country,To,To country,Vehicle,Category,Company,Seats,Sleeps,' +
        'Doors,Min. driver age,Min. licence (years),Earliest pick-up,' +
        'Latest pick-up,Return by,Days,Days incl.,Extra days,Free km,€/extra km,' +
        'Route km,Price,From address,To address,Link',
    )
    expect(row).toBe(
      'München,Germany,Málaga,Spain,ROAD HOUSE Westfalia Eliseo C540 - Fiat Ducato 8,' +
        'ROAD HOUSE,roadsurfer,4,4,5,18,1,2026-11-21,2026-11-27,2026-11-28,' +
        '6,5,1,2600,0.5,2332,129,München,Málaga,' +
        'https://movacar.com/en-US/checkout/261802?origin=1&destination=2',
    )
  })
})
