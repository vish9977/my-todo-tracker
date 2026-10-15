import { invoke } from '@tauri-apps/api/core'
import { format } from 'date-fns'
import type { AppData } from '../types'
import { inDesktopApp } from './storage'

export interface BackupFile {
  app: 'MyTodoTracker'
  version: 1
  exportedAt: string
  data: AppData
}

export function toBackup(data: AppData): string {
  const file: BackupFile = { app: 'MyTodoTracker', version: 1, exportedAt: new Date().toISOString(), data }
  return JSON.stringify(file, null, 2)
}

export function parseBackup(text: string): AppData {
  const file = JSON.parse(text) as BackupFile
  if (file.app !== 'MyTodoTracker' || !file.data || !Array.isArray(file.data.tasks) || !Array.isArray(file.data.goals))
    throw new Error('This is not a MyTodoTracker backup file.')
  return file.data
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(data: AppData): string {
  const area = new Map(data.areas.map((a) => [a.id, a.name]))
  const goal = new Map(data.goals.map((g) => [g.id, g.title]))
  const header = ['Title', 'Date', 'Time', 'Done', 'Completed at', 'Priority', 'Area', 'Goal', 'Repeat', 'Notes', 'Checklist']
  const rows = data.tasks.map((t) => [
    t.title, t.date, t.time, t.done ? 'yes' : 'no', t.doneAt, `P${t.priority}`,
    t.areaId ? area.get(t.areaId) : '', t.goalId ? goal.get(t.goalId) : '', t.recurrence?.type ?? '',
    t.notes, t.subtasks.map((s) => `${s.done ? '[x]' : '[ ]'} ${s.title}`).join('; '),
  ])
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

/** Saves text to a file the user picks. Returns false if they cancelled. */
export async function saveTextFile(defaultName: string, contents: string, ext: 'json' | 'csv'): Promise<boolean> {
  if (!inDesktopApp) {
    const url = URL.createObjectURL(new Blob([contents], { type: ext === 'json' ? 'application/json' : 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: defaultName })
    a.click()
    URL.revokeObjectURL(url)
    return true
  }
  const { save } = await import('@tauri-apps/plugin-dialog')
  const path = await save({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
  if (!path) return false
  await invoke('write_text_file', { path, contents })
  return true
}

/** Lets the user pick a JSON file and returns its text, or null if cancelled. */
export async function openTextFile(): Promise<string | null> {
  if (!inDesktopApp) {
    return new Promise((resolve) => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' })
      input.onchange = () => (input.files?.[0] ? input.files[0].text().then(resolve) : resolve(null))
      input.click()
    })
  }
  const { open } = await import('@tauri-apps/plugin-dialog')
  const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] })
  if (!path) return null
  return invoke<string>('read_text_file', { path })
}

export const backupName = (ext: string) => `mytodotracker-${format(new Date(), 'yyyy-MM-dd')}.${ext}`
