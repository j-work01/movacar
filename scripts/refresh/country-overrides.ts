// Corrections for stations whose country comes out wrong, for example a
// station right on a border. Key: the station's id from the API (unique per
// station; `reference` is shared by a whole city, so it can't be used).
// Value: the right ISO 3166-1 alpha-2 code. Add a comment saying why.
//
// Example:
//   '2487': 'DE', // München Flughafen: came out as AT

export const COUNTRY_OVERRIDES: Readonly<Record<string, string>> = {}
