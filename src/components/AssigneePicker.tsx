import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useStore } from '../store'
import { useUI } from '../ui'
import type { Task } from '../types'
import { assignmentEmail, emailReady, sendEmail } from '../lib/mail'
import { Icon } from './Icon'

/** Assign a task to someone and email them the details. */
export function AssigneePicker({ task, onChange }: { task: Task; onChange: (patch: Partial<Task>) => void }) {
  const { data } = useStore()
  const { setView } = useUI()
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const person = data.settings.people.find((p) => p.id === task.assigneeId)
  const canEmail = emailReady(data.settings.email)

  const send = async () => {
    if (!person) return
    setBusy(true)
    setStatus(null)
    try {
      const { subject, body } = assignmentEmail(task, person, data)
      await sendEmail(data.settings.email, person.email, subject, body)
      onChange({ assigneeEmailedAt: new Date().toISOString() })
      setStatus({ ok: true, text: `Emailed ${person.name}.` })
    } catch (e) {
      setStatus({ ok: false, text: String(e) })
    } finally {
      setBusy(false)
    }
  }

  if (data.settings.people.length === 0) {
    return (
      <div>
        <span className="label">Assigned to</span>
        <p className="text-xs text-muted">
          Nobody yet.{' '}
          <button className="text-accent underline" onClick={() => setView({ kind: 'settings' })}>Add people in Settings</button>{' '}
          to assign tasks and email them.
        </p>
      </div>
    )
  }

  return (
    <div>
      <span className="label">Assigned to</span>
      <select
        className="field"
        value={task.assigneeId ?? ''}
        onChange={(e) => {
          setStatus(null)
          onChange({ assigneeId: e.target.value || null, assigneeEmailedAt: null, remindAssignee: false })
        }}
      >
        <option value="">Me</option>
        {data.settings.people.map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
        ))}
      </select>
      {person && (
        <div className="mt-2 space-y-2">
          {canEmail ? (
            <>
              <div className="flex items-center gap-2">
                <button className="btn border border-line" disabled={busy} onClick={send}>
                  <Icon name="mail" size={14} /> {busy ? 'Sending…' : task.assigneeEmailedAt ? 'Email again' : `Email task to ${person.name}`}
                </button>
                {task.assigneeEmailedAt && !status && (
                  <span className="text-xs text-muted">Sent {format(parseISO(task.assigneeEmailedAt), 'd MMM, h:mm a')}</span>
                )}
              </div>
              {task.reminders.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={task.remindAssignee} onChange={(e) => onChange({ remindAssignee: e.target.checked })} />
                  Email {person.name} the reminders too
                </label>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">
              <button className="text-accent underline" onClick={() => setView({ kind: 'settings' })}>Set up email</button> to send this task to {person.name}.
            </p>
          )}
          {status && <p className={`text-xs ${status.ok ? 'text-accent' : 'text-danger'}`}>{status.text}</p>}
        </div>
      )}
    </div>
  )
}
