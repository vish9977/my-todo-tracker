import { isTauri } from '@tauri-apps/api/core'
import type Database from '@tauri-apps/plugin-sql'
import { DEFAULT_SETTINGS, type AppData, type Area, type Goal, type Settings, type Task } from '../types'

/**
 * Persistence. Inside the desktop app everything goes to a local SQLite file
 * (tracker.db in the app's data folder). In a plain browser (used while
 * developing the UI) it falls back to localStorage.
 */
export interface Storage {
  load(): Promise<AppData>
  saveArea(a: Area): Promise<void>
  deleteArea(id: string): Promise<void>
  saveGoal(g: Goal): Promise<void>
  deleteGoal(id: string): Promise<void>
  saveTask(t: Task): Promise<void>
  deleteTask(id: string): Promise<void>
  saveSettings(s: Settings): Promise<void>
  replaceAll(data: AppData): Promise<void>
}

export const DEFAULT_AREAS: Area[] = [
  { id: 'area-websites', name: 'Websites', color: '#2563eb', sort: 0 },
  { id: 'area-youtube', name: 'YouTube', color: '#dc2626', sort: 1 },
  { id: 'area-blogging', name: 'Blogging', color: '#16a34a', sort: 2 },
  { id: 'area-health', name: 'Health', color: '#db2777', sort: 3 },
  { id: 'area-home', name: 'Home', color: '#ca8a04', sort: 4 },
  { id: 'area-personal', name: 'Personal', color: '#9333ea', sort: 5 },
]

const emptyData = (): AppData => ({
  areas: DEFAULT_AREAS,
  goals: [],
  tasks: [],
  settings: { ...DEFAULT_SETTINGS },
})

// ---------- SQLite (desktop) ----------

interface TaskRow {
  id: string; title: string; notes: string; goal_id: string | null; area_id: string | null
  date: string | null; time: string | null; remind_before: number | null; priority: number
  done: number; done_at: string | null; recurrence: string | null; subtasks: string
  sort: number; created_at: string
}
interface GoalRow {
  id: string; title: string; notes: string; level: string; period: string
  parent_id: string | null; area_id: string | null; archived: number; created_at: string
}

const rowToTask = (r: TaskRow): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  goalId: r.goal_id,
  areaId: r.area_id,
  date: r.date,
  time: r.time,
  remindBefore: r.remind_before,
  priority: r.priority as Task['priority'],
  done: !!r.done,
  doneAt: r.done_at,
  recurrence: r.recurrence ? JSON.parse(r.recurrence) : null,
  subtasks: JSON.parse(r.subtasks || '[]'),
  sort: r.sort,
  createdAt: r.created_at,
})

const rowToGoal = (r: GoalRow): Goal => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  level: r.level as Goal['level'],
  period: r.period,
  parentId: r.parent_id,
  areaId: r.area_id,
  archived: !!r.archived,
  createdAt: r.created_at,
})

class SqliteStorage implements Storage {
  private db: Promise<Database>
  constructor() {
    this.db = import('@tauri-apps/plugin-sql').then((m) => m.default.load('sqlite:tracker.db'))
  }

  async load(): Promise<AppData> {
    const db = await this.db
    const [areas, goals, tasks, settingsRows] = await Promise.all([
      db.select<Area[]>('SELECT id, name, color, sort FROM areas ORDER BY sort'),
      db.select<GoalRow[]>('SELECT * FROM goals'),
      db.select<TaskRow[]>('SELECT * FROM tasks'),
      db.select<{ key: string; value: string }[]>('SELECT key, value FROM settings'),
    ])
    const stored = settingsRows.find((r) => r.key === 'settings')
    const firstRun = !stored
    const data: AppData = {
      areas,
      goals: goals.map(rowToGoal),
      tasks: tasks.map(rowToTask),
      settings: { ...DEFAULT_SETTINGS, ...(stored ? JSON.parse(stored.value) : {}) },
    }
    if (firstRun) {
      for (const a of DEFAULT_AREAS) await this.saveArea(a)
      await this.saveSettings(data.settings)
      data.areas = DEFAULT_AREAS
    }
    return data
  }

  async saveArea(a: Area) {
    const db = await this.db
    await db.execute(
      `INSERT INTO areas (id, name, color, sort) VALUES ($1, $2, $3, $4)
       ON CONFLICT(id) DO UPDATE SET name = $2, color = $3, sort = $4`,
      [a.id, a.name, a.color, a.sort],
    )
  }

  async deleteArea(id: string) {
    const db = await this.db
    await db.execute('UPDATE tasks SET area_id = NULL WHERE area_id = $1', [id])
    await db.execute('UPDATE goals SET area_id = NULL WHERE area_id = $1', [id])
    await db.execute('DELETE FROM areas WHERE id = $1', [id])
  }

  async saveGoal(g: Goal) {
    const db = await this.db
    await db.execute(
      `INSERT INTO goals (id, title, notes, level, period, parent_id, area_id, archived, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET title = $2, notes = $3, level = $4, period = $5,
         parent_id = $6, area_id = $7, archived = $8`,
      [g.id, g.title, g.notes, g.level, g.period, g.parentId, g.areaId, g.archived ? 1 : 0, g.createdAt],
    )
  }

  async deleteGoal(id: string) {
    const db = await this.db
    await db.execute('UPDATE tasks SET goal_id = NULL WHERE goal_id = $1', [id])
    await db.execute('UPDATE goals SET parent_id = NULL WHERE parent_id = $1', [id])
    await db.execute('DELETE FROM goals WHERE id = $1', [id])
  }

  async saveTask(t: Task) {
    const db = await this.db
    await db.execute(
      `INSERT INTO tasks (id, title, notes, goal_id, area_id, date, time, remind_before, priority,
         done, done_at, recurrence, subtasks, sort, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT(id) DO UPDATE SET title = $2, notes = $3, goal_id = $4, area_id = $5, date = $6,
         time = $7, remind_before = $8, priority = $9, done = $10, done_at = $11, recurrence = $12,
         subtasks = $13, sort = $14`,
      [
        t.id, t.title, t.notes, t.goalId, t.areaId, t.date, t.time, t.remindBefore, t.priority,
        t.done ? 1 : 0, t.doneAt, t.recurrence ? JSON.stringify(t.recurrence) : null,
        JSON.stringify(t.subtasks), t.sort, t.createdAt,
      ],
    )
  }

  async deleteTask(id: string) {
    const db = await this.db
    await db.execute('DELETE FROM tasks WHERE id = $1', [id])
  }

  async saveSettings(s: Settings) {
    const db = await this.db
    await db.execute(
      `INSERT INTO settings (key, value) VALUES ('settings', $1)
       ON CONFLICT(key) DO UPDATE SET value = $1`,
      [JSON.stringify(s)],
    )
  }

  async replaceAll(data: AppData) {
    const db = await this.db
    await db.execute('DELETE FROM tasks')
    await db.execute('DELETE FROM goals')
    await db.execute('DELETE FROM areas')
    for (const a of data.areas) await this.saveArea(a)
    for (const g of data.goals) await this.saveGoal(g)
    for (const t of data.tasks) await this.saveTask(t)
    await this.saveSettings(data.settings)
  }
}

// ---------- localStorage (browser preview) ----------

const LS_KEY = 'mytodotracker-data'

class LocalStorage implements Storage {
  private data: AppData = emptyData()

  private persist() {
    localStorage.setItem(LS_KEY, JSON.stringify(this.data))
  }
  private upsert<T extends { id: string }>(list: T[], item: T): T[] {
    const i = list.findIndex((x) => x.id === item.id)
    return i === -1 ? [...list, item] : list.map((x) => (x.id === item.id ? item : x))
  }

  async load() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AppData
        this.data = { ...emptyData(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } }
      }
    } catch {
      this.data = emptyData()
    }
    return structuredClone(this.data)
  }
  async saveArea(a: Area) { this.data.areas = this.upsert(this.data.areas, a); this.persist() }
  async deleteArea(id: string) {
    this.data.areas = this.data.areas.filter((a) => a.id !== id)
    this.data.tasks = this.data.tasks.map((t) => (t.areaId === id ? { ...t, areaId: null } : t))
    this.data.goals = this.data.goals.map((g) => (g.areaId === id ? { ...g, areaId: null } : g))
    this.persist()
  }
  async saveGoal(g: Goal) { this.data.goals = this.upsert(this.data.goals, g); this.persist() }
  async deleteGoal(id: string) {
    this.data.goals = this.data.goals
      .filter((g) => g.id !== id)
      .map((g) => (g.parentId === id ? { ...g, parentId: null } : g))
    this.data.tasks = this.data.tasks.map((t) => (t.goalId === id ? { ...t, goalId: null } : t))
    this.persist()
  }
  async saveTask(t: Task) { this.data.tasks = this.upsert(this.data.tasks, t); this.persist() }
  async deleteTask(id: string) { this.data.tasks = this.data.tasks.filter((t) => t.id !== id); this.persist() }
  async saveSettings(s: Settings) { this.data.settings = s; this.persist() }
  async replaceAll(data: AppData) { this.data = structuredClone(data); this.persist() }
}

export const storage: Storage = isTauri() ? new SqliteStorage() : new LocalStorage()
export const inDesktopApp = isTauri()
