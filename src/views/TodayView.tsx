import { useState, type RefObject } from 'react'
import { format } from 'date-fns'
import { useStore } from '../store'
import { useUI } from '../ui'
import { compareTasks, goalProgress } from '../lib/goals'
import { fromDay, toDay } from '../lib/dates'
import { goalRange, isActiveOn, rankOf } from '../lib/periods'
import type { GoalLevel } from '../types'
import { QuickAdd } from '../components/QuickAdd'
import { Section, TaskList } from '../components/TaskItem'
import { ProgressBar } from '../components/GoalCard'
import { Icon } from '../components/Icon'

export function TodayView({ quickAddRef }: { quickAddRef: RefObject<HTMLInputElement | null> }) {
  const { data, today } = useStore()
  const [showDone, setShowDone] = useState(false)
  const open = data.tasks.filter((t) => !t.done)
  const overdue = open.filter((t) => t.date && t.date < today).sort(compareTasks)
  const todays = open.filter((t) => t.date === today).sort(compareTasks)
  const doneToday = data.tasks.filter((t) => t.done && t.doneAt && toDay(new Date(t.doneAt)) === today)
  const total = todays.length + doneToday.length

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm text-muted">
          {format(new Date(), 'EEEE, d MMMM')}
          {total > 0 && ` · ${doneToday.length} of ${total} done`}
        </p>
      </header>

      <CurrentGoals />

      <div className="mb-6">
        <QuickAdd ref={quickAddRef} defaults={{ date: today }} />
      </div>

      {overdue.length > 0 && (
        <Section title="Overdue" count={overdue.length}>
          <TaskList tasks={overdue} />
        </Section>
      )}
      <Section title="Today" count={todays.length}>
        <TaskList tasks={todays} showDate={false} empty="Nothing planned for today. Add a task above." />
      </Section>
      {doneToday.length > 0 && (
        <Section
          title="Completed today"
          count={doneToday.length}
          right={<button className="btn py-0.5 text-xs text-muted" onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'}</button>}
        >
          {showDone && <TaskList tasks={doneToday} showDate={false} />}
        </Section>
      )}
    </div>
  )
}

const NOW_LABEL: Record<GoalLevel, string> = {
  year: 'This year',
  half: 'These 6 months',
  quarter: 'This quarter',
  month: 'This month',
  week: 'This week',
  custom: '',
}
const MAX_CARDS = 6

/** Goals running today (biggest first) with progress, so daily work stays tied to them. */
function CurrentGoals() {
  const { data, today } = useStore()
  const { setView } = useUI()
  const goals = data.goals
    .filter((g) => !g.archived && isActiveOn(g, today))
    .sort((a, b) => rankOf(b) - rankOf(a))
  if (goals.length === 0) return null
  return (
    <div className="mb-5">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
        {goals.slice(0, MAX_CARDS).map((g) => {
          const p = goalProgress(g, data)
          const area = data.areas.find((a) => a.id === g.areaId)
          return (
            <button key={g.id} onClick={() => setView({ kind: 'goals' })} className="rounded-lg border border-line p-3 text-left hover:bg-hover">
              <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
                <Icon name="target" size={12} />
                {g.level === 'custom' ? `Until ${format(fromDay(goalRange(g).end), 'd MMM')}` : NOW_LABEL[g.level]}
                <span className="ml-auto">{p.pct}%</span>
              </div>
              <div className="mb-2 truncate text-sm font-medium">{g.title}</div>
              <ProgressBar pct={p.pct} color={area?.color} />
            </button>
          )
        })}
      </div>
      {goals.length > MAX_CARDS && (
        <button className="btn mt-1 text-xs text-muted" onClick={() => setView({ kind: 'goals' })}>
          +{goals.length - MAX_CARDS} more goals
        </button>
      )}
    </div>
  )
}
