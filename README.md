# Movacar board

A sortable, filterable overview of [Movacar](https://movacar.com) one-way transfer
offers: cars, vans and campers that need to be moved from A to B. It works on a
laptop and on a phone.

**Live site:** https://j-work01.github.io/movacar/

> Work in progress. See [docs/PLAN.md](docs/PLAN.md) for the plan and the decisions
> made so far.

## Refreshing the data

The data is only refreshed when someone asks for it. There is no timer, so Movacar's
API isn't called when nobody uses the board.

To refresh, open **[Actions → Refresh data](https://github.com/j-work01/movacar/actions/workflows/refresh.yml)**
on GitHub and press **Run workflow**. This also works in a phone's browser. You need
write access to this repository to do it. A refresh takes about 3–5 minutes; then the
site shows the new data with its date and time.

If a refresh fails (for example because Movacar changed its API), the previous data
stays online, the site says what went wrong, and GitHub emails whoever started it.
To refresh on your own computer, run `npm run refresh`, which writes to `public/data/`.

## How it works

```
GitHub Action "Refresh data"   (started by hand)
   │  calls Movacar's API politely, checks every answer
   ▼
data branch   offers.json + status.json   (the last good data is never lost)
   │
   ▼
GitHub Pages  the website, which loads one small data file
```

- **Website:** React + TypeScript, built with Vite, styled with Tailwind CSS.
- **Data refresh:** a TypeScript script run by GitHub Actions.
- **Checks:** every pull request is formatted, linted, tested and built before
  it can be merged. Every change on `main` goes live automatically.

## Development

You need Node.js 22 (see `.nvmrc`).

```bash
npm ci          # install exactly the versions in package-lock.json
npm run dev     # local site at http://localhost:5173
npm run check   # everything CI runs: format, lint, tests, build
```

| Folder              | What's in it                                        |
| ------------------- | --------------------------------------------------- |
| `src/`              | the website                                         |
| `.github/workflows` | CI checks, publishing, and (soon) the data refresh  |
| `docs/`             | the plan and notes about Movacar's API              |
| `legacy/`           | the original single-file board (V04), for reference |

## A note on the data

Movacar's API isn't documented or officially public. This project only calls it on
demand and paces its requests (one at a time, with a pause in between).
