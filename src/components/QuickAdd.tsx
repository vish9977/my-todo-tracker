import { forwardRef, useState } from 'react'
import { useStore, type NewTask } from '../store'
import { parseQuickAdd } from '../lib/quickAdd'
import { prettyDay, prettyTime } from '../lib/dates'
import { describeRecurrence } from '../lib/recurrence'
import { Icon } from './Icon'

interface Props {
  /** Defaults applied when the text doesn't say otherwise. */
  defaults?: Partial<NewTask>
  placeholder?: string
}

export const QuickAdd = forwardRef<HTMLInputElement, Props>(function QuickAdd({ defaults, placeholder }, ref) {
  const { data, today, addTask } = useStore()
  const [text, setText] = useState('')
  const parsed = text.trim() ? parseQuickAdd(text, data.areas, today) : null
  const area = parsed?.areaId ? data.areas.find((a) => a.id === parsed.areaId) : null

  const submit = () => {
    if (!parsed || !parsed.title) return
    addTask({
      ...defaults,
      title: parsed.title,
      ...(parsed.date ? { date: parsed.date } : {}),
      ...(parsed.time ? { time: parsed.time } : {}),
      ...(parsed.priority ? { priority: parsed.priority } : {}),
      ...(parsed.areaId ? { areaId: parsed.areaId } : {}),
      ...(parsed.recurrence ? { recurrence: parsed.recurrence } : {}),
    })
    setText('')
  }

  return (
    <div className="rounded-lg border border-line bg-bg focus-within:border-accent">
      <div className="flex items-center gap-2 px-3">
        <Icon name="plus" className="text-accent" />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') {
              setText('')
              e.currentTarget.blur()
            }
          }}
          placeholder={placeholder ?? 'Add a task, e.g. "Edit video tomorrow 6pm #youtube !1"'}
          className="w-full bg-transparent py-2.5 outline-none placeholder:text-muted"
        />
      </div>
      {parsed && (parsed.date || parsed.time || parsed.priority || area || parsed.recurrence) && (
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-1.5 text-xs text-muted">
          {parsed.date && <Chip>{prettyDay(parsed.date, today)}</Chip>}
          {parsed.time && <Chip>{prettyTime(parsed.time)}</Chip>}
          {parsed.recurrence && <Chip>{describeRecurrence(parsed.recurrence)}</Chip>}
          {parsed.priority && parsed.priority < 4 && <Chip>Priority {parsed.priority}</Chip>}
          {area && (
            <Chip>
              <span className="inline-block size-2 rounded-full" style={{ background: area.color }} /> {area.name}
            </Chip>
          )}
          <span className="ml-auto">Enter to add</span>
        </div>
      )}
    </div>
  )
})

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 text-accent">{children}</span>
)
