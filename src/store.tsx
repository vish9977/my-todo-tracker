import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, Area, Goal, Settings, Task } from './types'
import { storage } from './lib/storage'
import { nextOccurrence } from './lib/recurrence'
import { ensureNotificationPermission, syncReminders } from './lib/reminders'
import { todayStr } from './lib/dates'

export const uid = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt'>> & { title: string }
export type NewGoal = Partial<Omit<Goal, 'id' | 'createdAt'>> & Pick<Goal, 'title' | 'level' | 'period'>

interface Toast {
  id: string
  message: string
  undo?: () => void
}

interface Store {
  data: AppData
  ready: boolean
  today: string
  toast: Toast | null
  dismissToast: () => void
  addTask: (t: NewTask) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  addGoal: (g: NewGoal) => Goal
  updateGoal: (id: string, patch: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  saveArea: (a: Area) => void
  deleteArea: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  replaceAll: (data: AppData) => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

function useToday() {
  const [today, setToday] = useState(todayStr)
  useEffect(() => {
    const t = setInterval(() => setToday(todayStr()), 30_000)
    return () => clearInterval(t)
  }, [])
  return today
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const today = useToday()
  const dataRef = useRef<AppData | null>(null)
  dataRef.current = data

  useEffect(() => {
    storage.load().then(setData).catch((e) => {
      console.error(e)
      alert(`Could not open your data: ${e}`)
    })
    ensureNotificationPermission().catch(console.error)
  }, [])

  // Keep the reminder scheduler in sync with tasks, and refresh hourly for the daily summary.
  useEffect(() => {
    if (!data) return
    const t = setTimeout(() => syncReminders(data).catch(console.error), 300)
    return () => clearTimeout(t)
  }, [data, today])
  useEffect(() => {
    const t = setInterval(() => dataRef.current && syncReminders(dataRef.current).catch(console.error), 3_600_000)
    return () => clearInterval(t)
  }, [])

  const showToast = useCallback((message: string, undo?: () => void) => {
    const id = uid()
    setToast({ id, message, undo })
    setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), 5000)
  }, [])

  const persist = (p: Promise<void>) => p.catch((e) => {
    console.error(e)
    showToast(`Could not save: ${e}`)
  })

  const mutate = useCallback((fn: (d: AppData) => AppData) => {
    setData((d) => (d ? fn(d) : d))
  }, [])

  const putTask = useCallback((task: Task) => {
    mutate((d) => {
      const exists = d.tasks.some((t) => t.id === task.id)
      return { ...d, tasks: exists ? d.tasks.map((t) => (t.id === task.id ? task : t)) : [...d.tasks, task] }
    })
    persist(storage.saveTask(task))
  }, [mutate])

  const store = useMemo<Store | null>(() => {
    if (!data) return null
    const findTask = (id: string) => dataRef.current!.tasks.find((t) => t.id === id)

    return {
      data,
      ready: true,
      today,
      toast,
      dismissToast: () => setToast(null),

      addTask: (input) => {
        const s = dataRef.current!.settings
        const task: Task = {
          notes: '',
          goalId: null,
          areaId: null,
          date: null,
          time: null,
          priority: 4,
          done: false,
          doneAt: null,
          recurrence: null,
          subtasks: [],
          sort: Date.now(),
          ...input,
          remindBefore: input.remindBefore !== undefined ? input.remindBefore : input.time ? s.defaultRemindBefore : null,
          id: uid(),
          createdAt: nowIso(),
        }
        putTask(task)
        return task
      },

      updateTask: (id, patch) => {
        const cur = findTask(id)
        if (!cur) return
        const next = { ...cur, ...patch }
        // Setting a time turns on the default reminder; clearing it turns the reminder off.
        if ('time' in patch && patch.time && !cur.time && !('remindBefore' in patch))
          next.remindBefore = dataRef.current!.settings.defaultRemindBefore
        if ('time' in patch && !patch.time) next.remindBefore = null
        putTask(next)
      },

      toggleTask: (id) => {
        const cur = findTask(id)
        if (!cur) return
        if (cur.done) {
          putTask({ ...cur, done: false, doneAt: null })
          return
        }
        const doneTask = { ...cur, done: true, doneAt: nowIso() }
        putTask(doneTask)
        let created: Task | null = null
        if (cur.recurrence && cur.date) {
          created = {
            ...cur,
            id: uid(),
            date: nextOccurrence(cur.date, cur.recurrence),
            subtasks: cur.subtasks.map((s) => ({ ...s, done: false })),
            createdAt: nowIso(),
          }
          putTask(created)
        }
        showToast(
          created ? `Done. Next one on ${created.date}` : 'Task completed',
          () => {
            putTask({ ...doneTask, done: false, doneAt: null })
            if (created) {
              const createdId = created.id
              mutate((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== createdId) }))
              persist(storage.deleteTask(createdId))
            }
          },
        )
      },

      deleteTask: (id) => {
        const cur = findTask(id)
        if (!cur) return
        mutate((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }))
        persist(storage.deleteTask(id))
        showToast('Task deleted', () => putTask(cur))
      },

      addGoal: (input) => {
        const goal: Goal = {
          notes: '',
          parentId: null,
          areaId: null,
          archived: false,
          ...input,
          id: uid(),
          createdAt: nowIso(),
        }
        mutate((d) => ({ ...d, goals: [...d.goals, goal] }))
        persist(storage.saveGoal(goal))
        return goal
      },

      updateGoal: (id, patch) => {
        const cur = dataRef.current!.goals.find((g) => g.id === id)
        if (!cur) return
        const next = { ...cur, ...patch }
        mutate((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? next : g)) }))
        persist(storage.saveGoal(next))
      },

      deleteGoal: (id) => {
        mutate((d) => ({
          ...d,
          goals: d.goals.filter((g) => g.id !== id).map((g) => (g.parentId === id ? { ...g, parentId: null } : g)),
          tasks: d.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t)),
        }))
        persist(storage.deleteGoal(id))
        showToast('Goal deleted. Its tasks were kept.')
      },

      saveArea: (a) => {
        mutate((d) => {
          const exists = d.areas.some((x) => x.id === a.id)
          return { ...d, areas: exists ? d.areas.map((x) => (x.id === a.id ? a : x)) : [...d.areas, a] }
        })
        persist(storage.saveArea(a))
      },

      deleteArea: (id) => {
        mutate((d) => ({
          ...d,
          areas: d.areas.filter((a) => a.id !== id),
          tasks: d.tasks.map((t) => (t.areaId === id ? { ...t, areaId: null } : t)),
          goals: d.goals.map((g) => (g.areaId === id ? { ...g, areaId: null } : g)),
        }))
        persist(storage.deleteArea(id))
      },

      updateSettings: (patch) => {
        const next = { ...dataRef.current!.settings, ...patch }
        mutate((d) => ({ ...d, settings: next }))
        persist(storage.saveSettings(next))
      },

      replaceAll: async (next) => {
        await storage.replaceAll(next)
        setData(structuredClone(next))
        showToast('Backup restored')
      },
    }
  }, [data, today, toast, mutate, putTask, showToast])

  if (!store) return <div className="h-screen grid place-items-center text-sm text-muted">Loading…</div>
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
