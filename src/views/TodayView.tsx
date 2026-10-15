import { useState, type RefObject } from 'react'
import { format } from 'date-fns'
import { useStore } from '../store'
import { useUI } from '../ui'
import { compareTasks, goalProgress } from '../lib/goals'
import { fromDay, toDay, toMonth, weekPeriod } from '../lib/dates'
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

/** This month's and this week's goals with progress, so daily work stays tied to them. */
function CurrentGoals() {
  const { data, today } = useStore()
  const { setView } = useUI()
  const month = toMonth(fromDay(today))
  const week = weekPeriod(fromDay(today), data.settings.weekStartsOn)
  const goals = data.goals.filter(
    (g) => !g.archived && ((g.level === 'month' && g.period === month) || (g.level === 'week' && g.period === week)),
  )
  if (goals.length === 0) return null
  goals.sort((a, b) => (a.level === b.level ? 0 : a.level === 'month' ? -1 : 1))
  return (
    <div className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
      {goals.map((g) => {
        const p = goalProgress(g, data)
        const area = data.areas.find((a) => a.id === g.areaId)
        return (
          <button key={g.id} onClick={() => setView({ kind: 'goals' })} className="rounded-lg border border-line p-3 text-left hover:bg-hover">
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
              <Icon name="target" size={12} /> {g.level === 'month' ? 'This month' : 'This week'}
              <span className="ml-auto">{p.pct}%</span>
            </div>
            <div className="mb-2 truncate text-sm font-medium">{g.title}</div>
            <ProgressBar pct={p.pct} color={area?.color} />
          </button>
        )
      })}
    </div>
  )
}
