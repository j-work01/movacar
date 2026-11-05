# Round-trip finder

**A design draft, for discussion.** Nothing is built yet. The numbers come from
the 813 offers of the 4 November 2026 refresh, run through a quick prototype of
the rules below.

## The idea

You pick your dates. The board finds **trips**: two or more offers, one after
the other, where you pick up the next car near where you dropped off the last
one, on the same day or a few days later. Each trip shows as one line on the
map:

```text
A → B → C → D
Amstelveen → Marburg → Saint-Alban (near Toulouse) → Duisburg
```

"Near" is what the map already shows as one dot: with **Group places** at
25 km, a trip can change cars anywhere within a dot.

## What the data says

- **Trips are everywhere.** With the settings below (Group places 25 km, up to
  3 days' wait, up to 3 legs) the data holds 1,605 two-leg and 6,449 three-leg
  trips, counted as sequences of places. As combinations of single offers it's
  7,560 and 40,409. So finding trips is easy; the work is in showing the good
  ones first.
- **Even one start has plenty.** For 14–28 November, a start place has a median
  of 96 trips, and at most 277 (66 of the 85 pick-up places have at least one).
  With up to 4 legs: a median of 329, and up to 1,058.
- **Ending where you started is rare.** Of the 6,857 trips in 14–28 November,
  108 (1.6%) end where they began, from only 30 places. None start in
  Amstelveen or Rotterdam. Ending _near_ the start is easier: in the week of
  9 November, Amstelveen → Marburg → Saint-Alban (near Toulouse) → Duisburg
  ends 169 km from Amstelveen.
- **Most connections need no waiting.** Pick-up windows are wide (a median of
  7½ days), so going from 0 to 7 days of waiting adds only about 5% more trips.
  But some trips only exist thanks to the wait (see the example below).
- **Return by is the real deadline.** The latest pick-up is usually about half
  a day before Return by, so a late pick-up leaves no time to drive.
- **Changing cars often means changing stations.** Even with Group places Off,
  only 44% of the connections are at the same station, as all stations of a
  city share one place (like München's two stations). At 25 km the next
  pick-up is a median of 10 km away, and at most 32 km (e.g. drop off in
  Heidelberg, pick up in Mannheim: 15 km). At 100 km: a median of 57 km, and up
  to 186 km.
- **The search is quick.** About 0.1 s for up to 3 legs and 0.3 s for up to 4,
  on the prototype's machine; a phone is slower. 5 legs takes over a second and
  finds four times as many trips.

## What counts as a trip

1. Two or more offers, one after the other: up to 3 (or 4).
2. Each one starts in the place (the dot on the map) where the one before it
   ends.
3. You pick up the next car on the day you drop off the one before, or up to
   **a few days later**: the margin, 3 days unless you choose otherwise.
4. Each car:
   - is picked up within its pick-up window, and not before today;
   - is dropped off no sooner than the drive allows (counting about 700 km a
     day), and no later than its **Return by** or the end of its included days,
     whichever comes first. Extra days you can buy don't count: their price
     isn't in the API.
5. The whole trip fits in your dates: the first pick-up on or after the first
   day, the last drop-off on or before the last.
6. No place twice, except coming back to the start at the end.
7. An offer that starts and ends in the same dot isn't a leg (it isn't a line
   on the map either).

Everything is counted in whole days, in German/Dutch time, like the rest of the
board.

Each rule only links a leg to the next one, so the board can work out exactly
which days work for each leg: once forwards through the trip, once backwards.
So every trip comes with a **plan**: the days on which each car can be picked
up and dropped off, given the others.

### Example: the margin at work

Málaga → München → Málaga, two roadsurfer campers at €129 each:

```text
1  Málaga → München    2,332 km, 5 days incl.
   offer: pick up 11–17 Nov, return by Wed 18 Nov
   plan:  pick up Fri 13 – Sun 15 Nov, drop off Wed 18 Nov
      in München: wait 3 days, same station
2  München → Málaga    2,332 km, 5 days incl.
   offer: pick up 21–27 Nov, return by Sat 28 Nov
   plan:  pick up Sat 21 Nov, drop off Tue 24 – Thu 26 Nov
```

A trip of 10 to 14 days and about 4,660 km, for €258. With a margin of 2 days
or less, it doesn't exist. On the map it's a loop: the lines there and back lie
side by side, as they do now.

## Design

### Where it lives

A switch in the header: **Offers | Trips**. In Trips, the map and the table
stay where they are, but the table lists trips and the map draws them. A switch
rather than an item in ☰, because it changes what the whole page shows; it
isn't a setting.

### Settings

In Trips, a line under the header holds the trip's settings. Each one opens a
small editor when tapped:

- **Dates**, e.g. 14–28 Nov: the first and last day of the trip. Empty means
  any day from today.
- **Wait**: up to 0, 1, 2, **3**, 5 or 7 days for the next car.
- **Legs**: up to 2, **3** or 4.

"Near" comes from ☰ → **Group places**, so the trips always agree with the dots
on the map. In Trips it may want a clearer name, like "Change cars within
25 km".

### Filters

- **Place filters are about the trip.** From (city or country) is where the
  trip starts, To is where it ends, and "From or To" is either end. The chips
  say so: "Starts in: Netherlands (NL)".
- **All other filters apply to every leg.** "Sleeps: at least 2" means campers
  all the way, "Price: up to €1" only €1 offers, "Route km: at least 300" no
  short hops.

So the start of a trip comes from the From filters, or from tapping a city on
the map (see below).

### The trips table

One row per sequence of places, as each one is a line on the map. Often several
offers can do the same leg (a median of 3 combinations per trip, and up to
144). The row shows the cheapest combination, the one with the most days to
spare among equals, and says how many others there are.

| Column        | Example                                | What it is                                                        |
| ------------- | -------------------------------------- | ----------------------------------------------------------------- |
| Trip          | Amstelveen → Marburg → Saint-Alban → … | its places; Wrap text shows them all                              |
| Legs          | 3                                      |                                                                   |
| Start         | Mon 9 Nov                              | the first day the first car can be picked up                      |
| End           | Mon 16 Nov                             | the last day the last car can be dropped off                      |
| Days          | 3–8                                    | the shortest and the longest the trip can be                      |
| Route km      | 2,859                                  | all legs                                                          |
| Price         | €259                                   | all legs                                                          |
| Back to start | 169 km                                 | in a straight line, from where it ends to where it began; ↺ for 0 |
| Sleeps        | 4                                      | the fewest of its cars                                            |
| Company       | (logos)                                |                                                                   |

Sorted by **Back to start** until you pick another column: real round trips
first, then the trips that end nearest to where they began. That's the
"round-trip" part of the finder, without hiding the other trips.

### A trip, opened

Tap a trip: it opens underneath, its line lights up on the map, and the map
moves to show it.

```text
1  Amstelveen → Marburg                     €1    ↗
   VW California Ocean · roadsurfer · sleeps 4
   pick up Mon 9 – Sat 14 Nov · drop off by Sat 14 Nov · 2 days incl. · 436 km
      in Marburg: wait 0–3 days · same station
2  Marburg → Saint-Alban (near Toulouse)    €129  ↗
   VW California Beach · roadsurfer · sleeps 5
   pick up Mon 9 – Sat 14 Nov · drop off Tue 10 – Sun 15 Nov · 4 days incl. · 1,248 km
      in Saint-Alban: wait 0–3 days · same station
3  Saint-Alban (near Toulouse) → Duisburg   €129  ↗
   Westfalia Eliseo C540 · roadsurfer · sleeps 4
   pick up Tue 10 – Sun 15 Nov · drop off Wed 11 – Mon 16 Nov · 3 days incl. · 1,175 km
```

- ↗ opens the offer on movacar.com, to check its calendar and book it.
- Between legs: how long you may wait, and how far the next pick-up is when
  it's at another station ("next pick-up in Mannheim, 15 km").
- The days hang together: pick up the first car later and the rest moves too.
  A short note says so.
- "+2 other vans" on a leg: the other offers that fit there, with the rest of
  the trip unchanged.

### The map

- The legs of all the trips in the list, as lines like today's.
- The trip you tap: one black line (white in dark mode) through its stops,
  numbered 1, 2, 3, 4, with the rest faded.
- Tap a city: the trips that start there light up in blue and those that end
  there in orange, and they come first in the table. Tap it again to let go,
  as now.
- Tap a line: the trips that use it come first in the table.

### Sharing

The trip settings go in the web address, like the filters, e.g.
`?trips=2026-11-14..2026-11-28&wait=3&legs=3&fromCountry=NL`. So **Share this
view** sends the search.

### On a phone

The settings line scrolls sideways, like the header line. The trips table
swipes sideways, like the offers table. An opened trip is a list of lines, as
above, so it fits a narrow screen.

### When nothing fits

"No trips in these dates", with what might help, each as a button: a longer
wait, more legs, places grouped further apart, or fewer filters.

## What the board can't know

A small note in Trips says:

- **Opening hours and closed days** aren't in the API. Check each car's
  calendar on movacar.com.
- **The data is from the last refresh.** A car may be gone by now. Refresh,
  then book the legs at about the same time.
- **Getting from one station to the next** is up to you. The board only says
  how far it is.
- **Driving time is a guess:** about 700 km a day.

## Other ideas we looked at

- **Build a trip by hand** ("continue from here"): tap an offer, and the offers
  you could take next from where it ends light up; tap one to add it. Good for
  exploring, and it fits the map's taps. It could come later, as "extend this
  trip".
- **A count on every offer**, like "→ 4 next". Cheap, but you'd still have to
  put the trips together yourself.
- **Only real round trips.** Too rare: 1.6%, and none from the Netherlands in
  two weeks. Sorting by Back to start keeps them on top without hiding the
  rest.
- **"Near" as a distance from the station** where you drop off, instead of the
  dots. A little better at the edge of a dot, but then the trips and the map
  would disagree.
- **5 legs or more.** Slow on a phone, and four times as many trips for each
  extra leg.

## To decide

1. **Round trips only, or any chain?** Proposed: any chain, with the trips that
   end nearest their start first, and ↺ on real round trips.
2. **What does the margin mean?** Proposed: the most days you'd wait between
   dropping off one car and picking up the next, same day allowed; 3 by
   default. Other readings: a minimum stay in each place ("at least a day in
   each city"), or spare days in case you're late.
3. **What do the dates mean?** Proposed: the whole trip happens within them.
   The other reading: only the start has to be within them.
4. **Filters.** Proposed as above: places for the trip's two ends, everything
   else for every leg.
5. **Driving time.** Count about 700 km a day? Without it, the board would
   offer trips that can't be driven in time.
6. **Legs.** Up to 3 by default, 4 as an option?
7. **Extra days.** Count only the included days, or also the extra days you can
   buy (at a price the API doesn't give)?

## Steps

1. **The rules** in `src/trips/`: find the trips and work out their plans, as
   plain functions with tests, like `src/map/routes.ts`. The tests use made-up
   offers (`src/test/offers.ts`) and the examples above.
2. **Trips mode:** the switch, the settings, the trips table, an opened trip
   with its legs and links, the web address, and the empty state.
3. **The map:** the trips' legs, the tapped trip as one numbered line, and taps
   on cities and lines. The numbers are drawn like the arrowheads, so they show
   on the plain background too.
4. **Later, if wanted:** other offers per leg, fixing a day and planning the
   rest around it, building a trip by hand, and Export CSV for trips.

Once decided, the choices go into [PLAN.md](PLAN.md), like the others.
