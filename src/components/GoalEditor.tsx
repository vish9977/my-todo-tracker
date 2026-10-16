import { useState } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui'
import type { Goal, GoalLevel } from '../types'
import { goalAndDescendants } from '../lib/goals'
import { LEVELS, LEVEL_NAME, goalLabel, goalRange, overlaps, periodFor, periodRange, rankOf } from '../lib/periods'

/** Modal for creating or editing a goal of any period: year, 6 months, quarter, month, week or custom dates. */
export function GoalEditor() {
  const { data, today, addGoal, updateGoal, deleteGoal } = useStore()
  const { goalDraft, editGoal } = useUI()
  const ws = data.settings.weekStartsOn
  const [title, setTitle] = useState(goalDraft?.title ?? '')
  const [notes, setNotes] = useState(goalDraft?.notes ?? '')
  const [level, setLevel] = useState<GoalLevel>(goalDraft?.level ?? 'month')
  const [period, setPeriod] = useState(goalDraft?.period || periodFor(goalDraft?.level ?? 'month', today, ws))
  const [endDate, setEndDate] = useState(goalDraft?.endDate ?? '')
  const [parentId, setParentId] = useState(goalDraft?.parentId ?? '')
  const [areaId, setAreaId] = useState(goalDraft?.areaId ?? '')
  if (!goalDraft) return null

  const isNew = !goalDraft.id
  const draft = { level, period, endDate: endDate || null }
  const valid = !!title.trim() && !!period && (level !== 'custom' || (!!endDate && endDate >= period))

  // A goal can sit under any bigger goal whose dates overlap it (and that isn't one of its own sub-goals).
  const excluded = goalDraft.id ? goalAndDescendants(goalDraft as Goal, data) : new Set<string>()
  const parentOptions = period
    ? data.goals
        .filter((g) => !excluded.has(g.id) && (!g.archived || g.id === parentId))
        .filter((g) => rankOf(g) > rankOf(draft) || g.id === parentId)
        .filter((g) => overlaps(goalRange(g), periodRange(level, period, draft.endDate)) || g.id === parentId)
        .sort((a, b) => rankOf(b) - rankOf(a) || a.period.localeCompare(b.period))
    : []

  const changeLevel = (l: GoalLevel) => {
    // Keep roughly the same dates when switching between period types.
    const start = period ? periodRange(level, period, draft.endDate).start : today
    setLevel(l)
    setPeriod(periodFor(l, start, ws))
    if (l === 'custom' && !endDate) setEndDate(periodRange(level, period || periodFor(level, today, ws), draft.endDate).end)
  }

  const save = () => {
    if (!valid) return
    const fields = {
      title: title.trim(),
      notes,
      level,
      period,
      endDate: level === 'custom' ? endDate : null,
      parentId: parentId || null,
      areaId: areaId || null,
    }
    if (isNew) addGoal(fields)
    else updateGoal(goalDraft.id!, fields)
    editGoal(null)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4" onMouseDown={() => editGoal(null)}>
      <div
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-line bg-bg p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') editGoal(null)
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
        }}
      >
        <h2 className="mb-4 text-base font-semibold">{isNew ? 'New goal' : 'Edit goal'}</h2>
        <div className="space-y-3">
          <input
            autoFocus
            className="field text-base"
            placeholder="e.g. Earn ₹50,000 from YouTube"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />

          <div>
            <span className="label">Goal period</span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-panel p-1">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => changeLevel(l)}
                  className={`rounded-md py-1 text-sm ${level === l ? 'bg-bg font-medium shadow-sm' : 'text-muted hover:text-ink'}`}
                >
                  {LEVEL_NAME[l]}
                </button>
              ))}
            </div>
          </div>

          <PeriodPicker level={level} period={period} endDate={endDate} onPeriod={setPeriod} onEndDate={setEndDate} weekStartsOn={ws} />

          <label className="block">
            <span className="label">Part of a bigger goal</span>
            <select className="field" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None</option>
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>{g.title} · {goalLabel(g)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Area</span>
            <select className="field" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">None</option>
              {data.areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <textarea className="field min-h-16 text-sm" placeholder="Why this goal matters, target numbers…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="mt-5 flex items-center gap-2">
          {!isNew && (
            <>
              <button className="btn text-danger" onClick={() => { deleteGoal(goalDraft.id!); editGoal(null) }}>Delete</button>
              <button className="btn text-muted" onClick={() => { updateGoal(goalDraft.id!, { archived: !goalDraft.archived }); editGoal(null) }}>
                {goalDraft.archived ? 'Unarchive' : 'Archive'}
              </button>
            </>
          )}
          <button className="btn ml-auto" onClick={() => editGoal(null)}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={save}>
            {isNew ? 'Add goal' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PeriodPicker({ level, period, endDate, onPeriod, onEndDate, weekStartsOn }: {
  level: GoalLevel
  period: string
  endDate: string
  onPeriod: (p: string) => void
  onEndDate: (d: string) => void
  weekStartsOn: 0 | 1
}) {
  const year = Number(period.slice(0, 4)) || new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => year - 2 + i)
  const yearSelect = (onYear: (y: number) => void) => (
    <select className="field" value={year} onChange={(e) => onYear(Number(e.target.value))}>
      {years.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  )

  switch (level) {
    case 'year':
      return <label className="block"><span className="label">Year</span>{yearSelect((y) => onPeriod(String(y)))}</label>
    case 'half':
    case 'quarter': {
      const sep = level === 'half' ? '-H' : '-Q'
      const part = period.split(sep)[1] ?? '1'
      const parts = level === 'half' ? [['1', 'Jan – Jun'], ['2', 'Jul – Dec']] : [['1', 'Q1 · Jan – Mar'], ['2', 'Q2 · Apr – Jun'], ['3', 'Q3 · Jul – Sep'], ['4', 'Q4 · Oct – Dec']]
      return (
        <div className="grid grid-cols-2 gap-3">
          <label><span className="label">Year</span>{yearSelect((y) => onPeriod(`${y}${sep}${part}`))}</label>
          <label>
            <span className="label">{level === 'half' ? 'Half' : 'Quarter'}</span>
            <select className="field" value={part} onChange={(e) => onPeriod(`${year}${sep}${e.target.value}`)}>
              {parts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      )
    }
    case 'month':
      return (
        <label className="block">
          <span className="label">Month</span>
          <input type="month" className="field" value={period} onChange={(e) => e.target.value && onPeriod(e.target.value)} />
        </label>
      )
    case 'week':
      return (
        <label className="block">
          <span className="label">Week <span className="font-normal">({goalLabel({ level, period, endDate: null })})</span></span>
          <input type="date" className="field" value={period} onChange={(e) => e.target.value && onPeriod(periodFor('week', e.target.value, weekStartsOn))} />
        </label>
      )
    case 'custom':
      return (
        <div className="grid grid-cols-2 gap-3">
          <label><span className="label">Start</span><input type="date" className="field" value={period} onChange={(e) => e.target.value && onPeriod(e.target.value)} /></label>
          <label><span className="label">End</span><input type="date" className="field" min={period} value={endDate} onChange={(e) => onEndDate(e.target.value)} /></label>
        </div>
      )
  }
}
