import {
  addDays,
  format,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export const DAY_FMT = 'yyyy-MM-dd'
export const MONTH_FMT = 'yyyy-MM'

export const toDay = (d: Date) => format(d, DAY_FMT)
export const toMonth = (d: Date) => format(d, MONTH_FMT)
export const fromDay = (s: string) => parseISO(s)
export const todayStr = () => toDay(new Date())

export const weekStart = (d: Date, weekStartsOn: 0 | 1) =>
  startOfWeek(d, { weekStartsOn })

export const weekPeriod = (d: Date, weekStartsOn: 0 | 1) =>
  toDay(weekStart(d, weekStartsOn))

export const monthOfPeriod = (period: string) => period.slice(0, 7)

export function weekDays(period: string): string[] {
  const start = fromDay(period)
  return Array.from({ length: 7 }, (_, i) => toDay(addDays(start, i)))
}

/** Weeks (by their first day) that overlap the given month. */
export function weeksInMonth(month: string, weekStartsOn: 0 | 1): string[] {
  const out: string[] = []
  let w = weekStart(startOfMonth(parseISO(`${month}-01`)), weekStartsOn)
  while (toMonth(w) <= month) {
    out.push(toDay(w))
    w = addDays(w, 7)
  }
  return out
}

export function prettyDay(day: string, today = todayStr()): string {
  if (day === today) return 'Today'
  const d = fromDay(day)
  const t = fromDay(today)
  if (toDay(addDays(t, 1)) === day) return 'Tomorrow'
  if (toDay(addDays(t, -1)) === day) return 'Yesterday'
  const sameYear = d.getFullYear() === t.getFullYear()
  return format(d, sameYear ? 'EEE, d MMM' : 'd MMM yyyy')
}

export function prettyTime(time: string): string {
  const d = parse(time, 'HH:mm', new Date())
  return isValid(d) ? format(d, 'h:mm a') : time
}

export const prettyMonth = (month: string) =>
  format(parseISO(`${month}-01`), 'MMMM yyyy')

export function prettyWeek(period: string): string {
  const s = fromDay(period)
  const e = addDays(s, 6)
  return `${format(s, 'd MMM')} – ${format(e, 'd MMM')}`
}

/** Local timestamp for a task's date + time. */
export function dateTimeMs(day: string, time: string): number {
  const [h, m] = time.split(':').map(Number)
  const d = fromDay(day)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}
