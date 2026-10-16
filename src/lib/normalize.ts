import { DEFAULT_SETTINGS, type AppData, type Goal, type Settings, type Task, type TaskReminder } from '../types'

/** Old (v0.1) tasks stored one reminder as `remindBefore` minutes. */
type LegacyTask = Partial<Task> & { remindBefore?: number | null }

/** Fills in fields added after a task or goal was saved, so older data and backups keep working. */
export function normalizeTask(raw: LegacyTask): Task {
  let reminders: TaskReminder[] = Array.isArray(raw.reminders) ? raw.reminders : []
  if (!raw.reminders && raw.remindBefore !== undefined && raw.remindBefore !== null)
    reminders = [{ id: `r-${raw.id}`, kind: 'before', minutes: raw.remindBefore }]
  const { remindBefore: _legacy, ...rest } = raw
  void _legacy
  return {
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
    sort: 0,
    createdAt: new Date().toISOString(),
    nagMinutes: null,
    emailReminder: null,
    assigneeId: null,
    assigneeEmailedAt: null,
    remindAssignee: false,
    ...rest,
    reminders,
  } as Task
}

export function normalizeGoal(raw: Partial<Goal>): Goal {
  return { notes: '', parentId: null, areaId: null, archived: false, endDate: null, ...raw } as Goal
}

export function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...raw, email: { ...DEFAULT_SETTINGS.email, ...raw?.email }, people: raw?.people ?? [] }
}

export function normalizeData(raw: Partial<AppData>): AppData {
  return {
    areas: (raw.areas ?? []).map((a) => ({ ...a, hidden: !!a.hidden })),
    goals: (raw.goals ?? []).map(normalizeGoal),
    tasks: (raw.tasks ?? []).map(normalizeTask),
    settings: normalizeSettings(raw.settings),
  }
}
