import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from '../quickAdd'
import { DEFAULT_AREAS } from '../storage'

// 2026-10-15 is a Thursday.
const TODAY = '2026-10-15'
const parse = (s: string) => parseQuickAdd(s, DEFAULT_AREAS, TODAY)

describe('parseQuickAdd', () => {
  it('keeps plain text as the title', () => {
    expect(parse('Write blog post')).toMatchObject({ title: 'Write blog post', date: null, time: null })
  })
  it('reads tomorrow, time, area and priority', () => {
    expect(parse('Edit video tomorrow 6pm #youtube !1')).toEqual({
      title: 'Edit video', date: '2026-10-16', time: '18:00', priority: 1, areaId: 'area-youtube', recurrence: null,
    })
  })
  it('reads weekday names as the next such day', () => {
    expect(parse('Call client fri').date).toBe('2026-10-16')
    expect(parse('Plan week mon at 9:30').date).toBe('2026-10-19')
    expect(parse('Plan week mon at 9:30').time).toBe('09:30')
    expect(parse('Review thu').date).toBe('2026-10-22')
  })
  it('reads day-month dates and rolls into next year when past', () => {
    expect(parse('Launch site 20 oct').date).toBe('2026-10-20')
    expect(parse('Renew domain jan 5').date).toBe('2027-01-05')
  })
  it('defaults time-only and repeating tasks to today', () => {
    expect(parse('Standup 10am')).toMatchObject({ title: 'Standup', date: TODAY, time: '10:00' })
    expect(parse('Post a short every day')).toMatchObject({ title: 'Post a short', date: TODAY, recurrence: { type: 'daily' } })
  })
  it('leaves unknown hashtags in the title', () => {
    expect(parse('Learn #seo basics')).toMatchObject({ title: 'Learn #seo basics', areaId: null })
  })
  it('reads 24h time and "in N days"', () => {
    expect(parse('Upload 18:45 in 3 days')).toMatchObject({ title: 'Upload', date: '2026-10-18', time: '18:45' })
  })
})

describe('personal tasks', () => {
  it('parses medicine, lab test and grocery examples', () => {
    expect(parse('Take medicine every day 9pm #health')).toMatchObject({
      title: 'Take medicine', date: TODAY, time: '21:00', areaId: 'area-health', recurrence: { type: 'daily' },
    })
    expect(parse('Blood test 20 oct 8am #health')).toMatchObject({ title: 'Blood test', date: '2026-10-20', time: '08:00' })
    expect(parse('Grocery sat #home')).toMatchObject({ title: 'Grocery', date: '2026-10-17', areaId: 'area-home' })
  })
})
