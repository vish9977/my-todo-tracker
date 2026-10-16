import { useState } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui'
import { compareTasks } from '../lib/goals'
import { Section, TaskList } from '../components/TaskItem'
import { Icon } from '../components/Icon'
import { LEVEL_NAME, goalLabel } from '../lib/periods'

type Filter = 'open' | 'all' | 'done'

export function SearchView() {
  const { data } = useStore()
  const { editGoal } = useUI()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('open')
  const [areaId, setAreaId] = useState('')
  const [priority, setPriority] = useState('')
  const [assignee, setAssignee] = useState('')

  const needle = q.trim().toLowerCase()
  const matches = (s: string) => s.toLowerCase().includes(needle)
  const tasks = data.tasks
    .filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done))
    .filter((t) => !areaId || t.areaId === areaId)
    .filter((t) => !priority || t.priority === Number(priority))
    .filter((t) => !assignee || (assignee === 'me' ? !t.assigneeId : t.assigneeId === assignee))
    .filter((t) => !needle || matches(t.title) || matches(t.notes) || t.subtasks.some((s) => matches(s.title)))
    .sort(compareTasks)
  const goals = needle ? data.goals.filter((g) => matches(g.title) || matches(g.notes)) : []
  const active = needle || areaId || priority || assignee

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Search</h1>
      </header>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-line px-3 focus-within:border-accent">
        <Icon name="search" className="text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tasks, notes, checklists and goals"
          className="w-full bg-transparent py-2.5 outline-none"
        />
      </div>
      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <select className="field w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="open">Open tasks</option>
          <option value="done">Completed</option>
          <option value="all">All tasks</option>
        </select>
        <select className="field w-auto" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          <option value="">All areas</option>
          {data.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className="field w-auto" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Any priority</option>
          <option value="1">P1</option>
          <option value="2">P2</option>
          <option value="3">P3</option>
          <option value="4">P4</option>
        </select>
        {data.settings.people.length > 0 && (
          <select className="field w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            {data.settings.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {goals.length > 0 && (
        <Section title="Goals" count={goals.length}>
          {goals.map((g) => (
            <button key={g.id} onClick={() => editGoal(g)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-hover">
              <Icon name="target" size={14} className="text-muted" />
              <span className="flex-1">{g.title}</span>
              <span className="text-xs text-muted">{LEVEL_NAME[g.level]} · {goalLabel(g)}</span>
            </button>
          ))}
        </Section>
      )}
      {active ? (
        <Section title="Tasks" count={tasks.length}>
          <TaskList tasks={tasks.slice(0, 200)} empty="No matching tasks." />
        </Section>
      ) : (
        <p className="text-sm text-muted">Type to search, or pick a filter.</p>
      )}
    </div>
  )
}
