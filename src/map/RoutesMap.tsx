// The routes on a map. This module is loaded only when the map is turned on
// (☰ → Map): the map library is big, and the table doesn't need it.

import type { FeatureCollection, Point } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  Map as MapLibre,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  boundsOf,
  curve,
  LOOK_RANK,
  looksFor,
  mainArea,
  type City,
  type CityLook,
  type Look,
  type Route,
  type Selection,
} from './routes.ts'

// The library does its heavy lifting in a background helper with a file of
// its own. After bundling it can't find that file by itself.
setWorkerUrl(workerUrl)

type StyleInput = Parameters<MapLibre['setStyle']>[0]
type Layer = Parameters<MapLibre['addLayer']>[0]

/** Calm grey maps from OpenFreeMap: free, without an account or key. */
const STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

/** If the map service can't be reached, the routes show on a plain background. */
const plainStyle = (dark: boolean): StyleInput => ({
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': dark ? '#1f2023' : '#eceef1' },
    },
  ],
})

const COLORS: Record<'light' | 'dark', Record<Look, string>> = {
  light: {
    normal: '#2563eb',
    leaving: '#1d4ed8',
    arriving: '#ea580c',
    chosen: '#111827',
    faint: '#94a3b8',
  },
  dark: {
    normal: '#60a5fa',
    leaving: '#93c5fd',
    arriving: '#fb923c',
    chosen: '#ffffff',
    faint: '#71717a',
  },
}
const LINE_OPACITY: Record<Look, number> = {
  normal: 0.5,
  leaving: 0.95,
  arriving: 0.95,
  chosen: 1,
  faint: 0.14,
}
const ARROW_OPACITY: Record<Look, number> = { ...LINE_OPACITY, normal: 0.8 }
const LINE_WIDTH: Record<Look, number> = {
  normal: 1,
  leaving: 1.25,
  arriving: 1.25,
  chosen: 1.8,
  faint: 1,
}
const LOOKS = Object.keys(LINE_OPACITY) as Look[]

/** A MapLibre "match" on the look of a line: one value per look. */
const byLook = <T,>(values: Record<Look, T>) =>
  [
    'match',
    ['get', 'look'],
    ...LOOKS.flatMap((look) => [look, values[look]]),
    values.normal,
  ] as never

/** An arrowhead pointing right, the way the line runs. */
function arrowImage(color: string, ratio: number) {
  const size = Math.round(11 * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(size * 0.12, size * 0.14)
  ctx.lineTo(size * 0.96, size * 0.5)
  ctx.lineTo(size * 0.12, size * 0.86)
  ctx.lineTo(size * 0.34, size * 0.5)
  ctx.closePath()
  ctx.fill()
  return ctx.getImageData(0, 0, size, size)
}

const RATIO = 2

function routeData(
  routes: readonly Route[],
  lines: Map<string, [number, number][]>,
  looks: ReturnType<typeof looksFor>,
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: routes.map((route) => {
      const look = looks.route(route)
      return {
        type: 'Feature',
        properties: {
          key: route.key,
          look,
          rank: LOOK_RANK[look],
          // Thicker with more offers.
          width: (1 + 0.6 * Math.sqrt(route.offers.length)) * LINE_WIDTH[look],
        },
        geometry: { type: 'LineString', coordinates: lines.get(route.key)! },
      }
    }),
  }
}

const CITY_RANK: Record<CityLook, number> = {
  faint: 0,
  normal: 1,
  linked: 2,
  picked: 3,
}

function cityData(
  cities: readonly City[],
  looks: ReturnType<typeof looksFor>,
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cities.map((city) => {
      const look = looks.city(city)
      return {
        type: 'Feature',
        properties: {
          key: city.key,
          name: city.name,
          leaving: city.leaving,
          arriving: city.arriving,
          look,
          // Lit-up cities on top, and bigger ones above smaller ones, so the
          // dot you see is the one a tap picks.
          rank: CITY_RANK[look] * 100_000 + city.leaving + city.arriving,
          // Pick-up cities are filled; drop-off-only cities are rings.
          pickup: city.leaving > 0,
          radius:
            2.5 +
            0.8 * Math.sqrt(city.leaving + city.arriving) +
            (look === 'picked' ? 2 : 0),
        },
        geometry: { type: 'Point', coordinates: [city.lng, city.lat] },
      }
    }),
  }
}

/** Dots grow as you zoom in: [zoom, scale] at both ends. */
const DOT_SCALE = { from: [3, 0.65], to: [8, 1.4] } as const

const dotScale = (zoom: number) => {
  const { from, to } = DOT_SCALE
  const t = Math.min(1, Math.max(0, (zoom - from[0]) / (to[0] - from[0])))
  return from[1] + t * (to[1] - from[1])
}

/** Adds the routes and cities on top of a freshly loaded background map. */
function addOverlay(map: MapLibre, dark: boolean) {
  const colors = COLORS[dark ? 'dark' : 'light']
  for (const look of LOOKS) {
    const id = `arrow-${look}`
    if (!map.hasImage(id)) {
      map.addImage(id, arrowImage(colors[look], RATIO), { pixelRatio: RATIO })
    }
  }
  const empty: FeatureCollection = {
    type: 'FeatureCollection',
    features: [],
  }
  map.addSource('routes', { type: 'geojson', data: empty })
  map.addSource('cities', { type: 'geojson', data: empty })

  // Lines go under the background map's place names, so those stay readable.
  const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
  const layers: Layer[] = [
    {
      id: 'route-lines',
      type: 'line',
      source: 'routes',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        'line-sort-key': ['get', 'rank'],
      },
      paint: {
        'line-color': byLook(colors),
        'line-opacity': byLook(LINE_OPACITY),
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3,
          ['*', 0.8, ['get', 'width']],
          9,
          ['*', 1.6, ['get', 'width']],
        ],
      },
    },
    {
      // Arrowheads along each line show which way it goes.
      id: 'route-arrows',
      type: 'symbol',
      source: 'routes',
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 180,
        'symbol-sort-key': ['get', 'rank'],
        'icon-image': ['concat', 'arrow-', ['get', 'look']],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-rotation-alignment': 'map',
      },
      paint: { 'icon-opacity': byLook(ARROW_OPACITY) },
    },
  ]
  for (const layer of layers) map.addLayer(layer, firstLabel)

  map.addLayer({
    id: 'cities',
    type: 'circle',
    source: 'cities',
    layout: { 'circle-sort-key': ['get', 'rank'] },
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        DOT_SCALE.from[0],
        ['*', DOT_SCALE.from[1], ['get', 'radius']],
        DOT_SCALE.to[0],
        ['*', DOT_SCALE.to[1], ['get', 'radius']],
      ],
      'circle-color': [
        'case',
        ['==', ['get', 'look'], 'picked'],
        colors.chosen,
        ['==', ['get', 'look'], 'faint'],
        colors.faint,
        ['get', 'pickup'],
        colors.normal,
        dark ? '#18181b' : '#ffffff',
      ],
      'circle-stroke-color': [
        'case',
        ['all', ['!', ['get', 'pickup']], ['!=', ['get', 'look'], 'faint']],
        colors.normal,
        dark ? '#18181b' : '#ffffff',
      ],
      'circle-stroke-width': [
        'case',
        ['==', ['get', 'look'], 'picked'],
        2.5,
        1.25,
      ],
      'circle-opacity': ['case', ['==', ['get', 'look'], 'faint'], 0.35, 1],
      'circle-stroke-opacity': [
        'case',
        ['==', ['get', 'look'], 'faint'],
        0.35,
        1,
      ],
    },
  })
}

/** How far around a tap to look for a city, in pixels. */
const TAP_SLOP = 14

/**
 * The city a tap at this point means: the topmost dot under the finger (big
 * cities are drawn over small neighbours), or else the nearest one close by.
 */
function cityAt(map: MapLibre, x: number, y: number) {
  const near = map.queryRenderedFeatures(
    [
      [x - TAP_SLOP, y - TAP_SLOP],
      [x + TAP_SLOP, y + TAP_SLOP],
    ],
    { layers: ['cities'] },
  )
  const scale = dotScale(map.getZoom())
  let onTop: (typeof near)[number] | undefined
  let nearest: (typeof near)[number] | undefined
  let nearestDistance = Infinity
  for (const feature of near) {
    const point = map.project(
      (feature.geometry as Point).coordinates as [number, number],
    )
    const distance = Math.hypot(point.x - x, point.y - y)
    const radius = Number(feature.properties.radius) * scale
    const rank = Number(feature.properties.rank)
    if (distance <= radius + 3 && rank > Number(onTop?.properties.rank ?? -1)) {
      onTop = feature
    }
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = feature
    }
  }
  return onTop ?? nearest
}

/** The line at this point, if one is close by: lit-up lines first. */
function routeAt(map: MapLibre, x: number, y: number) {
  const near = map.queryRenderedFeatures(
    [
      [x - 6, y - 6],
      [x + 6, y + 6],
    ],
    { layers: ['route-lines'] },
  )
  return near.sort(
    (a, b) => Number(b.properties.rank) - Number(a.properties.rank),
  )[0]
}

export default function RoutesMap({
  cities,
  routes,
  picked,
  onPickCity,
  onPickRoute,
  dark,
}: {
  cities: readonly City[]
  routes: readonly Route[]
  picked: Selection
  /** A city was tapped, or null for a tap on the map itself. */
  onPickCity: (key: string | null) => void
  /** A line was tapped. */
  onPickRoute: (key: string) => void
  dark: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre | null>(null)
  /** The routes are on the map (its background has loaded). */
  const readyRef = useRef(false)
  /** The background map that is loading, or null for the plain one. */
  const styleUrlRef = useRef<string | null>(null)
  /** The background map couldn't be loaded, so the plain one is used. */
  const plainRef = useRef(false)

  // The curves only change when the routes do.
  const lines = useMemo(
    () => new Map(routes.map((r) => [r.key, curve(r.from, r.to)])),
    [routes],
  )

  // The latest props, for the map's own event handlers.
  const props = { cities, routes, lines, picked, onPickCity, onPickRoute, dark }
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })

  /** Draws the current routes and what's picked. */
  const draw = useCallback(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const { cities, routes, lines, picked } = latest.current
    const looks = looksFor(routes, picked)
    ;(map.getSource('routes') as GeoJSONSource | undefined)?.setData(
      routeData(routes, lines, looks),
    )
    ;(map.getSource('cities') as GeoJSONSource | undefined)?.setData(
      cityData(cities, looks),
    )
    // For checks in a browser: drawn, and on which background.
    const box = map.getContainer().dataset
    box.ready = 'true'
    box.background = plainRef.current ? 'plain' : 'openfreemap'
  }, [])

  /** Shows the routes in the list: where most of them are. */
  const fitAll = useCallback((animate: boolean) => {
    const map = mapRef.current
    const { routes, cities } = latest.current
    const bounds = mainArea(routes) ?? boundsOf(cities)
    if (!map || !bounds) return
    map.fitBounds(bounds, {
      padding: 30,
      maxZoom: 8,
      duration: animate ? 500 : 0,
    })
  }, [])

  /** Loads a background map: from OpenFreeMap, or the plain one. */
  const loadStyle = useCallback((map: MapLibre, dark: boolean) => {
    readyRef.current = false
    const url = plainRef.current ? null : STYLE_URL[dark ? 'dark' : 'light']
    styleUrlRef.current = url
    map.setStyle(url ?? plainStyle(dark), { diff: false })
  }, [])

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = new MapLibre({
      container,
      center: [10, 48],
      zoom: 3.5,
      minZoom: 2,
      maxZoom: 14,
      // A flat map, north up: no turning or tilting by accident.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      // The map's credits: in full on a wide map, behind an ⓘ on a phone.
      attributionControl: {},
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('style.load', () => {
      addOverlay(map, latest.current.dark)
      readyRef.current = true
      draw()
    })
    map.on('error', (event) => {
      // The background map didn't load: carry on without it. (Errors about
      // single tiles have other addresses, and are left to the library.)
      const url = (event.error as { url?: string } | undefined)?.url
      const loading = styleUrlRef.current
      if (!readyRef.current && loading && (!url || url === loading)) {
        plainRef.current = true
        loadStyle(map, latest.current.dark)
      }
    })
    loadStyle(map, latest.current.dark)

    // Tap a city to pick it; tap elsewhere to let go.
    map.on('click', (event: MapMouseEvent) => {
      if (!readyRef.current) return
      const { x, y } = event.point
      const city = cityAt(map, x, y)
      if (city) return latest.current.onPickCity(String(city.properties.key))
      // Not a city: perhaps a line, else the map itself (lets go of all).
      const line = routeAt(map, x, y)
      if (line) return latest.current.onPickRoute(String(line.properties.key))
      latest.current.onPickCity(null)
    })

    // With a mouse: the name and numbers of the city a click would pick.
    if (window.matchMedia?.('(hover: hover)').matches) {
      const popup = new Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
        className: 'routes-popup',
      })
      map.on('mousemove', (event: MapMouseEvent) => {
        const city = readyRef.current
          ? cityAt(map, event.point.x, event.point.y)
          : undefined
        const line =
          readyRef.current && !city
            ? routeAt(map, event.point.x, event.point.y)
            : undefined
        map.getCanvas().style.cursor = city || line ? 'pointer' : ''
        if (!city) {
          popup.remove()
          return
        }
        const { name, leaving, arriving } = city.properties
        popup
          .setLngLat((city.geometry as Point).coordinates as [number, number])
          .setText(`${name}: ${leaving} leaving, ${arriving} arriving`)
          .addTo(map)
      })
      map.getCanvas().addEventListener('mouseleave', () => popup.remove())
    }

    // Follow the size of the box, e.g. after ☰ → Map → 60%.
    const resize = new ResizeObserver(() => map.resize())
    resize.observe(container)

    return () => {
      resize.disconnect()
      readyRef.current = false
      mapRef.current = null
      map.remove()
    }
  }, [draw, loadStyle])

  // Light or dark background, following the device.
  const shownDark = useRef(dark)
  useEffect(() => {
    const map = mapRef.current
    if (!map || shownDark.current === dark) return
    shownDark.current = dark
    loadStyle(map, dark)
  }, [dark, loadStyle])

  // New filters: draw the new routes and show them all.
  const firstFit = useRef(true)
  useEffect(() => {
    draw()
    fitAll(!firstFit.current)
    firstFit.current = false
  }, [routes, cities, draw, fitAll])

  // Something picked: light it up.
  useEffect(() => draw(), [picked, draw])

  // An offer picked in the table: make sure its route is in view.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !picked.offer) return
    const route = routes.find((r) =>
      r.offers.some((o) => o.id === picked.offer),
    )
    const line = route && lines.get(route.key)
    if (!line) return
    const view = map.getBounds()
    if (line.every((point) => view.contains(point))) return
    const bounds = boundsOf(line.map(([lng, lat]) => ({ lng, lat })))
    if (bounds)
      map.fitBounds(bounds, { padding: 50, maxZoom: 7, duration: 500 })
  }, [picked.offer, routes, lines])

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Map of the routes"
      className="h-full w-full"
    />
  )
}
