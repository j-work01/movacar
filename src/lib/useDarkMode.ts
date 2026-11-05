import { useEffect, useState } from 'react'

const QUERY = '(prefers-color-scheme: dark)'

/** Whether the device is in dark mode, following changes as they happen. */
export function useDarkMode(): boolean {
  const [dark, setDark] = useState(
    () => window.matchMedia?.(QUERY).matches ?? false,
  )
  useEffect(() => {
    const media = window.matchMedia?.(QUERY)
    if (!media) return
    const onChange = () => setDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return dark
}
