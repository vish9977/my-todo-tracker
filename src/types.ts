export type ID = string

export interface Area {
  id: ID
  name: string
  color: string
  sort: number
}

/** A month goal ("2026-10") or a week goal (period = the week's first day, "2026-10-12"). */
export type GoalLevel = 'month' | 'week'

export interface Goal {
  id: ID
  title: string
  notes: string
  level: GoalLevel
  period: string
  /** A week goal can sit under a month goal. */
  parentId: ID | null
  areaId: ID | null
  archived: boolean
  createdAt: string
}

export type RecurrenceType = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'

export interface Recurrence {
  type: RecurrenceType
  /** For 'custom': days of week, 0 = Sunday. */
  days?: number[]
}

export interface Subtask {
  id: ID
  title: string
  done: boolean
}

/** 1 = urgent, 4 = none. */
export type Priority = 1 | 2 | 3 | 4

export interface Task {
  id: ID
  title: string
  notes: string
  goalId: ID | null
  areaId: ID | null
  /** yyyy-MM-dd */
  date: string | null
  /** HH:mm */
  time: string | null
  /** Minutes before date+time to notify; null = no reminder. */
  remindBefore: number | null
  priority: Priority
  done: boolean
  doneAt: string | null
  recurrence: Recurrence | null
  subtasks: Subtask[]
  sort: number
  createdAt: string
}

export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
  theme: Theme
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn: 0 | 1
  /** Daily "here's your day" notification, HH:mm, or null to turn off. */
  dailySummaryTime: string | null
  /** Default reminder for new tasks with a time. */
  defaultRemindBefore: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  weekStartsOn: 1,
  dailySummaryTime: '09:00',
  defaultRemindBefore: 0,
}

export interface AppData {
  areas: Area[]
  goals: Goal[]
  tasks: Task[]
  settings: Settings
}
