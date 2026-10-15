import { describe, expect, it } from 'vitest'
import { buildReminders } from '../reminders'
import { DEFAULT_SETTINGS, type AppData, type Task } from '../../types'
import { dateTimeMs, todayStr } from '../dates'

const task = (over: Partial<Task>): Task => ({
  id: 't1', title: 'Record video', notes: '', goalId: null, areaId: null, date: todayStr(), time: '23:59',
  remindBefore: 0, priority: 4, done: false, doneAt: null, recurrence: null, subtasks: [], sort: 0, createdAt: '',
  ...over,
})

const data = (tasks: Task[]): AppData => ({ areas: [], goals: [], tasks, settings: { ...DEFAULT_SETTINGS, dailySummaryTime: null } })

describe('buildReminders', () => {
  it('schedules a reminder at the task time minus the offset', () => {
    const now = dateTimeMs(todayStr(), '00:00')
    const [r] = buildReminders(data([task({ remindBefore: 15 })]), now)
    expect(r.atMs).toBe(dateTimeMs(todayStr(), '23:59') - 15 * 60_000)
    expect(r.title).toBe('Record video')
  })
  it('skips done tasks, tasks without time and tasks without a reminder', () => {
    const now = dateTimeMs(todayStr(), '00:00')
    expect(buildReminders(data([task({ done: true }), task({ time: null }), task({ remindBefore: null })]), now)).toEqual([])
  })
})
