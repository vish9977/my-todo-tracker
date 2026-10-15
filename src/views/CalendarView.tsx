import { useState } from 'react'
import { addDays, addMonths, endOfMonth, format, isSameMonth, startOfMonth } from 'date-fns'
import { useStore } from '../store'
import { compareTasks } from '../lib/goals'
import { fromDay, prettyDay, toDay, toMonth, weekStart } from '../lib/dates'
import { Icon } from '../components/Icon'
import { QuickAdd } from '../components/QuickAdd'
import { Section, TaskList } from '../components/TaskItem'
import { useUI } from '../ui'

export function CalendarView() {
  const { data, today } = useStore()
  const { selectTask } = useUI()
  const [month, setMonth] = useState(() => startOfMonth(fromDay(today)))
  const [selected, setSelected] = useState(today)
  const ws = data.settings.weekStartsOn
  const areaColor = new Map(data.areas.map((a) => [a.id, a.color]))

  const start = weekStart(month, ws)
  const end = endOfMonth(month)
  const cells: string[] = []
  for (let d = start; d <= end || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(toDay(d))

  const byDay = new Map<string, typeof data.tasks>()
  for (const t of data.tasks) {
    if (!t.date) continue
    byDay.set(t.date, [...(byDay.get(t.date) ?? []), t])
  }
  const weekdayNames = Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'EEE'))
  const monthGoals = data.goals.filter((g) => g.level === 'month' && g.period === toMonth(month) && !g.archived)
  const selectedTasks = (byDay.get(selected) ?? []).slice().sort(compareTasks)

  return (
    <div>
      <header className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{format(month, 'MMMM yyyy')}</h1>
        <div className="ml-auto flex items-center gap-1">
          <button className="btn" onClick={() => setMonth(addMonths(month, -1))}><Icon name="chevronLeft" /></button>
          <button className="btn" onClick={() => { setMonth(startOfMonth(fromDay(today))); setSelected(today) }}>Today</button>
          <button className="btn" onClick={() => setMonth(addMonths(month, 1))}><Icon name="chevronRight" /></button>
        </div>
      </header>

      {monthGoals.length > 0 && (
        <p className="mb-3 text-sm text-muted">
          <Icon name="target" size={13} className="mr-1 inline" />
          {monthGoals.map((g) => g.title).join(' · ')}
        </p>
      )}

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-line">
        {weekdayNames.map((n) => (
          <div key={n} className="border-b border-line bg-panel px-2 py-1.5 text-xs font-medium text-muted">{n}</div>
        ))}
        {cells.map((day, i) => {
          const tasks = (byDay.get(day) ?? []).slice().sort(compareTasks)
          const inMonth = isSameMonth(fromDay(day), month)
          const isSel = day === selected
          return (
            <div
              key={day}
              onClick={() => setSelected(day)}
              className={`min-h-24 cursor-pointer border-line p-1.5 text-xs ${i % 7 ? 'border-l' : ''} ${i >= 7 ? 'border-t' : ''} ${isSel ? 'bg-accent-soft' : 'hover:bg-hover'} ${inMonth ? '' : 'opacity-45'}`}
            >
              <div className={`mb-1 inline-grid size-6 place-items-center rounded-full ${day === today ? 'bg-accent font-semibold text-white' : ''}`}>
                {fromDay(day).getDate()}
              </div>
              {tasks.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  onClick={(e) => { e.stopPropagation(); setSelected(day); selectTask(t.id) }}
                  className={`mb-0.5 flex items-center gap-1 truncate rounded px-1 hover:bg-bg ${t.done ? 'text-muted line-through' : ''}`}
                >
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: (t.areaId && areaColor.get(t.areaId)) || 'var(--muted)' }} />
                  <span className="truncate">{t.time ? `${t.time} ` : ''}{t.title}</span>
                </div>
              ))}
              {tasks.length > 3 && <div className="px-1 text-muted">+{tasks.length - 3} more</div>}
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <Section title={`${prettyDay(selected, today)} · ${format(fromDay(selected), 'd MMMM')}`} count={selectedTasks.length}>
          <TaskList tasks={selectedTasks} showDate={false} empty="No tasks on this day." />
          <div className="mt-2 px-2">
            <QuickAdd key={selected} defaults={{ date: selected }} placeholder="Add a task to this day" />
          </div>
        </Section>
      </div>
    </div>
  )
}
