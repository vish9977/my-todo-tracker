import { addDays, addMonths, addWeeks, differenceInCalendarDays, endOfMonth, format, parseISO } from 'date-fns'
import type { Goal, GoalLevel } from '../types'
import { fromDay, toDay, weekPeriod } from './dates'

/** Bigger number = longer period. Custom goals are ranked by their length. */
const RANK: Record<Exclude<GoalLevel, 'custom'>, number> = { year: 5, half: 4, quarter: 3, month: 2, week: 1 }

export const LEVELS: GoalLevel[] = ['year', 'half', 'quarter', 'month', 'week', 'custom']

export const LEVEL_NAME: Record<GoalLevel, string> = {
  year: 'Yearly',
  half: '6 months',
  quarter: 'Quarterly',
  month: 'Monthly',
  week: 'Weekly',
  custom: 'Custom dates',
}

/** The usual next-smaller level when breaking a goal down. */
export const CHILD_LEVEL: Record<GoalLevel, GoalLevel> = {
  year: 'half',
  half: 'quarter',
  quarter: 'month',
  month: 'week',
  week: 'week',
  custom: 'month',
}

export interface Range {
  start: string
  end: string
}

export function periodRange(level: GoalLevel, period: string, endDate?: string | null): Range {
  switch (level) {
    case 'year':
      return { start: `${period}-01-01`, end: `${period}-12-31` }
    case 'half': {
      const [y, h] = period.split('-H')
      return h === '1' ? { start: `${y}-01-01`, end: `${y}-06-30` } : { start: `${y}-07-01`, end: `${y}-12-31` }
    }
    case 'quarter': {
      const [y, q] = period.split('-Q')
      const startMonth = (Number(q) - 1) * 3
      const start = new Date(Number(y), startMonth, 1)
      return { start: toDay(start), end: toDay(endOfMonth(addMonths(start, 2))) }
    }
    case 'month':
      return { start: `${period}-01`, end: toDay(endOfMonth(parseISO(`${period}-01`))) }
    case 'week':
      return { start: period, end: toDay(addDays(fromDay(period), 6)) }
    case 'custom':
      return { start: period, end: endDate && endDate >= period ? endDate : period }
  }
}

export const goalRange = (g: Pick<Goal, 'level' | 'period' | 'endDate'>) => periodRange(g.level, g.period, g.endDate)

export function rankOf(g: Pick<Goal, 'level' | 'period' | 'endDate'>): number {
  if (g.level !== 'custom') return RANK[g.level]
  const { start, end } = goalRange(g)
  const days = differenceInCalendarDays(fromDay(end), fromDay(start)) + 1
  return days > 270 ? 5 : days > 120 ? 4 : days > 50 ? 3 : days > 10 ? 2 : 1
}

/** The period of the given level that contains `day`. */
export function periodFor(level: GoalLevel, day: string, weekStartsOn: 0 | 1): string {
  const d = fromDay(day)
  const y = d.getFullYear()
  switch (level) {
    case 'year':
      return String(y)
    case 'half':
      return `${y}-H${d.getMonth() < 6 ? 1 : 2}`
    case 'quarter':
      return `${y}-Q${Math.floor(d.getMonth() / 3) + 1}`
    case 'month':
      return format(d, 'yyyy-MM')
    case 'week':
      return weekPeriod(d, weekStartsOn)
    case 'custom':
      return day
  }
}

/** Moves a period forward or back by `n` steps of its own length. */
export function shiftPeriod(level: GoalLevel, period: string, n: number): string {
  const start = fromDay(periodRange(level, period).start)
  switch (level) {
    case 'year':
      return String(Number(period) + n)
    case 'half':
      return periodFor('half', toDay(addMonths(start, 6 * n)), 1)
    case 'quarter':
      return periodFor('quarter', toDay(addMonths(start, 3 * n)), 1)
    case 'month':
      return format(addMonths(start, n), 'yyyy-MM')
    case 'week':
      return toDay(addWeeks(start, n))
    case 'custom':
      return period
  }
}

export function periodLabel(level: GoalLevel, period: string, endDate?: string | null): string {
  const { start, end } = periodRange(level, period, endDate)
  const s = fromDay(start)
  const e = fromDay(end)
  switch (level) {
    case 'year':
      return period
    case 'half':
      return `${format(s, 'MMM')}–${format(e, 'MMM yyyy')}`
    case 'quarter':
      return `Q${period.split('-Q')[1]} · ${format(s, 'MMM')}–${format(e, 'MMM yyyy')}`
    case 'month':
      return format(s, 'MMMM yyyy')
    case 'week':
    case 'custom':
      return s.getFullYear() === e.getFullYear()
        ? `${format(s, 'd MMM')} – ${format(e, 'd MMM yyyy')}`
        : `${format(s, 'd MMM yyyy')} – ${format(e, 'd MMM yyyy')}`
  }
}

export const goalLabel = (g: Pick<Goal, 'level' | 'period' | 'endDate'>) => periodLabel(g.level, g.period, g.endDate)

/** True if the goal's dates include `day`. */
export function isActiveOn(g: Pick<Goal, 'level' | 'period' | 'endDate'>, day: string) {
  const { start, end } = goalRange(g)
  return start <= day && day <= end
}

/** True if two goals' date ranges overlap. */
export function overlaps(a: Range, b: Range) {
  return a.start <= b.end && b.start <= a.end
}
