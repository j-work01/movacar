// Human-friendly descriptions of a moment, e.g.
//   "4 November (today) at 21:24 (12 min ago)"
//   "3 November (yesterday) at 21:24"
//   "2 November (2 days ago) at 21:24"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

interface CalendarDay {
  year: number
  month: number
  day: number
}

/** The calendar day of a moment, as seen in a time zone. */
function calendarDay(moment: Date, timeZone?: string): CalendarDay {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(moment)
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day') }
}

/** Calendar days from `a` to `b` (not 24-hour periods). */
function daysBetween(a: CalendarDay, b: CalendarDay): number {
  const utc = (d: CalendarDay) => Date.UTC(d.year, d.month - 1, d.day)
  return Math.round((utc(b) - utc(a)) / DAY)
}

/** "just now", "12 min ago", "1 hour ago", "3 hours ago". */
export function timeAgo(ms: number): string {
  if (ms < MINUTE) return 'just now'
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} min ago`
  const hours = Math.floor(ms / HOUR)
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`
}

/**
 * Describes `moment` relative to `now`. `timeZone` defaults to the viewer's
 * own; tests pass one in.
 */
export function describeWhen(
  moment: Date,
  now: Date,
  timeZone?: string,
): string {
  const day = calendarDay(moment, timeZone)
  const today = calendarDay(now, timeZone)
  const days = daysBetween(day, today)

  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'long',
    ...(day.year === today.year ? {} : { year: 'numeric' }),
  }).format(moment)
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(moment)

  if (days <= 0) {
    return `${date} (today) at ${time} (${timeAgo(now.getTime() - moment.getTime())})`
  }
  const relative = days === 1 ? 'yesterday' : `${days} days ago`
  return `${date} (${relative}) at ${time}`
}

/** Short, for a phone: "5 Nov, 00:35 (4 h ago)". */
export function describeWhenShort(when: Date, now: Date): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(when)
  const minutes = Math.max(
    0,
    Math.round((now.getTime() - when.getTime()) / 60_000),
  )
  const ago =
    minutes < 60
      ? `${minutes} min ago`
      : minutes < 48 * 60
        ? `${Math.round(minutes / 60)} h ago`
        : `${Math.round(minutes / 1440)} days ago`
  return `${time} (${ago})`
}
