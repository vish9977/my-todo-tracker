import { useState } from 'react'
import { format } from 'date-fns'
import { useStore, uid } from '../store'
import { useUI } from '../ui'
import type { Task, TaskReminder } from '../types'
import { describeReminder, reminderTime } from '../lib/reminders'
import { Icon } from './Icon'

const PRESETS: { label: string; minutes: number }[] = [
  { label: 'At time of task', minutes: 0 },
  { label: '5 minutes before', minutes: 5 },
  { label: '10 minutes before', minutes: 10 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before', minutes: 120 },
  { label: '1 day before', minutes: 1440 },
  { label: '2 days before', minutes: 2880 },
  { label: '1 week before', minutes: 10080 },
]

const UNITS = { minutes: 1, hours: 60, days: 1440 } as const

/** Any number of reminders per task: presets, a custom offset, or an exact date and time. */
export function ReminderEditor({ task, onChange }: { task: Task; onChange: (patch: Partial<Task>) => void }) {
  const { data } = useStore()
  const { setView } = useUI()
  const [mode, setMode] = useState<'' | 'custom' | 'at'>('')
  const [amount, setAmount] = useState(1)
  const [unit, setUnit] = useState<keyof typeof UNITS>('hours')
  const [at, setAt] = useState(() => `${task.date ?? format(new Date(), 'yyyy-MM-dd')}T${task.time ?? '09:00'}`)
  const emailOn = data.settings.email.enabled

  const add = (r: TaskReminder) => {
    const exists = task.reminders.some((x) =>
      x.kind === r.kind && (x.kind === 'before' ? x.minutes === (r as typeof x).minutes : x.at === (r as typeof x).at))
    if (!exists) onChange({ reminders: [...task.reminders, r] })
    setMode('')
  }
  const sorted = [...task.reminders].sort((a, b) => (reminderTime(task, a) ?? 0) - (reminderTime(task, b) ?? 0))

  return (
    <div>
      <span className="label">Reminders</span>
      {sorted.length > 0 && (
        <div className="mb-1.5 space-y-0.5">
          {sorted.map((r) => {
            const when = reminderTime(task, r)
            const past = when !== null && when < Date.now()
            return (
              <div key={r.id} className="group flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-hover">
                <Icon name="bell" size={13} className="text-muted" />
                <span className={`flex-1 ${past ? 'text-muted line-through' : ''}`}>{describeReminder(task, r)}</span>
                <button className="text-muted hover:text-danger" title="Remove reminder" onClick={() => onChange({ reminders: task.reminders.filter((x) => x.id !== r.id) })}>
                  <Icon name="x" size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <select
        className="field"
        value=""
        onChange={(e) => {
          const v = e.target.value
          if (v === 'custom' || v === 'at') setMode(v)
          else if (v) add({ id: uid(), kind: 'before', minutes: Number(v) })
        }}
      >
        <option value="">{task.reminders.length ? '+ Add another reminder' : '+ Add a reminder'}</option>
        <optgroup label={task.time ? 'Before the task' : 'Before the task (set a time first)'}>
          {PRESETS.map((p) => (
            <option key={p.minutes} value={p.minutes} disabled={!task.time}>{p.label}</option>
          ))}
          <option value="custom" disabled={!task.time}>Custom time before…</option>
        </optgroup>
        <option value="at">On a specific date and time…</option>
      </select>

      {mode === 'custom' && (
        <div className="mt-2 flex items-center gap-2">
          <input type="number" min={1} className="field w-20" value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))} />
          <select className="field w-28" value={unit} onChange={(e) => setUnit(e.target.value as keyof typeof UNITS)}>
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
          <span className="text-sm text-muted">before</span>
          <button className="btn-primary ml-auto" onClick={() => add({ id: uid(), kind: 'before', minutes: amount * UNITS[unit] })}>Add</button>
        </div>
      )}
      {mode === 'at' && (
        <div className="mt-2 flex items-center gap-2">
          <input type="datetime-local" className="field" value={at} onChange={(e) => setAt(e.target.value)} />
          <button className="btn-primary" disabled={!at} onClick={() => add({ id: uid(), kind: 'at', at })}>Add</button>
        </div>
      )}

      {task.reminders.length > 0 && (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="flex-1">Repeat until done</span>
            <select
              className="field w-40"
              value={task.nagMinutes ?? ''}
              onChange={(e) => onChange({ nagMinutes: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Don't repeat</option>
              <option value={5}>Every 5 min</option>
              <option value={10}>Every 10 min</option>
              <option value={15}>Every 15 min</option>
              <option value={30}>Every 30 min</option>
              <option value={60}>Every hour</option>
            </select>
          </label>
          {emailOn ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={task.emailReminder ?? true} onChange={(e) => onChange({ emailReminder: e.target.checked })} />
              Also email me
            </label>
          ) : (
            <p className="text-xs text-muted">
              Want these by email too?{' '}
              <button className="text-accent underline" onClick={() => setView({ kind: 'settings' })}>Set up email reminders</button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
