import type { Task } from '../types'
import { useStore } from '../store'
import { prettyDay, prettyTime } from '../lib/dates'
import { Icon } from './Icon'
import { useUI } from '../ui'

const PRIORITY_COLOR: Record<number, string> = {
  1: '#dc2626',
  2: '#ea580c',
  3: '#2563eb',
  4: 'var(--muted)',
}

export function TaskItem({ task, showDate = true }: { task: Task; showDate?: boolean }) {
  const { data, today, toggleTask } = useStore()
  const { selectedTaskId, selectTask } = useUI()
  const area = task.areaId ? data.areas.find((a) => a.id === task.areaId) : null
  const goal = task.goalId ? data.goals.find((g) => g.id === task.goalId) : null
  const assignee = task.assigneeId ? data.settings.people.find((p) => p.id === task.assigneeId) : null
  const overdue = !task.done && task.date && task.date < today
  const subDone = task.subtasks.filter((s) => s.done).length
  const selected = selectedTaskId === task.id

  return (
    <div
      onClick={() => selectTask(task.id)}
      className={`group flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 ${selected ? 'bg-accent-soft' : 'hover:bg-hover'}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleTask(task.id)
        }}
        aria-label={task.done ? 'Mark not done' : 'Mark done'}
        className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]"
        style={{
          borderColor: PRIORITY_COLOR[task.priority],
          background: task.done ? PRIORITY_COLOR[task.priority] : task.priority < 4 ? `${PRIORITY_COLOR[task.priority]}14` : undefined,
        }}
      >
        {task.done && <Icon name="check" size={12} className="text-white" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`leading-snug ${task.done ? 'text-muted line-through' : ''}`}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted empty:hidden">
          {showDate && task.date && (
            <span className={overdue ? 'text-danger' : task.date === today ? 'text-accent' : ''}>
              {prettyDay(task.date, today)}
            </span>
          )}
          {task.time && (
            <span className="inline-flex items-center gap-1">
              {task.reminders.length > 0 && <Icon name="bell" size={11} />}
              {prettyTime(task.time)}
            </span>
          )}
          {!task.time && task.reminders.length > 0 && <Icon name="bell" size={11} />}
          {task.recurrence && <Icon name="repeat" size={12} />}
          {task.subtasks.length > 0 && (
            <span>
              {subDone}/{task.subtasks.length}
            </span>
          )}
          {task.notes && <Icon name="list" size={12} />}
          {assignee && (
            <span className="inline-flex items-center gap-1 text-accent">
              <Icon name="user" size={11} />
              {assignee.name}
            </span>
          )}
          {goal && (
            <span className="inline-flex max-w-48 items-center gap-1 truncate">
              <Icon name="target" size={11} />
              {goal.title}
            </span>
          )}
          {area && (
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: area.color }} />
              {area.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function TaskList({ tasks, showDate = true, empty }: { tasks: Task[]; showDate?: boolean; empty?: string }) {
  if (tasks.length === 0) return empty ? <p className="px-2 py-3 text-sm text-muted">{empty}</p> : null
  return (
    <div className="flex flex-col">
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} showDate={showDate} />
      ))}
    </div>
  )
}

export function Section({ title, count, children, right }: { title: string; count?: number; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-1 flex items-center gap-2 border-b border-line px-2 pb-1.5">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {count !== undefined && <span className="text-xs text-muted">{count}</span>}
        <div className="ml-auto">{right}</div>
      </div>
      {children}
    </section>
  )
}
