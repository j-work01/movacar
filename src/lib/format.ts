// How values look in the table. Movacar means its dates in German/Dutch time,
// so they're shown in Europe/Berlin, whatever the viewer's own time zone.

export const MOVACAR_TIME_ZONE = 'Europe/Berlin'

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: MOVACAR_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

// en-CA writes dates as YYYY-MM-DD.
const isoDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: MOVACAR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "Sat 21 Nov" */
export const formatDay = (iso: string) => dayFormat.format(new Date(iso))

/** "2026-11-21", for the CSV file. */
export const isoDay = (iso: string) => isoDayFormat.format(new Date(iso))

const wholeNumber = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })

/** "2,600" */
export const formatWhole = (value: number) => wholeNumber.format(value)

/** "7", or "1.5" when it isn't whole. */
export const formatNumber = (value: number) => oneDecimal.format(value)

/** "€1", "€129", "€99.50"; `cents` always shows two decimals: "€0.50". */
export function formatMoney(
  amount: number,
  currency: string,
  style: 'auto' | 'cents' = 'auto',
): string {
  const decimals = style === 'cents' || !Number.isInteger(amount) ? 2 : 0
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  } catch {
    return `${amount.toFixed(decimals)} ${currency}` // unknown currency code
  }
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** "Germany" for "DE", from the browser's own list (no table of our own). */
export function countryName(code: string): string {
  try {
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

/**
 * The rental company, read from its logo's file name, because the API's name
 * field is always empty: ".../roadsurfer.png" → "roadsurfer",
 * ".../SixtLogo.png" → "Sixt".
 */
export function companyFromLogo(url: string | null): string | undefined {
  const file = url?.split('/').pop()?.split('?')[0]
  const name = file?.replace(/\.[a-z0-9]+$/i, '').replace(/[-_ ]?logo$/i, '')
  return name || undefined
}

/** "Ingolstädterstr. 172, 80939 München" */
export function stationAddress(station: {
  street: string | null
  postalCode: string | null
  city: string
}): string | undefined {
  const place = [station.postalCode, station.city].filter(Boolean).join(' ')
  return [station.street, place].filter(Boolean).join(', ') || undefined
}
