# Plan and decisions

The board rebuilds the single-file `legacy/movacar-board_V04.html` as a maintained
project. **The guiding rule: stay close to the API.** We show what Movacar's API
sends, formatted for reading. We drop anything that only existed because V04
calculated or guessed it. The one exception is country (see below).

## Data

### Where it comes from

- `GET /v1/locations/offers` lists every pick-up and drop-off city
  (110 pick-up cities, about 810 offers on 4 Nov 2026).
- `GET /v1/offers?origin=<reference>` returns all offers for one pick-up city.
- Searching by date (`pickupDateFrom` + `pickupDateTo`) stops at 100 offers, and
  there's no known way to page through. So a full refresh is 1 + 110 requests,
  about 2–3 minutes at a polite pace.

### Refreshing

- **Manual only.** Run on GitHub via **Actions → Refresh data → Run workflow**.
  You need write access to the repository. There is no timer.
- Every refresh saves `offers.json` and `status.json` (time, counts, errors) on the
  `data` branch, then republishes the site.
- If a refresh fails, the last good data stays online and the error is recorded,
  so the site can show it. GitHub also emails whoever started the refresh.
- Two refreshes can never run at the same time.

### Columns

All columns come straight from the API, apart from the two country columns.

| Column               | API field                                     | Shown by default |
| -------------------- | --------------------------------------------- | ---------------- |
| From, To             | station `city` / `alternative_city`           | yes              |
| From/To country      | calculated from station coordinates           | yes              |
| Vehicle              | `make` + `model`                              | yes              |
| Company              | `brand_image_url` (logo only)                 | yes              |
| Sleeps               | `sleeping`                                    | yes              |
| Earliest pick-up     | `start_date`                                  | yes              |
| Return by            | `end_date`                                    | yes              |
| Days                 | all days: "20 (15+5)", or "19" with no extras | yes              |
| Free km              | `free_km`                                     | yes              |
| Route km             | `distance` (metres)                           | yes              |
| Price                | `base_price` amount + currency                | yes              |
| Link                 | the offer's own page on movacar.com           | yes              |
| Category             | `vehicle_category_name`                       | no               |
| Seats, doors         | `seats`, `doors`                              | no               |
| Latest pick-up       | `latest_pickup`                               | no               |
| Days incl.           | `period` (hours)                              | no               |
| Extra days (to buy)  | `extra_period` − `period`                     | no               |
| €/extra km           | `cents_per_extra_km`                          | no               |
| Min. driver age      | `min_drivers_age`                             | no               |
| Min. licence (years) | `min_licence_age` (months)                    | no               |
| From/To address      | `street`, `postal_code`, `city`               | no               |

**Dropped:** fuel, gear, fuel policy and vehicle type. These only come as Movacar
codes, and V04's labels for them turned out to be wrong (its "Car" was
Transporters, its "Electric Car" a Mystery Van). Also `valid_until`, which
movacar.com doesn't show.

### Country

The API has no country field, but From/To country are the most important columns.

- The lookup lives in its own module behind one small function, so it can be
  replaced later without touching anything else.
- It uses [`@rapideditor/country-coder`](https://github.com/rapideditor/country-coder),
  the offline lookup behind OpenStreetMap's Rapid editor. On the 329 station and city
  coordinates seen so far it agreed with V04's calculation 327 times. The other 2
  were on Tenerife, which V04's border data doesn't cover; country-coder correctly
  says Spain.
- A small overrides file can correct a single station if a border town ever comes
  out wrong.
- Country names come from the browser's built-in `Intl.DisplayNames`, so there's no
  name table.

### Dates

Checked against movacar.com: "Earliest Pickup" is `start_date`, the pick-up
calendar ends on `latest_pickup`, and "Latest Delivery" is `end_date`. Details in
[api.md](api.md#what-movacarcom-shows).

## Website

- **Filters:** a funnel on every column header, fitted to its data: a tick-list
  with counts (cities, countries, category, company), min–max (numbers), from–to
  (dates) or "contains" (vehicle, addresses). Filters combine. Active filters show
  as removable chips, with "Clear all".
- **Search box:** every word must appear in the offer's cities, countries (code or
  name), vehicle, category or company; accents don't matter.
- **Date filter:** on Earliest pick-up, an offer shows if its pick-up window
  overlaps your dates.
- **Sorting:** one column at a time, ascending or descending. Blanks always go last;
  accents and numbers sort properly.
- **Columns:** show or hide each column; the choice is remembered per device.
- **Shareable views:** filters and sort live in the web address, so a view can be
  bookmarked or sent.
- **One line per row:** long text is cut off with "…", and the full text shows
  on hover. ☰ → **Wrap text** shows it all (remembered per device).
- **Menu (☰):** Columns, Wrap text, Share this view, Clear filters, Export CSV,
  Refresh data (opens GitHub).
- **Data age:** "Data from 4 November (today) at 21:24 (12 min ago)", or
  "Data from 2 November (2 days ago) at 21:24".
- **During a refresh:** "Refresh started 3 minutes and 53 seconds ago. Refreshing…",
  counting live. The status is read from GitHub's public API.
- **Errors:** if the last refresh failed, a note says so and shows how old the data is.
- **Phone:** the same table, swiped sideways, with no fixed column for now.
- **Look:** plain and calm, standard fonts, follows the device's light/dark mode.
  Built with Tailwind CSS and shadcn/ui.

## Steps

0. ✅ **Skeleton:** project setup, checks on every pull request, publishing to
   GitHub Pages.
1. ✅ **API notes + Refresh data:** [notes on every field](api.md) with real
   examples, the refresh script and its checks, and tests built from saved real
   answers. The page shows the age of the data.
2. **The table**, in three parts:
   - ✅ **2a:** the columns, sorting by one column, show/hide columns (remembered
     per device), the ☰ menu and Export CSV. Each row links to the offer's own
     page on movacar.com.
   - ✅ **2b:** a filter on every column, the search box, filters and sorting kept
     in the web address, Share this view, one line per row with Wrap text, the
     Days column, and the new default columns.
   - **2c:** "Refresh started … ago. Refreshing…" while a refresh runs.
3. **Phone polish.**

## Not planned

- Alerts, "new since last visit" and offer history: not wanted.
- V04's number-plate design, type buttons, "1 € only" button and locations table.

## Maybe later

- A map showing the relocations. The data keeps station coordinates, so this stays
  possible.
- A refresh button on the website for everyone. It needs a small helper that keeps
  a secret key (for example a free Cloudflare account), because a public website
  can't keep secrets.
