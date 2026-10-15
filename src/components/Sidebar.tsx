import { useStore } from '../store'
import { useUI, type View } from '../ui'
import { Icon, type IconName } from './Icon'

export function Sidebar() {
  const { data, today } = useStore()
  const { view, setView } = useUI()
  const open = data.tasks.filter((t) => !t.done)
  const todayCount = open.filter((t) => t.date && t.date <= today).length

  const item = (v: View, icon: IconName, label: string, count?: number) => {
    const active = view.kind === v.kind && (v.kind !== 'area' || (view.kind === 'area' && view.id === v.id))
    return (
      <button
        key={label}
        onClick={() => setView(v)}
        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left ${active ? 'bg-accent-soft font-medium text-accent' : 'hover:bg-hover'}`}
      >
        <Icon name={icon} />
        <span className="flex-1">{label}</span>
        {!!count && <span className="text-xs text-muted">{count}</span>}
      </button>
    )
  }

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col gap-0.5 border-r border-line bg-panel p-3">
      <div className="mb-3 flex items-center gap-2 px-2.5 pt-1 font-semibold">
        <img src="/favicon.svg" alt="" className="size-5" /> MyTodoTracker
      </div>
      {item({ kind: 'today' }, 'sun', 'Today', todayCount)}
      {item({ kind: 'upcoming' }, 'week', 'Next 7 days')}
      {item({ kind: 'calendar' }, 'calendar', 'Calendar')}
      {item({ kind: 'goals' }, 'target', 'Goals')}
      {item({ kind: 'search' }, 'search', 'Search')}

      <div className="mt-5 mb-1 px-2.5 text-xs font-medium text-muted">Areas</div>
      {data.areas.map((a) => {
        const active = view.kind === 'area' && view.id === a.id
        const count = open.filter((t) => t.areaId === a.id).length
        return (
          <button
            key={a.id}
            onClick={() => setView({ kind: 'area', id: a.id })}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left ${active ? 'bg-accent-soft font-medium' : 'hover:bg-hover'}`}
          >
            <span className="mx-1 size-2 rounded-full" style={{ background: a.color }} />
            <span className="flex-1 truncate">{a.name}</span>
            {!!count && <span className="text-xs text-muted">{count}</span>}
          </button>
        )
      })}

      <div className="mt-auto">{item({ kind: 'settings' }, 'settings', 'Settings')}</div>
    </nav>
  )
}
