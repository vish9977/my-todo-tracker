import { addDays, addMonths, getDay } from 'date-fns'
import type { Recurrence } from '../types'
import { fromDay, toDay } from './dates'

/** The next date after `day` on which a recurring task falls. */
export function nextOccurrence(day: string, rec: Recurrence): string {
  const d = fromDay(day)
  switch (rec.type) {
    case 'daily':
      return toDay(addDays(d, 1))
    case 'weekly':
      return toDay(addDays(d, 7))
    case 'monthly':
      return toDay(addMonths(d, 1))
    case 'weekdays':
    case 'custom': {
      const allowed = rec.type === 'weekdays' ? [1, 2, 3, 4, 5] : rec.days ?? []
      if (allowed.length === 0) return toDay(addDays(d, 7))
      for (let i = 1; i <= 7; i++) {
        const c = addDays(d, i)
        if (allowed.includes(getDay(c))) return toDay(c)
      }
      return toDay(addDays(d, 7))
    }
  }
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function describeRecurrence(rec: Recurrence): string {
  switch (rec.type) {
    case 'daily':
      return 'Every day'
    case 'weekdays':
      return 'Every weekday'
    case 'weekly':
      return 'Every week'
    case 'monthly':
      return 'Every month'
    case 'custom':
      return (rec.days ?? []).length
        ? `Every ${[...(rec.days ?? [])].sort().map((d) => DAY_NAMES[d]).join(', ')}`
        : 'Custom'
  }
}
