import { useEffect, useState } from 'react'
import { useStore, uid } from '../store'
import { useUI } from '../ui'
import type { Priority, Recurrence, RecurrenceType, Task } from '../types'
import { Icon } from './Icon'
import { ReminderEditor } from './ReminderEditor'
import { AssigneePicker } from './AssigneePicker'
import { fromDay, toDay, todayStr } from '../lib/dates'
import { LEVELS, LEVEL_NAME, goalLabel, goalRange } from '../lib/periods'
import { addDays, format, parseISO } from 'date-fns'

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function TaskDetail() {
  const { data, updateTask, deleteTask } = useStore()
  const { selectedTaskId, selectTask } = useUI()
  const task = data.tasks.find((t) => t.id === selectedTaskId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))
        selectTask(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectTask])

  if (!task) return null
  const set = (patch: Partial<Task>) => updateTask(task.id, patch)

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-line bg-bg">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="text-xs text-muted">Task</span>
        <button className="btn ml-auto text-danger" onClick={() => { deleteTask(task.id); selectTask(null) }} title="Delete task">
          <Icon name="trash" size={15} />
        </button>
        <button className="btn" onClick={() => selectTask(null)} title="Close (Esc)">
          <Icon name="x" size={15} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <DraftInput
          key={`title-${task.id}`}
          value={task.title}
          onCommit={(title) => title.trim() && set({ title: title.trim() })}
          className="w-full bg-transparent text-lg font-semibold outline-none"
        />
        <DraftInput
          key={`notes-${task.id}`}
          multiline
          value={task.notes}
          onCommit={(notes) => set({ notes })}
          placeholder="Notes, links, ideas…"
          className="field min-h-20 resize-y text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Date</span>
            <input type="date" className="field" value={task.date ?? ''} onChange={(e) => set({ date: e.target.value || null })} />
          </label>
          <label>
            <span className="label">Time</span>
            <input type="time" className="field" value={task.time ?? ''} onChange={(e) => set({ time: e.target.value || null, date: task.date ?? (e.target.value ? todayStr() : null) })} />
          </label>
        </div>

        <ReminderEditor task={task} onChange={set} />

        <RepeatPicker task={task} onChange={(recurrence) => set({ recurrence })} />

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Priority</span>
            <select className="field" value={task.priority} onChange={(e) => set({ priority: Number(e.target.value) as Priority })}>
              <option value={1}>P1 Urgent</option>
              <option value={2}>P2 High</option>
              <option value={3}>P3 Medium</option>
              <option value={4}>P4 None</option>
            </select>
          </label>
          <label>
            <span className="label">Area</span>
            <select className="field" value={task.areaId ?? ''} onChange={(e) => set({ areaId: e.target.value || null })}>
              <option value="">None</option>
              {data.areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>

        <GoalPicker task={task} onChange={(goalId) => {
          const goal = data.goals.find((g) => g.id === goalId)
          set({ goalId, ...(goal?.areaId && !task.areaId ? { areaId: goal.areaId } : {}) })
        }} />

        <AssigneePicker task={task} onChange={set} />

        <Subtasks task={task} onChange={(subtasks) => set({ subtasks })} />

        <p className="pt-2 text-xs text-muted">
          Created {format(parseISO(task.createdAt), 'd MMM yyyy, h:mm a')}
          {task.doneAt && ` · Completed ${format(parseISO(task.doneAt), 'd MMM, h:mm a')}`}
        </p>
      </div>
    </aside>
  )
}

/** Text input that saves on blur / Enter instead of on every keystroke. */
function DraftInput({ value, onCommit, multiline, ...rest }: {
  value: string
  onCommit: (v: string) => void
  multiline?: boolean
  className?: string
  placeholder?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => draft !== value && onCommit(draft)
  return multiline ? (
    <textarea {...rest} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
  ) : (
    <input
      {...rest}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

function RepeatPicker({ task, onChange }: { task: Task; onChange: (r: Recurrence | null) => void }) {
  const rec = task.recurrence
  return (
    <div>
      <span className="label">Repeat</span>
      <select
        className="field"
        value={rec?.type ?? ''}
        onChange={(e) => {
          const type = e.target.value as RecurrenceType | ''
          if (!type) return onChange(null)
          const day = task.date ? parseISO(task.date).getDay() : new Date().getDay()
          onChange(type === 'custom' ? { type, days: [day] } : { type })
        }}
      >
        <option value="">Does not repeat</option>
        <option value="daily">Every day</option>
        <option value="weekdays">Every weekday (Mon–Fri)</option>
        <option value="weekly">Every week</option>
        <option value="monthly">Every month</option>
        <option value="custom">Custom days…</option>
      </select>
      {rec?.type === 'custom' && (
        <div className="mt-2 flex gap-1">
          {DAY_LETTERS.map((l, i) => {
            const on = rec.days?.includes(i)
            return (
              <button
                key={i}
                className={`size-8 rounded-full text-xs ${on ? 'bg-accent text-white' : 'border border-line hover:bg-hover'}`}
                onClick={() => {
                  const days = on ? (rec.days ?? []).filter((d) => d !== i) : [...(rec.days ?? []), i]
                  onChange({ type: 'custom', days })
                }}
              >
                {l}
              </button>
            )
          })}
        </div>
      )}
      {rec && !task.date && <span className="mt-1 block text-xs text-muted">Set a date so the task can repeat.</span>}
    </div>
  )
}

function GoalPicker({ task, onChange }: { task: Task; onChange: (goalId: string | null) => void }) {
  const { data, today } = useStore()
  // Goals still running (or ended within the last month), plus whatever the task is already linked to.
  const recent = toDay(addDays(fromDay(today), -31))
  const goals = data.goals.filter((g) => g.id === task.goalId || (!g.archived && goalRange(g).end >= recent))
  return (
    <label className="block">
      <span className="label">Goal</span>
      <select className="field" value={task.goalId ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">No goal</option>
        {LEVELS.map((level) => {
          const group = goals.filter((g) => g.level === level).sort((a, b) => a.period.localeCompare(b.period))
          if (group.length === 0) return null
          return (
            <optgroup key={level} label={`${LEVEL_NAME[level]} goals`}>
              {group.map((g) => (
                <option key={g.id} value={g.id}>{g.title} · {goalLabel(g)}</option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </label>
  )
}

function Subtasks({ task, onChange }: { task: Task; onChange: (s: Task['subtasks']) => void }) {
  const [text, setText] = useState('')
  const add = () => {
    if (!text.trim()) return
    onChange([...task.subtasks, { id: uid(), title: text.trim(), done: false }])
    setText('')
  }
  return (
    <div>
      <span className="label">Checklist</span>
      <div className="space-y-0.5">
        {task.subtasks.map((s) => (
          <div key={s.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-hover">
            <input
              type="checkbox"
              checked={s.done}
              onChange={() => onChange(task.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
              className="accent-[var(--accent)]"
            />
            <span className={`flex-1 text-sm ${s.done ? 'text-muted line-through' : ''}`}>{s.title}</span>
            <button className="invisible text-muted group-hover:visible" onClick={() => onChange(task.subtasks.filter((x) => x.id !== s.id))}>
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
      <input
        className="field mt-1 text-sm"
        placeholder="Add a step and press Enter"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />
    </div>
  )
}
