# Notes on Movacar's API

Movacar's API isn't documented. These notes come from V04 (which found it with the
browser's developer tools) and from real answers seen on 4 November 2026. They're
facts we observed, not a promise from Movacar, so the refresh checks every answer
(see `scripts/refresh/schema.ts`).

- **Base URL:** `https://crowd-api-production-615013621295.europe-west1.run.app/v1`
- **Format:** JSON:API style. The main objects are in `data`, related objects in
  `included`, linked through `relationships`.
- **Request header:** `Accept: application/vnd.api+json`
- **Other websites:** answers carry `access-control-allow-origin: *`, so browsers
  let any site read them. That's why V04 could work. The refresh runs on GitHub's
  servers and doesn't depend on it.

## Endpoints

### `GET /locations/offers?locale=en`

Every pick-up (`origin`) and drop-off (`destination`) location, as `included` items
of type `locationsummary`:

```json
{
  "type": "locationsummary",
  "id": "3695_destination",
  "attributes": {
    "name": "Mannheim",
    "reference": "01JCRF6WXP1KQETKEN9FTXM5FP",
    "location_type": "destination",
    "offer_count": 2,
    "latitude": 49.48929129957233,
    "longitude": 8.4673098
  }
}
```

- On 4 Nov 2026 there were 110 pick-up and 151 drop-off locations, with 813 offers.
- `offer_count` doesn't always match what the offers endpoint returns: München
  counted 45, and 53 came back.
- Some names are German: "Zamudio (bei Bilbao)".

### `GET /offers?locale=en&origin=<reference>`

All offers from one pick-up location; the largest answer seen had 78 (Düsseldorf). Each
offer links to its stations and its price in `included`:

- `relationships.origin` and `relationships.destination` → type `station`
- `relationships.base_price` → type `monetary_amount`

**Why one request per city:** without `origin`, the API asks for `pickupDateFrom` and
`pickupDateTo` (e.g. `2026-11-04`). That search returns at most 100 offers, and
`limit`, `page`, `offset`, `page[size]` and `pageSize` are ignored. Hundreds of offers
can be picked up on any given day, so narrowing the dates can't get around the
limit. A full refresh is therefore 1 + 110 requests.

## Offer fields

| API field               | In `offers.json`   | Example                                    | Notes                                                   |
| ----------------------- | ------------------ | ------------------------------------------ | ------------------------------------------------------- |
| `id` (of the offer)     | `id`               | `261802_4003_7256`                         | unique                                                  |
| `offer_id`              | `offerId`          | `261802`                                   |                                                         |
| `make`, `model`         | `make`, `model`    | `VW`, `CRAFTER 35L 3,5 TO KAS DI MAN`      |                                                         |
| `vehicle_category_name` | `category`         | `Transporter`, `Mystery Van`, `ROAD HOUSE` | readable text                                           |
| `brand_image_url`       | `brandLogoUrl`     | `…/SixtLogo.png`                           | the rental company; `brand_name` is always empty        |
| `vehicle_image_url`     | `vehicleImageUrl`  | `…/wrappedVan.png`                         |                                                         |
| `seats`                 | `seats`            | `2`                                        |                                                         |
| `sleeping`              | `sleeps`           | `0`                                        | 0 for vans                                              |
| `doors`                 | `doors`            | `5`                                        |                                                         |
| `min_drivers_age`       | `minDriverAge`     | `25`                                       | 18, 19 and 25 seen                                      |
| `min_licence_age`       | `minLicenceAge`    | `24`                                       | years                                                   |
| `start_date`            | `startDate`        | `2026-11-20T23:00:00Z`                     | earliest pick-up                                        |
| `valid_until`           | `validUntil`       | `2026-11-21T22:59:59Z`                     | meaning unclear, see below                              |
| `latest_pickup`         | `latestPickup`     | `1795820399`                               | **Unix seconds**, unlike the other dates; stored as ISO |
| `end_date`              | `endDate`          | `2026-11-28T22:59:59Z`                     | return by                                               |
| `period`                | `periodHours`      | `168`                                      | hours                                                   |
| `extra_period`          | `extraPeriodHours` | `168`                                      | hours; V04 read it as the maximum with extra days       |
| `free_km`               | `freeKm`           | `2600`                                     |                                                         |
| `cents_per_extra_km`    | `centsPerExtraKm`  | `50`                                       |                                                         |
| `distance`              | `distanceMeters`   | `2331671`                                  | metres                                                  |

**Not used:** `vehicle_type`, `fuel_type`, `gear_type`, `refuel` and `additional_info`
only come as Movacar codes such as `crowd_vehicle_type_5`. V04 translated them with
its own table, which turned out to be wrong: `crowd_vehicle_type_0` (its "Car") is
Transporters, `crowd_vehicle_type_1` (its "Electric Car") is a Mystery Van.
Camper fields like `kitchen`, `shower` and `wc` were always empty.

## Station fields

| API field               | In `offers.json`        | Notes                                                                                           |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `id` (of the station)   | `id`                    | unique per station, e.g. `2487`; country overrides use this                                     |
| `reference`             | `reference`             | **shared by all stations of a location**: München's airport and city stations have the same one |
| `city`                  | `city`                  | `München Flughafen`                                                                             |
| `alternative_city`      | `name`                  | `Viladecans (near Barcelona)`; falls back to `city`                                             |
| `street`, `postal_code` | `street`, `postalCode`  |                                                                                                 |
| `latitude`, `longitude` | `latitude`, `longitude` |                                                                                                 |

There is **no country field**. The refresh works the country out from the
coordinates (`scripts/refresh/country.ts`). Phone, email and opening-hours fields were
always empty.

## Price

A `monetary_amount` with an id like `12900-EUR`: `amount_minor_units` (12900 means
129.00) and `currency`.

## Dates

- All dates are UTC timestamps, except `latest_pickup`, which is Unix seconds.
- Midnight Dutch/German time arrives as `23:00:00Z` in winter, so
  `2026-11-20T23:00:00Z` means 21 November 00:00.
- End-of-day stamps arrive as `22:59:59Z`, which is 23:59:59 in winter. V04 saw
  the same `22:59:59Z` in summer, which is then 00:59:59 the _next_ day. Summer dates
  may therefore look a day late. To check next summer.

### Open question: `valid_until` or `latest_pickup`?

Both look like a "last pick-up" date, and they often differ by days. Across all 812
offers of 4 Nov 2026:

- `valid_until` is exactly `end_date` minus `period` for 749 offers: every Carl & Carla
  offer and all but one roadsurfer offer. It's the last pick-up that still leaves all
  the included rental time.
- `latest_pickup` is usually only hours before `end_date`: 5–11 hours for most
  roadsurfer offers, about a day for Carl & Carla. That's too late to drive a
  relocation route, so it looks like a hard limit.
- Indie Campers and Sixt are mixed: their `valid_until` sometimes equals `end_date`.

So `valid_until` is the useful "latest pick-up" (V04 used it that way too).
Another reading is that it's how long the offer can be booked online. In practice
both mean the same thing. To confirm, compare with what movacar.com shows.

Example, München → Málaga (ROAD HOUSE camper, offer 261802), Dutch time:

| field           | value             |
| --------------- | ----------------- |
| `start_date`    | Sat 21 Nov, 00:00 |
| `valid_until`   | Sat 21 Nov, 23:59 |
| `latest_pickup` | Fri 27 Nov, 23:59 |
| `end_date`      | Sat 28 Nov, 23:59 |

`period` isn't always the rental length either: an Indie Campers offer had
`period` 384 (16 days) with only about 9 days between pick-up and return.
