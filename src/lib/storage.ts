// Remembers small settings in this browser. Storage can be unavailable (for
// example in a private window), so failures are ignored.

export function readStored<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as T)
  } catch {
    return undefined
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not available or full: the setting just isn't remembered.
  }
}
