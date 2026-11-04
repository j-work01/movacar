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
  counted 45, while 53 came back (and movacar.com also said "53 offers available").
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
| `min_drivers_age`       | `minDriverAge`     | `18`                                       | "Age 18+"; 18, 19 and 25 seen                           |
| `min_licence_age`       | `minLicenceMonths` | `12`                                       | **months**: "Driving licence min. 1 year"               |
| `start_date`            | `startDate`        | `2026-11-20T23:00:00Z`                     | "Earliest Pickup"                                       |
| `latest_pickup`         | `latestPickup`     | `1795820399`                               | last day of the pick-up calendar; **Unix seconds**      |
| `end_date`              | `endDate`          | `2026-11-28T22:59:59Z`                     | "Latest Delivery": return by                            |
| `period`                | `periodHours`      | `168`                                      | hours: "7 days incl."                                   |
| `extra_period`          | `extraPeriodHours` | `144`                                      | hours, included plus extra days you can buy (see below) |
| `free_km`               | `freeKm`           | `2600`                                     |                                                         |
| `cents_per_extra_km`    | `centsPerExtraKm`  | `50`                                       |                                                         |
| `distance`              | `distanceMeters`   | `2331671`                                  | metres                                                  |

**Not used:** `valid_until` (see [Dates](#dates)). `vehicle_type`, `fuel_type`,
`gear_type`, `refuel` and `additional_info` only come as Movacar codes such as
`crowd_vehicle_type_5`. V04 translated them with
its own table, which turned out to be wrong: `crowd_vehicle_type_0` (its "Car") is
Transporters, `crowd_vehicle_type_1` (its "Electric Car") is a Mystery Van.
Camper fields like `kitchen`, `shower` and `wc` were always empty.

## Station fields

| API field               | In `offers.json`        | Notes                                                                                           |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `id` (of the station)   | `id`                    | unique per station, e.g. `2308`; used in the offer's link and by the country overrides          |
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
129.00) and `currency`. On 4 Nov 2026 every offer cost €1, €99 or €129.

## Links to movacar.com

An offer's own page (where "Select offer" leads, with the pick-up calendar) is

```
https://movacar.com/en-US/checkout/<offer_id>?origin=<origin station id>&destination=<destination station id>
```

for example `https://movacar.com/en-US/checkout/261802?origin=2308&destination=3003`.
A pick-up city's list of offers is
`https://movacar.com/en-US/offers?origin=<name>&oid=<reference>`.

## Dates

- All dates are UTC timestamps, except `latest_pickup`, which is Unix seconds.
- Midnight Dutch/German time arrives as `23:00:00Z` in winter, so
  `2026-11-20T23:00:00Z` means 21 November 00:00.
- End-of-day stamps arrive as `22:59:59Z`, which is 23:59:59 in winter. V04 saw
  the same `22:59:59Z` in summer, which is then 00:59:59 the _next_ day. Summer dates
  may therefore look a day late. To check next summer.

### What movacar.com shows

Checked on 4 Nov 2026 with München → Málaga, ROAD HOUSE camper, offer 261802
(Dutch time):

| API field       | value             | on movacar.com                                   |
| --------------- | ----------------- | ------------------------------------------------ |
| `start_date`    | Sat 21 Nov, 00:00 | "21/11/26 Earliest Pickup"                       |
| `latest_pickup` | Fri 27 Nov, 23:59 | the pick-up calendar runs from 21 to 27 November |
| `end_date`      | Sat 28 Nov, 23:59 | "28/11/26 Latest Delivery"                       |
| `period`        | 168 hours         | "7 days incl."                                   |
| `valid_until`   | Sat 21 Nov, 23:59 | not shown                                        |

So `latest_pickup` is the latest pick-up. The calendar also leaves out days when
the station is closed (Sunday 22 Nov was "Regularly closed"), and the API doesn't
include those.

`valid_until` isn't used. For 749 of the 812 offers it's exactly `end_date` minus
`period`: the last pick-up that still leaves all the included days. It may be how
long Movacar lists the offer, but the site's calendar goes past it.

**Extra days:** a SURFER SUITE on the same route had `period` 120 and
`extra_period` 144, shown as "5 days incl. + 1 day extra". So the extra days you can
buy are `(extra_period − period) / 24`.

`period` can also be longer than the time between pick-up and return: an Indie
Campers offer had `period` 384 (16 days) with only about 9 days in between.
