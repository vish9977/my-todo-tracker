import { describe, expect, it } from 'vitest'
import { buildReminders } from '../reminders'
import { DEFAULT_SETTINGS, type AppData, type Settings, type Task } from '../../types'
import { dateTimeMs, todayStr } from '../dates'
import { normalizeTask } from '../normalize'

const task = (over: Partial<Task>): Task =>
  normalizeTask({
    id: 't1', title: 'Record video', date: todayStr(), time: '23:00',
    reminders: [{ id: 'r1', kind: 'before', minutes: 0 }], createdAt: '', ...over,
  })

const data = (tasks: Task[], settings: Partial<Settings> = {}): AppData => ({
  areas: [], goals: [], tasks, settings: { ...DEFAULT_SETTINGS, dailySummaryTime: null, ...settings },
})

const NOW = dateTimeMs(todayStr(), '00:00')

describe('buildReminders', () => {
  it('schedules every reminder of a task', () => {
    const t = task({
      reminders: [
        { id: 'a', kind: 'before', minutes: 15 },
        { id: 'b', kind: 'before', minutes: 1440 },
        { id: 'c', kind: 'at', at: `${todayStr()}T08:30` },
      ],
    })
    const times = buildReminders(data([t]), NOW - 2 * 86_400_000).map((r) => r.atMs)
    expect(times).toEqual([
      dateTimeMs(todayStr(), '23:00') - 1440 * 60_000,
      dateTimeMs(todayStr(), '08:30'),
      dateTimeMs(todayStr(), '23:00') - 15 * 60_000,
    ])
  })
  it('repeats a reminder until done when asked', () => {
    const r = buildReminders(data([task({ nagMinutes: 10, time: '20:00' })]), NOW)
    expect(r).toHaveLength(7)
    expect(r[1].atMs - r[0].atMs).toBe(10 * 60_000)
    expect(r[1].title).toBe('Still to do: Record video')
  })
  it('skips done tasks and before-reminders without a time, but keeps exact-time ones', () => {
    expect(buildReminders(data([task({ done: true })]), NOW)).toEqual([])
    expect(buildReminders(data([task({ time: null })]), NOW)).toEqual([])
    const at = task({ time: null, reminders: [{ id: 'x', kind: 'at', at: `${todayStr()}T07:00` }] })
    expect(buildReminders(data([at]), NOW)).toHaveLength(1)
  })
  it('emails only when email is on and the task does not opt out', () => {
    const email = { ...DEFAULT_SETTINGS.email, enabled: true, to: 'me@example.com' }
    expect(buildReminders(data([task({})], { email }), NOW)[0].email).toBe(true)
    expect(buildReminders(data([task({ emailReminder: false })], { email }), NOW)[0].email).toBe(false)
    expect(buildReminders(data([task({})]), NOW)[0].email).toBe(false)
  })
})

describe('normalizeTask', () => {
  it('turns an old single reminder into the reminders list', () => {
    const t = normalizeTask({ id: 'old', title: 'x', remindBefore: 30 } as Partial<Task>)
    expect(t.reminders).toEqual([{ id: 'r-old', kind: 'before', minutes: 30 }])
    expect('remindBefore' in t).toBe(false)
  })
})
