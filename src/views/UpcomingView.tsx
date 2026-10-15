import { addDays } from 'date-fns'
import { useStore } from '../store'
import { compareTasks } from '../lib/goals'
import { fromDay, prettyDay, toDay } from '../lib/dates'
import { QuickAdd } from '../components/QuickAdd'
import { Section, TaskList } from '../components/TaskItem'
import { format } from 'date-fns'

export function UpcomingView() {
  const { data, today } = useStore()
  const days = Array.from({ length: 7 }, (_, i) => toDay(addDays(fromDay(today), i)))
  const open = data.tasks.filter((t) => !t.done)
  const later = open.filter((t) => t.date && t.date > days[6]).sort(compareTasks)
  const someday = open.filter((t) => !t.date).sort(compareTasks)

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">Next 7 days</h1>
      </header>
      {days.map((day) => {
        const tasks = open.filter((t) => (day === today ? t.date && t.date <= day : t.date === day)).sort(compareTasks)
        return (
          <Section key={day} title={`${prettyDay(day, today)}${day === today || prettyDay(day, today) === 'Tomorrow' ? ` · ${format(fromDay(day), 'EEE d MMM')}` : ''}`} count={tasks.length || undefined}>
            <TaskList tasks={tasks} showDate={day === today} />
            <div className="mt-1 px-2"><DayAdd day={day} /></div>
          </Section>
        )
      })}
      {later.length > 0 && (
        <Section title="Later" count={later.length}>
          <TaskList tasks={later} />
        </Section>
      )}
      <Section title="No date" count={someday.length || undefined}>
        <TaskList tasks={someday} empty="Tasks without a date show up here." />
      </Section>
    </div>
  )
}

function DayAdd({ day }: { day: string }) {
  return (
    <div className="opacity-70 focus-within:opacity-100 hover:opacity-100">
      <QuickAdd defaults={{ date: day }} placeholder="Add task" />
    </div>
  )
}
