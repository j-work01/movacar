// How much of the screen the map takes (☰ → Map). Remembered per device.

/** 0 is off; 100 leaves no room for the table. */
export const MAP_SIZES = [0, 10, 25, 50, 75, 100] as const
export type MapSize = (typeof MAP_SIZES)[number]

export const MAP_SIZE_KEY = 'movacar-board.map'

/** A remembered size, or off when it's missing or makes no sense. */
export const toMapSize = (value: unknown): MapSize =>
  MAP_SIZES.find((size) => size === value) ?? 0

/** For screen readers: the buttons only say "Off", "20", … "100". */
export const mapSizeName = (size: MapSize) =>
  size === 0
    ? 'Map off'
    : size === 100
      ? 'Map 100% of the screen, no table'
      : `Map ${size}% of the screen`
