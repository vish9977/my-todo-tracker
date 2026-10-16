import { describe, expect, it } from 'vitest'
import { isActiveOn, periodFor, periodLabel, periodRange, rankOf, shiftPeriod } from '../periods'

describe('periods', () => {
  it('computes ranges for every level', () => {
    expect(periodRange('year', '2026')).toEqual({ start: '2026-01-01', end: '2026-12-31' })
    expect(periodRange('half', '2026-H2')).toEqual({ start: '2026-07-01', end: '2026-12-31' })
    expect(periodRange('quarter', '2026-Q1')).toEqual({ start: '2026-01-01', end: '2026-03-31' })
    expect(periodRange('month', '2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(periodRange('week', '2026-10-12')).toEqual({ start: '2026-10-12', end: '2026-10-18' })
    expect(periodRange('custom', '2026-10-01', '2026-11-15')).toEqual({ start: '2026-10-01', end: '2026-11-15' })
  })
  it('finds the period containing a day', () => {
    expect(periodFor('half', '2026-10-16', 1)).toBe('2026-H2')
    expect(periodFor('quarter', '2026-10-16', 1)).toBe('2026-Q4')
    expect(periodFor('week', '2026-10-16', 1)).toBe('2026-10-12')
  })
  it('steps periods forward and back', () => {
    expect(shiftPeriod('half', '2026-H2', 1)).toBe('2027-H1')
    expect(shiftPeriod('quarter', '2026-Q1', -1)).toBe('2025-Q4')
    expect(shiftPeriod('month', '2026-12', 1)).toBe('2027-01')
    expect(shiftPeriod('week', '2026-10-12', -1)).toBe('2026-10-05')
  })
  it('labels periods', () => {
    expect(periodLabel('half', '2026-H1')).toBe('Jan–Jun 2026')
    expect(periodLabel('quarter', '2026-Q4')).toBe('Q4 · Oct–Dec 2026')
    expect(periodLabel('custom', '2026-10-01', '2026-11-15')).toBe('1 Oct – 15 Nov 2026')
  })
  it('ranks custom goals by length and checks activity', () => {
    const g = { level: 'custom' as const, period: '2026-10-01', endDate: '2027-03-31' }
    expect(rankOf(g)).toBe(4)
    expect(isActiveOn(g, '2026-12-25')).toBe(true)
    expect(isActiveOn(g, '2027-04-01')).toBe(false)
  })
})
