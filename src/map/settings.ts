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

/** Places this close (in km) show as one on the map. 0 is off. */
export const GROUP_SIZES = [0, 10, 25, 50, 75, 100] as const
export type GroupKm = (typeof GROUP_SIZES)[number]

export const GROUP_KM_KEY = 'movacar-board.group'

/** A remembered distance, or 25 km when it's missing or makes no sense. */
export const toGroupKm = (value: unknown): GroupKm =>
  GROUP_SIZES.find((km) => km === value) ?? 25

/** For screen readers: the buttons only say "Off", "10", … "100". */
export const groupName = (km: GroupKm) =>
  km === 0 ? 'Group places: off' : `Group places within ${km} km`
