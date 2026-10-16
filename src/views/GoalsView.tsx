import { useState } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui'
import type { GoalLevel } from '../types'
import { LEVELS, LEVEL_NAME, goalRange, periodFor, periodLabel, shiftPeriod } from '../lib/periods'
import { Icon } from '../components/Icon'
import { GoalCard } from '../components/GoalCard'

const TAB_KEY = 'goals-tab'

function savedTab(): GoalLevel {
  try {
    const v = localStorage.getItem(TAB_KEY) as GoalLevel | null
    return v && LEVELS.includes(v) ? v : 'month'
  } catch {
    return 'month'
  }
}

const EMPTY_HINT: Record<GoalLevel, string> = {
  year: 'Set one to three big outcomes for the year, like "Earn ₹6 lakh online" or "Grow YouTube to 10k subscribers".',
  half: 'Split the year into two halves, each with a clear milestone.',
  quarter: 'Pick what must be true by the end of these three months.',
  month: 'Start with one or two big outcomes, like "Launch the new blog" or "Post 8 YouTube videos".',
  week: 'What will you finish this week to move your monthly goal forward?',
  custom: 'Goals with your own start and end dates, like a 45-day challenge or a course you are taking.',
}

export function GoalsView() {
  const { data, today } = useStore()
  const { editGoal } = useUI()
  const ws = data.settings.weekStartsOn
  const [level, setLevelState] = useState<GoalLevel>(savedTab)
  const [period, setPeriod] = useState(() => periodFor(savedTab(), today, ws))
  const [showArchived, setShowArchived] = useState(false)
  const [showPast, setShowPast] = useState(false)

  const setLevel = (l: GoalLevel) => {
    setLevelState(l)
    setPeriod(periodFor(l, today, ws))
    try {
      localStorage.setItem(TAB_KEY, l)
    } catch {
      /* remembering the tab is optional */
    }
  }

  const isCustom = level === 'custom'
  const ofLevel = data.goals.filter((g) => g.level === level && (showArchived || !g.archived))
  const goals = isCustom
    ? ofLevel
        .filter((g) => showPast || goalRange(g).end >= today)
        .sort((a, b) => a.period.localeCompare(b.period))
    : ofLevel.filter((g) => g.period === period)
  const pastCustom = isCustom ? ofLevel.filter((g) => goalRange(g).end < today).length : 0
  const archivedHere = data.goals.filter((g) => g.archived && g.level === level && (isCustom || g.period === period)).length
  const current = periodFor(level, today, ws)

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="text-sm text-muted">Big goals broken into smaller goals and dated tasks. Open a goal to add sub-goals and tasks.</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-1 rounded-lg bg-panel p-1">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`flex-1 rounded-md px-2 py-1.5 text-sm whitespace-nowrap ${level === l ? 'bg-bg font-medium shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {LEVEL_NAME[l]}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        {!isCustom ? (
          <div className="flex items-center gap-1">
            <button className="btn" onClick={() => setPeriod(shiftPeriod(level, period, -1))} title="Previous"><Icon name="chevronLeft" /></button>
            <span className="min-w-40 text-center font-medium">{periodLabel(level, period)}</span>
            <button className="btn" onClick={() => setPeriod(shiftPeriod(level, period, 1))} title="Next"><Icon name="chevronRight" /></button>
            {period !== current && <button className="btn text-xs text-accent" onClick={() => setPeriod(current)}>Current</button>}
          </div>
        ) : (
          <span className="font-medium">{showPast ? 'All custom goals' : 'Running and upcoming'}</span>
        )}
        <button
          className="btn-primary ml-auto"
          onClick={() => editGoal(isCustom ? { level, period: today } : { level, period })}
        >
          <Icon name="plus" size={14} /> {LEVEL_NAME[level]} goal
        </button>
      </div>

      <div className="space-y-2">
        {goals.length === 0 && (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">{EMPTY_HINT[level]}</p>
        )}
        {goals.map((g) => <GoalCard key={g.id} goal={g} defaultOpen={goals.length <= 2} />)}
      </div>

      <div className="mt-6 flex gap-2">
        {pastCustom > 0 && (
          <button className="btn text-xs text-muted" onClick={() => setShowPast(!showPast)}>
            {showPast ? 'Hide' : 'Show'} {pastCustom} finished
          </button>
        )}
        {(archivedHere > 0 || showArchived) && (
          <button className="btn text-xs text-muted" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Hide archived' : `Show ${archivedHere} archived`}
          </button>
        )}
      </div>
    </div>
  )
}
