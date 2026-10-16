import { useState } from 'react'
import { useStore } from '../store'
import { useUI, type View } from '../ui'
import { Icon, type IconName } from './Icon'
import { UpdateBanner } from './Updates'

const VISIBLE_AREAS = 5

/** A boolean kept in local storage so the sidebar opens the way it was left. */
function useRemembered(key: string): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })
  const set = (v: boolean) => {
    setValue(v)
    try {
      localStorage.setItem(key, v ? '1' : '0')
    } catch {
      /* remembering is optional */
    }
  }
  return [value, set]
}

export function Sidebar() {
  const { data, today } = useStore()
  const { view, setView } = useUI()
  const open = data.tasks.filter((t) => !t.done)
  const todayCount = open.filter((t) => t.date && t.date <= today).length
  const [collapsed, setCollapsed] = useRemembered('sidebar-areas-collapsed')
  const [showAll, setShowAll] = useRemembered('sidebar-areas-all')
  const isViewing = (id: string) => view.kind === 'area' && view.id === id
  // Areas hidden in Settings stay out of the panel unless you're on that area's page.
  const sorted = [...data.areas].filter((a) => !a.hidden || isViewing(a.id)).sort((a, b) => a.sort - b.sort)
  // The first few areas, plus the one being viewed so it never disappears.
  const shownAreas = showAll
    ? sorted
    : sorted.filter((a, i) => i < VISIBLE_AREAS || isViewing(a.id))
  const hiddenCount = showAll ? sorted.length - VISIBLE_AREAS : sorted.length - shownAreas.length

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

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mt-5 mb-1 flex items-center gap-1 px-2.5 text-xs font-medium text-muted hover:text-ink"
        title={collapsed ? 'Show areas' : 'Hide areas'}
      >
        <Icon name={collapsed ? 'chevronRight' : 'chevronDown'} size={12} />
        Areas
      </button>
      {!collapsed && (
        <div className="min-h-0 overflow-y-auto">
          {shownAreas.map((a) => {
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
          {hiddenCount > 0 && (
            <button onClick={() => setShowAll(!showAll)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-muted hover:bg-hover hover:text-ink">
              <Icon name={showAll ? 'chevronDown' : 'chevronRight'} size={14} className="mx-px" />
              {showAll ? 'Show less' : `${hiddenCount} more`}
            </button>
          )}
        </div>
      )}

      <div className="mt-auto pt-3">
        <UpdateBanner />
        {item({ kind: 'settings' }, 'settings', 'Settings')}
      </div>
    </nav>
  )
}
