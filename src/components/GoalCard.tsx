import { useState } from 'react'
import type { Goal, GoalLevel } from '../types'
import { useStore } from '../store'
import { useUI } from '../ui'
import { goalProgress, compareTasks } from '../lib/goals'
import { CHILD_LEVEL, LEVEL_NAME, goalLabel, goalRange, periodFor, rankOf } from '../lib/periods'
import { Icon } from './Icon'
import { TaskList } from './TaskItem'
import { QuickAdd } from './QuickAdd'

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-hover">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color ?? 'var(--accent)' }} />
    </div>
  )
}

/** A goal with its progress; expands to show its smaller goals and its tasks. */
export function GoalCard({ goal, defaultOpen = false }: { goal: Goal; defaultOpen?: boolean }) {
  const { data, today } = useStore()
  const { editGoal } = useUI()
  const [open, setOpen] = useState(defaultOpen)
  const [showDone, setShowDone] = useState(false)
  const area = goal.areaId ? data.areas.find((a) => a.id === goal.areaId) : null
  const p = goalProgress(goal, data)
  const own = data.tasks.filter((t) => t.goalId === goal.id).sort(compareTasks)
  const visible = showDone ? own : own.filter((t) => !t.done)
  const doneCount = own.length - own.filter((t) => !t.done).length
  const children = data.goals
    .filter((g) => g.parentId === goal.id && !g.archived)
    .sort((a, b) => goalRange(a).start.localeCompare(goalRange(b).start) || rankOf(b) - rankOf(a))
  const childLevel = CHILD_LEVEL[goal.level]

  return (
    <div className={`rounded-lg border border-line bg-bg ${goal.archived ? 'opacity-60' : ''}`}>
      <div className="flex cursor-pointer items-start gap-3 p-3" onClick={() => setOpen(!open)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} className="mt-0.5 text-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{goal.title}</span>
            <button
              className="text-muted hover:text-ink"
              onClick={(e) => { e.stopPropagation(); editGoal(goal) }}
              title="Edit goal"
            >
              <Icon name="edit" size={13} />
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
            <span>{LEVEL_NAME[goal.level]} · {goalLabel(goal)}</span>
            {area && (
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: area.color }} />
                {area.name}
              </span>
            )}
            <span>{p.done}/{p.total} tasks · {p.pct}%</span>
          </div>
          <div className="mt-2"><ProgressBar pct={p.pct} color={area?.color} /></div>
        </div>
      </div>

      {open && (
        <div className="border-t border-line px-3 pt-2 pb-3">
          {goal.notes && <p className="mb-2 px-2 text-sm whitespace-pre-wrap text-muted">{goal.notes}</p>}
          {children.length > 0 && (
            <div className="mb-3 space-y-2 pl-2">
              {children.map((c) => <GoalCard key={c.id} goal={c} />)}
            </div>
          )}
          <TaskList tasks={visible} />
          {doneCount > 0 && (
            <button className="btn text-xs text-muted" onClick={() => setShowDone(!showDone)}>
              {showDone ? 'Hide' : 'Show'} {doneCount} completed
            </button>
          )}
          <div className="mt-2 flex gap-2">
            <div className="flex-1">
              <QuickAdd defaults={{ goalId: goal.id, areaId: goal.areaId }} placeholder="Add a task to this goal, e.g. &quot;Write outline mon 10am&quot;" />
            </div>
            {goal.level !== 'week' && (
              <button
                className="btn shrink-0 border border-line"
                title="Break this goal into a smaller goal"
                onClick={() => editGoal({ level: childLevel, period: childPeriod(goal, childLevel, today, data.settings.weekStartsOn), parentId: goal.id, areaId: goal.areaId })}
              >
                <Icon name="plus" size={14} /> {LEVEL_NAME[childLevel]} goal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** The child period that contains today if the goal is running, otherwise the goal's first one. */
function childPeriod(goal: Goal, level: GoalLevel, today: string, weekStartsOn: 0 | 1) {
  const { start, end } = goalRange(goal)
  return periodFor(level, start <= today && today <= end ? today : start, weekStartsOn)
}
