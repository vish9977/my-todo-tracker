import { useState } from 'react'
import { useStore } from '../store'
import { compareTasks } from '../lib/goals'
import { QuickAdd } from '../components/QuickAdd'
import { Section, TaskList } from '../components/TaskItem'
import { GoalCard } from '../components/GoalCard'

export function AreaView({ id }: { id: string }) {
  const { data, today } = useStore()
  const [showDone, setShowDone] = useState(false)
  const area = data.areas.find((a) => a.id === id)
  if (!area) return <p className="text-muted">This area was deleted.</p>

  const tasks = data.tasks.filter((t) => t.areaId === id)
  const open = tasks.filter((t) => !t.done).sort(compareTasks)
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  const goals = data.goals.filter((g) => g.areaId === id && !g.archived && g.level === 'month' && g.period >= today.slice(0, 7))

  return (
    <div>
      <header className="mb-5 flex items-center gap-3">
        <span className="size-3 rounded-full" style={{ background: area.color }} />
        <h1 className="text-2xl font-semibold">{area.name}</h1>
        <span className="text-sm text-muted">{open.length} open</span>
      </header>
      <div className="mb-6">
        <QuickAdd defaults={{ areaId: id }} placeholder={`Add a ${area.name} task, e.g. "Research keywords fri"`} />
      </div>
      {goals.length > 0 && (
        <Section title="Current goals">
          <div className="space-y-2">{goals.map((g) => <GoalCard key={g.id} goal={g} />)}</div>
        </Section>
      )}
      <Section title="Tasks" count={open.length}>
        <TaskList tasks={open} empty="No open tasks here." />
      </Section>
      {done.length > 0 && (
        <Section
          title="Completed"
          count={done.length}
          right={<button className="btn py-0.5 text-xs text-muted" onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'}</button>}
        >
          {showDone && <TaskList tasks={done.slice(0, 100)} />}
        </Section>
      )}
    </div>
  )
}
