// Runs a refresh and writes offers.json and status.json.
//
//   npm run refresh                     writes to public/data (for local use)
//   npm run refresh -- --out <folder>   writes somewhere else
//
// offers.json is only replaced when the refresh succeeds. status.json is
// always written, so the website can show what happened. The exit code is 1
// when the refresh failed.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import type { OffersFile } from '../../src/data/types.ts'
import { refresh } from './refresh.ts'

const { values } = parseArgs({
  options: { out: { type: 'string', default: 'public/data' } },
})
const folder = values.out
const offersPath = join(folder, 'offers.json')
const statusPath = join(folder, 'status.json')

async function readPrevious(): Promise<OffersFile | null> {
  try {
    return JSON.parse(await readFile(offersPath, 'utf8')) as OffersFile
  } catch {
    return null // no data yet, or unreadable: nothing to keep
  }
}

const { status, data } = await refresh({
  previous: await readPrevious(),
  log: (line) => console.log(line),
})

await mkdir(folder, { recursive: true })
if (data) await writeFile(offersPath, JSON.stringify(data, null, 2) + '\n')
await writeFile(statusPath, JSON.stringify(status, null, 2) + '\n')

// "::warning::" and "::error::" lines show up as notes on the GitHub Actions run.
for (const warning of status.warnings) console.log(`::warning::${warning}`)
if (status.ok) {
  console.log(
    `Done: ${status.offers} offers from ${status.cities} pick-up cities.`,
  )
} else {
  console.error(status.error)
  console.log(
    `::error::Refresh failed; the previous data stays online. ` +
      (status.error ?? '').split('\n')[0],
  )
  process.exitCode = 1
}
