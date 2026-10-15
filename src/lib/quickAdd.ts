import { addDays, getDay } from 'date-fns'
import type { Area, Priority, Recurrence } from '../types'
import { fromDay, toDay } from './dates'

export interface ParsedQuickAdd {
  title: string
  date: string | null
  time: string | null
  priority: Priority | null
  areaId: string | null
  recurrence: Recurrence | null
}

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5, sat: 6, saturday: 6,
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Parses quick-add text such as
 *   "Edit video tomorrow 6pm #youtube !1"
 *   "Write blog post fri at 10:30 every week"
 * into a title plus date, time, priority, area and repeat.
 */
export function parseQuickAdd(input: string, areas: Area[], today: string): ParsedQuickAdd {
  let text = ` ${input.trim()} `
  let date: string | null = null
  let time: string | null = null
  let priority: Priority | null = null
  let areaId: string | null = null
  let recurrence: Recurrence | null = null
  const base = fromDay(today)

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean | void) => {
    const m = text.match(re)
    if (m && fn(m) !== false) text = text.replace(m[0], ' ')
  }

  // Priority: !1 .. !4 or p1 .. p4
  take(/\s(?:!|p)([1-4])(?=\s)/i, (m) => {
    priority = Number(m[1]) as Priority
  })

  // Area: #name (matches area names without spaces, case-insensitive)
  take(/\s#([\w-]+)(?=\s)/, (m) => {
    const key = m[1].toLowerCase()
    const area = areas.find((a) => a.name.toLowerCase().replace(/\s+/g, '') === key)
    if (!area) return false
    areaId = area.id
  })

  // Repeat
  take(/\s(every day|daily|every weekday|weekdays|every week|weekly|every month|monthly)(?=\s)/i, (m) => {
    const k = m[1].toLowerCase()
    if (k === 'every day' || k === 'daily') recurrence = { type: 'daily' }
    else if (k.includes('weekday')) recurrence = { type: 'weekdays' }
    else if (k.includes('week')) recurrence = { type: 'weekly' }
    else recurrence = { type: 'monthly' }
  })

  // Time: "at 6pm", "6:30 pm", "18:00"
  take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, (m) => {
    let h = Number(m[1]) % 12
    if (m[3].toLowerCase() === 'pm') h += 12
    const min = Number(m[2] ?? 0)
    if (h > 23 || min > 59) return false
    time = `${pad(h)}:${pad(min)}`
  })
  if (!time) {
    take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (m) => {
      time = `${pad(Number(m[1]))}:${m[2]}`
    })
  }

  // Date words
  take(/\s(today|tod|tonight)(?=\s)/i, () => {
    date = today
  })
  if (!date) take(/\s(tomorrow|tmr|tom)(?=\s)/i, () => {
    date = toDay(addDays(base, 1))
  })
  if (!date) take(/\s(?:in\s+)?(\d{1,3})\s+days?(?=\s)/i, (m) => {
    date = toDay(addDays(base, Number(m[1])))
  })
  if (!date) take(/\snext week(?=\s)/i, () => {
    date = toDay(addDays(base, 7))
  })
  if (!date) {
    take(/\s(?:on\s+|next\s+)?(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)(?=\s)/i, (m) => {
      const target = WEEKDAYS[m[1].toLowerCase()]
      let diff = (target - getDay(base) + 7) % 7
      if (diff === 0) diff = 7
      date = toDay(addDays(base, diff))
    })
  }
  if (!date) {
    // "15 oct", "oct 15", "15 october"
    const mon = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
    take(new RegExp(`\\s(?:(\\d{1,2})\\s+${mon}|${mon}\\s+(\\d{1,2}))(?=\\s)`, 'i'), (m) => {
      const day = Number(m[1] ?? m[4])
      const month = MONTHS[(m[2] ?? m[3]).toLowerCase()]
      if (day < 1 || day > 31) return false
      let year = base.getFullYear()
      if (new Date(year, month, day) < base) year += 1
      date = `${year}-${pad(month + 1)}-${pad(day)}`
    })
  }

  // A time with no date means today.
  if (time && !date) date = today
  // A repeat with no date starts today.
  if (recurrence && !date) date = today

  return {
    title: text.replace(/\s+/g, ' ').trim(),
    date,
    time,
    priority,
    areaId,
    recurrence,
  }
}
