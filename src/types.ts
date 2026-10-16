export type ID = string

export interface Area {
  id: ID
  name: string
  color: string
  sort: number
  /** Hidden from the left panel (still usable everywhere else). */
  hidden: boolean
}

/** Someone tasks can be assigned to. */
export interface Person {
  id: ID
  name: string
  email: string
}

/**
 * How long a goal runs. `period` names which one:
 *   year "2026", half "2026-H2", quarter "2026-Q4", month "2026-10",
 *   week = its first day "2026-10-12", custom = start day "2026-10-01" plus `endDate`.
 */
export type GoalLevel = 'year' | 'half' | 'quarter' | 'month' | 'week' | 'custom'

export interface Goal {
  id: ID
  title: string
  notes: string
  level: GoalLevel
  period: string
  /** Last day, only for custom goals (yyyy-MM-dd). */
  endDate: string | null
  /** The bigger goal this one is part of, e.g. a month goal under a year goal. */
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

/** A reminder for a task: some time before its date+time, or at an exact moment. */
export type TaskReminder =
  | { id: ID; kind: 'before'; minutes: number }
  | { id: ID; kind: 'at'; at: string /* yyyy-MM-ddTHH:mm */ }

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
  reminders: TaskReminder[]
  /** Repeat each reminder every N minutes (up to 6 times) until the task is done. */
  nagMinutes: number | null
  /** Also send reminders by email; null follows the setting. */
  emailReminder: boolean | null
  /** Person this task is assigned to. */
  assigneeId: ID | null
  /** When the assignee was last emailed about this task. */
  assigneeEmailedAt: string | null
  /** Send the task's reminders to the assignee too. */
  remindAssignee: boolean
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
  email: EmailSettings
  people: Person[]
}

export interface EmailSettings {
  /** Send reminders by email as well as on screen. */
  enabled: boolean
  /** Where reminders go. */
  to: string
  smtpHost: string
  smtpPort: number
  /** Login for the mail server, usually the same address. The password is kept in the system's credential store. */
  username: string
  /** Email the morning summary too. */
  dailySummary: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  weekStartsOn: 1,
  dailySummaryTime: '09:00',
  defaultRemindBefore: 0,
  email: { enabled: false, to: '', smtpHost: 'smtp.gmail.com', smtpPort: 465, username: '', dailySummary: false },
  people: [],
}

export interface AppData {
  areas: Area[]
  goals: Goal[]
  tasks: Task[]
  settings: Settings
}
