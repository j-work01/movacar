// Remembers small settings in this browser. Storage can be unavailable (for
// example in a private window), so failures are ignored.

import { useEffect, useState } from 'react'

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

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Not available: nothing to remove.
  }
}

/** Like useState, but remembered in this browser under `key`. */
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStored<T>(key) ?? fallback)
  useEffect(() => writeStored(key, value), [key, value])
  return [value, setValue] as const
}
