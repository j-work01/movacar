// Loads the data files that the refresh publishes next to the site.

import type { OffersFile, RefreshStatus } from './types.ts'

async function getJson<T>(name: string): Promise<T | null> {
  // "no-cache" asks the server whether the file changed, so a new refresh
  // shows up right away instead of after GitHub Pages' 10-minute cache.
  const response = await fetch(`./data/${name}`, { cache: 'no-cache' })
  if (response.status === 404) return null // no refresh has run yet
  if (!response.ok) {
    throw new Error(`Couldn't load ${name} (HTTP ${response.status}).`)
  }
  return (await response.json()) as T
}

export const loadStatus = () => getJson<RefreshStatus>('status.json')
export const loadOffers = () => getJson<OffersFile>('offers.json')
