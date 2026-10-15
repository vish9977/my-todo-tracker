import { describe, expect, it } from 'vitest'
import { nextOccurrence } from '../recurrence'

describe('nextOccurrence', () => {
  it('handles daily, weekly and monthly', () => {
    expect(nextOccurrence('2026-10-15', { type: 'daily' })).toBe('2026-10-16')
    expect(nextOccurrence('2026-10-15', { type: 'weekly' })).toBe('2026-10-22')
    expect(nextOccurrence('2026-01-31', { type: 'monthly' })).toBe('2026-02-28')
  })
  it('skips weekends for weekdays', () => {
    expect(nextOccurrence('2026-10-16', { type: 'weekdays' })).toBe('2026-10-19')
  })
  it('uses the next chosen day for custom', () => {
    // Thu -> next Mon or Thu
    expect(nextOccurrence('2026-10-15', { type: 'custom', days: [1, 4] })).toBe('2026-10-19')
    expect(nextOccurrence('2026-10-19', { type: 'custom', days: [1, 4] })).toBe('2026-10-22')
  })
})
