import { invoke } from '@tauri-apps/api/core'
import type { AppData, EmailSettings, Person, Task } from '../types'
import { prettyDay, prettyTime } from './dates'
import { describeRecurrence } from './recurrence'
import { inDesktopApp } from './storage'

const config = (e: EmailSettings) => ({ to: e.to, smtpHost: e.smtpHost, smtpPort: e.smtpPort, username: e.username || e.to })

export const emailReady = (e: EmailSettings) => inDesktopApp && e.enabled && !!e.to

export async function saveEmailPassword(password: string) {
  await invoke('set_email_password', { password })
}

export async function hasEmailPassword(): Promise<boolean> {
  return inDesktopApp ? invoke<boolean>('has_email_password') : false
}

export async function sendTestEmail(e: EmailSettings) {
  await invoke('send_test_email', { config: config(e) })
}

export async function sendEmail(e: EmailSettings, to: string, subject: string, body: string) {
  await invoke('send_email', { config: config(e), to, subject, body })
}

/** The email a person gets when a task is assigned to them. */
export function assignmentEmail(task: Task, person: Person, data: AppData) {
  const from = data.settings.email.username || data.settings.email.to
  const goal = task.goalId ? data.goals.find((g) => g.id === task.goalId) : null
  const lines = [
    `Hi ${person.name},`,
    '',
    `You've been assigned a task:`,
    '',
    `  ${task.title}`,
  ]
  if (task.date) lines.push(`  Due: ${prettyDay(task.date)}${task.time ? ` at ${prettyTime(task.time)}` : ''}`)
  if (task.recurrence) lines.push(`  Repeats: ${describeRecurrence(task.recurrence)}`)
  if (task.priority < 4) lines.push(`  Priority: P${task.priority}`)
  if (goal) lines.push(`  Goal: ${goal.title}`)
  if (task.notes.trim()) lines.push('', 'Notes:', task.notes.trim())
  if (task.subtasks.length) lines.push('', 'Checklist:', ...task.subtasks.map((s) => `  ${s.done ? '[x]' : '[ ]'} ${s.title}`))
  lines.push('', `Reply to ${from} with any questions.`, '', 'Sent from MyTodoTracker')
  return { subject: `Task for you: ${task.title}`, body: lines.join('\n') }
}
