import { invoke } from '@tauri-apps/api/core'
import { addDays, format, parseISO } from 'date-fns'
import type { AppData, Task, TaskReminder } from '../types'
import { dateTimeMs, fromDay, prettyDay, prettyTime, toDay, todayStr } from './dates'
import { inDesktopApp } from './storage'

export interface ReminderItem {
  key: string
  title: string
  body: string
  atMs: number
  /** Also send this one by email. */
  email: boolean
  /** Other people to email it to. */
  alsoEmail: string[]
}

/** Reminders older than this are dropped (matches the scheduler's grace period). */
const STALE_MS = 10 * 60_000
const MAX_NAGS = 6

/** When a reminder fires, or null if the task doesn't have what it needs (e.g. no time). */
export function reminderTime(task: Task, r: TaskReminder): number | null {
  if (r.kind === 'at') {
    const d = parseISO(r.at)
    return isNaN(d.getTime()) ? null : d.getTime()
  }
  if (!task.date || !task.time) return null
  return dateTimeMs(task.date, task.time) - r.minutes * 60_000
}

export function describeReminder(task: Task, r: TaskReminder): string {
  if (r.kind === 'at') {
    const d = parseISO(r.at)
    return isNaN(d.getTime()) ? 'Invalid time' : `${prettyDay(toDay(d))}, ${format(d, 'h:mm a')}`
  }
  if (r.minutes === 0) return 'At time of task'
  return `${describeOffset(r.minutes)} before${task.time ? '' : ' (needs a time)'}`
}

export function describeOffset(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? '' : 's'}`
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`
  return `${minutes} min`
}

/** Upcoming notifications: task reminders (with repeats) plus the daily summary for the next few days. */
export function buildReminders(data: AppData, now = Date.now()): ReminderItem[] {
  const out: ReminderItem[] = []
  const areaName = new Map(data.areas.map((a) => [a.id, a.name]))
  const goalTitle = new Map(data.goals.map((g) => [g.id, g.title]))
  const email = data.settings.email

  for (const t of data.tasks) {
    if (t.done || t.reminders.length === 0) continue
    const wantsEmail = email.enabled && (t.emailReminder ?? true)
    const assignee = t.assigneeId ? data.settings.people.find((p) => p.id === t.assigneeId) : null
    const alsoEmail = email.enabled && t.remindAssignee && assignee ? [assignee.email] : []
    const parts = [
      t.date ? `${prettyDay(t.date)}${t.time ? ` at ${prettyTime(t.time)}` : ''}` : null,
      t.areaId ? areaName.get(t.areaId) : null,
      t.goalId ? `Goal: ${goalTitle.get(t.goalId)}` : null,
      assignee ? `Assigned to ${assignee.name}` : null,
    ].filter(Boolean)
    const body = parts.join(' · ') || 'Reminder'

    for (const r of t.reminders) {
      const first = reminderTime(t, r)
      if (first === null) continue
      const repeats = t.nagMinutes ? MAX_NAGS : 0
      for (let i = 0; i <= repeats; i++) {
        const atMs = first + i * (t.nagMinutes ?? 0) * 60_000
        if (atMs < now - STALE_MS) continue
        out.push({
          key: `${t.id}@${atMs}`,
          title: i === 0 ? t.title : `Still to do: ${t.title}`,
          body,
          atMs,
          email: wantsEmail,
          alsoEmail,
        })
      }
    }
  }

  const summaryTime = data.settings.dailySummaryTime
  if (summaryTime) {
    const today = todayStr()
    for (let i = 0; i < 3; i++) {
      const day = toDay(addDays(fromDay(today), i))
      const atMs = dateTimeMs(day, summaryTime)
      if (atMs < now - STALE_MS) continue
      const due = data.tasks.filter((t) => !t.done && t.date && t.date <= day)
      if (due.length === 0) continue
      const overdue = due.filter((t) => t.date! < day).length
      const body =
        `${due.length} task${due.length === 1 ? '' : 's'} today` +
        (overdue ? ` (${overdue} overdue)` : '') +
        ':\n' +
        due
          .slice(0, 15)
          .map((t) => `• ${t.time ? `${prettyTime(t.time)} ` : ''}${t.title}`)
          .join('\n') +
        (due.length > 15 ? `\n…and ${due.length - 15} more` : '')
      out.push({
        key: `summary@${atMs}`,
        title: 'Your plan for today',
        body,
        atMs,
        email: email.enabled && email.dailySummary,
        alsoEmail: [],
      })
    }
  }

  // Two reminders for the same task at the same moment would show twice.
  const seen = new Set<string>()
  return out
    .filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)))
    .sort((a, b) => a.atMs - b.atMs)
}

export async function syncReminders(data: AppData) {
  if (!inDesktopApp) return
  const e = data.settings.email
  await invoke('sync_reminders', {
    reminders: buildReminders(data),
    email: e.enabled && e.to ? { to: e.to, smtpHost: e.smtpHost, smtpPort: e.smtpPort, username: e.username || e.to } : null,
  })
}

/** Asks for notification permission once, on first launch. */
export async function ensureNotificationPermission() {
  if (!inDesktopApp) return
  const n = await import('@tauri-apps/plugin-notification')
  if (!(await n.isPermissionGranted())) await n.requestPermission()
}
