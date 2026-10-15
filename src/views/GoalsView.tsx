import { useState } from 'react'
import { addMonths, parseISO } from 'date-fns'
import { useStore } from '../store'
import { useUI } from '../ui'
import { prettyMonth, prettyWeek, toMonth, weekPeriod, weeksInMonth, fromDay } from '../lib/dates'
import { Icon } from '../components/Icon'
import { GoalCard } from '../components/GoalCard'

export function GoalsView() {
  const { data, today } = useStore()
  const { editGoal } = useUI()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [showArchived, setShowArchived] = useState(false)
  const ws = data.settings.weekStartsOn
  const visible = (archived: boolean) => showArchived || !archived

  const monthGoals = data.goals.filter((g) => g.level === 'month' && g.period === month && visible(g.archived))
  const weeks = weeksInMonth(month, ws)
  // Week goals not tied to a monthly goal, listed by week.
  const looseWeekGoals = data.goals.filter((g) => g.level === 'week' && !g.parentId && weeks.includes(g.period) && visible(g.archived))
  const archivedCount = data.goals.filter((g) => g.archived && (g.period.startsWith(month) || weeks.includes(g.period))).length
  const currentWeek = weekPeriod(fromDay(today), ws)
  const shift = (n: number) => setMonth(toMonth(addMonths(parseISO(`${month}-01`), n)))

  return (
    <div>
      <header className="mb-5 flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Goals</h1>
          <p className="text-sm text-muted">Monthly goals, broken into weekly goals and dated tasks.</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn" onClick={() => shift(-1)}><Icon name="chevronLeft" /></button>
          <span className="w-32 text-center font-medium">{prettyMonth(month)}</span>
          <button className="btn" onClick={() => shift(1)}><Icon name="chevronRight" /></button>
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[13px] font-semibold">Monthly goals</h2>
        <button className="btn-primary ml-auto" onClick={() => editGoal({ level: 'month', period: month })}>
          <Icon name="plus" size={14} /> Monthly goal
        </button>
      </div>
      <div className="mb-8 space-y-2">
        {monthGoals.length === 0 && (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
            No goals for {prettyMonth(month)} yet. Start with one or two big outcomes, like "Launch the new blog" or "Post 8 YouTube videos".
          </p>
        )}
        {monthGoals.map((g) => <GoalCard key={g.id} goal={g} defaultOpen={monthGoals.length <= 2} />)}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[13px] font-semibold">Other weekly goals</h2>
        <button
          className="btn ml-auto border border-line"
          onClick={() => editGoal({ level: 'week', period: weeks.includes(currentWeek) ? currentWeek : weeks[0] })}
        >
          <Icon name="plus" size={14} /> Weekly goal
        </button>
      </div>
      <div className="space-y-4">
        {weeks.map((w) => {
          const goals = looseWeekGoals.filter((g) => g.period === w)
          if (goals.length === 0) return null
          return (
            <div key={w}>
              <div className="mb-1.5 text-xs font-medium text-muted">
                {prettyWeek(w)} {w === currentWeek && <span className="text-accent">· this week</span>}
              </div>
              <div className="space-y-2">{goals.map((g) => <GoalCard key={g.id} goal={g} />)}</div>
            </div>
          )
        })}
        {looseWeekGoals.length === 0 && (
          <p className="text-sm text-muted">Weekly goals added inside a monthly goal show up under it. Use this for weekly goals that stand alone.</p>
        )}
      </div>

      {archivedCount > 0 && (
        <button className="btn mt-6 text-xs text-muted" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? 'Hide' : 'Show'} {archivedCount} archived
        </button>
      )}
    </div>
  )
}
