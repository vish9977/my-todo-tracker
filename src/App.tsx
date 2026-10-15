import { useEffect, useRef } from 'react'
import { StoreProvider, useStore } from './store'
import { UIProvider, useUI } from './ui'
import { Sidebar } from './components/Sidebar'
import { TaskDetail } from './components/TaskDetail'
import { GoalEditor } from './components/GoalEditor'
import { TodayView } from './views/TodayView'
import { UpcomingView } from './views/UpcomingView'
import { CalendarView } from './views/CalendarView'
import { GoalsView } from './views/GoalsView'
import { AreaView } from './views/AreaView'
import { SearchView } from './views/SearchView'
import { SettingsView } from './views/SettingsView'
import { inDesktopApp } from './lib/storage'

export default function App() {
  return (
    <StoreProvider>
      <UIProvider>
        <Shell />
      </UIProvider>
    </StoreProvider>
  )
}

function useTheme() {
  const { data } = useStore()
  const theme = data.settings.theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches))
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** Turns on "start with computer" the first time the app runs, so reminders survive restarts. */
function useFirstRunAutostart() {
  useEffect(() => {
    if (!inDesktopApp) return
    try {
      if (localStorage.getItem('autostart-initialized')) return
      localStorage.setItem('autostart-initialized', '1')
    } catch {
      return
    }
    import('@tauri-apps/plugin-autostart').then((m) => m.enable()).catch(console.error)
  }, [])
}

function Shell() {
  const { toast, dismissToast } = useStore()
  const { view, setView, selectedTaskId, goalDraft } = useUI()
  const quickAddRef = useRef<HTMLInputElement>(null)
  useTheme()
  useFirstRunAutostart()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return
      const views = ['today', 'upcoming', 'calendar', 'goals'] as const
      if (e.key === 'n' || e.key === 'q') {
        e.preventDefault()
        if (view.kind !== 'today') setView({ kind: 'today' })
        setTimeout(() => quickAddRef.current?.focus(), 0)
      } else if (e.key === '/') {
        e.preventDefault()
        setView({ kind: 'search' })
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        setView({ kind: views[Number(e.key) - 1] })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, setView])

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className={`mx-auto px-8 py-8 ${view.kind === 'calendar' ? 'max-w-5xl' : 'max-w-3xl'}`}>
          {view.kind === 'today' && <TodayView quickAddRef={quickAddRef} />}
          {view.kind === 'upcoming' && <UpcomingView />}
          {view.kind === 'calendar' && <CalendarView />}
          {view.kind === 'goals' && <GoalsView />}
          {view.kind === 'area' && <AreaView id={view.id} />}
          {view.kind === 'search' && <SearchView />}
          {view.kind === 'settings' && <SettingsView />}
        </div>
      </main>
      {selectedTaskId && <TaskDetail />}
      {goalDraft && <GoalEditor key={goalDraft.id ?? 'new'} />}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-sm text-bg shadow-lg">
          {toast.message}
          {toast.undo && (
            <button className="font-semibold text-accent-soft underline" onClick={() => { toast.undo!(); dismissToast() }}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
