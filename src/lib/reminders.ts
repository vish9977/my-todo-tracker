import { invoke } from '@tauri-apps/api/core'
import { addDays } from 'date-fns'
import type { AppData } from '../types'
import { dateTimeMs, fromDay, prettyTime, toDay, todayStr } from './dates'
import { inDesktopApp } from './storage'

export interface ReminderItem {
  key: string
  title: string
  body: string
  atMs: number
}

/** Upcoming notifications: task reminders plus the daily summary for the next few days. */
export function buildReminders(data: AppData, now = Date.now()): ReminderItem[] {
  const out: ReminderItem[] = []
  const areaName = new Map(data.areas.map((a) => [a.id, a.name]))
  const goalTitle = new Map(data.goals.map((g) => [g.id, g.title]))

  for (const t of data.tasks) {
    if (t.done || !t.date || !t.time || t.remindBefore === null) continue
    const atMs = dateTimeMs(t.date, t.time) - t.remindBefore * 60_000
    if (atMs < now - 10 * 60_000) continue
    const parts = [
      t.remindBefore > 0 ? `Due at ${prettyTime(t.time)}` : `Now · ${prettyTime(t.time)}`,
      t.areaId ? areaName.get(t.areaId) : null,
      t.goalId ? goalTitle.get(t.goalId) : null,
    ].filter(Boolean)
    out.push({ key: `${t.id}@${atMs}`, title: t.title, body: parts.join(' · '), atMs })
  }

  const summaryTime = data.settings.dailySummaryTime
  if (summaryTime) {
    const today = todayStr()
    for (let i = 0; i < 3; i++) {
      const day = toDay(addDays(fromDay(today), i))
      const atMs = dateTimeMs(day, summaryTime)
      if (atMs < now - 10 * 60_000) continue
      const due = data.tasks.filter((t) => !t.done && t.date && t.date <= day)
      if (due.length === 0) continue
      const overdue = due.filter((t) => t.date! < day).length
      const body =
        `${due.length} task${due.length === 1 ? '' : 's'} today` +
        (overdue ? ` (${overdue} overdue)` : '') +
        ': ' +
        due.slice(0, 3).map((t) => t.title).join(', ') +
        (due.length > 3 ? '…' : '')
      out.push({ key: `summary@${atMs}`, title: 'Your plan for today', body, atMs })
    }
  }
  return out.sort((a, b) => a.atMs - b.atMs)
}

export async function syncReminders(data: AppData) {
  if (!inDesktopApp) return
  await invoke('sync_reminders', { reminders: buildReminders(data) })
}

/** Asks for notification permission once, on first launch. */
export async function ensureNotificationPermission() {
  if (!inDesktopApp) return
  const n = await import('@tauri-apps/plugin-notification')
  if (!(await n.isPermissionGranted())) await n.requestPermission()
}
