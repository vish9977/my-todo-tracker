import { useState } from 'react'
import { useStore } from '../store'
import { useUI } from '../ui'
import type { GoalLevel } from '../types'
import { fromDay, prettyMonth, prettyWeek, weekPeriod } from '../lib/dates'

/** Modal for creating or editing a monthly / weekly goal. */
export function GoalEditor() {
  const { data, addGoal, updateGoal, deleteGoal } = useStore()
  const { goalDraft, editGoal } = useUI()
  const [title, setTitle] = useState(goalDraft?.title ?? '')
  const [notes, setNotes] = useState(goalDraft?.notes ?? '')
  const [level, setLevel] = useState<GoalLevel>(goalDraft?.level ?? 'month')
  const [period, setPeriod] = useState(goalDraft?.period ?? '')
  const [parentId, setParentId] = useState(goalDraft?.parentId ?? '')
  const [areaId, setAreaId] = useState(goalDraft?.areaId ?? '')
  if (!goalDraft) return null

  const ws = data.settings.weekStartsOn
  const isNew = !goalDraft.id
  const monthGoals = data.goals.filter((g) => g.level === 'month' && !g.archived && g.id !== goalDraft.id)

  const changeLevel = (l: GoalLevel) => {
    setLevel(l)
    // Keep the period in the matching format: "yyyy-MM" or a week's first day.
    if (l === 'month') setPeriod(period.slice(0, 7))
    else setPeriod(weekPeriod(fromDay(period.length === 7 ? `${period}-01` : period), ws))
  }

  const save = () => {
    if (!title.trim() || !period) return
    const parent = level === 'week' && parentId ? parentId : null
    const fields = { title: title.trim(), notes, level, period, parentId: parent, areaId: areaId || null }
    if (isNew) addGoal(fields)
    else updateGoal(goalDraft.id!, fields)
    editGoal(null)
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4" onMouseDown={() => editGoal(null)}>
      <div
        className="w-full max-w-md rounded-xl border border-line bg-bg p-5 shadow-xl"
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
            placeholder="e.g. Publish 8 YouTube videos"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <div className="flex gap-1 rounded-lg bg-panel p-1">
            {(['month', 'week'] as const).map((l) => (
              <button
                key={l}
                onClick={() => changeLevel(l)}
                className={`flex-1 rounded-md py-1 text-sm ${level === l ? 'bg-bg font-medium shadow-sm' : 'text-muted'}`}
              >
                {l === 'month' ? 'Monthly goal' : 'Weekly goal'}
              </button>
            ))}
          </div>
          {level === 'month' ? (
            <label className="block">
              <span className="label">Month</span>
              <input type="month" className="field" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </label>
          ) : (
            <label className="block">
              <span className="label">Week {period && <span className="font-normal">({prettyWeek(period)})</span>}</span>
              <input
                type="date"
                className="field"
                value={period}
                onChange={(e) => e.target.value && setPeriod(weekPeriod(fromDay(e.target.value), ws))}
              />
            </label>
          )}
          {level === 'week' && (
            <label className="block">
              <span className="label">Part of monthly goal</span>
              <select className="field" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">None</option>
                {monthGoals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title} · {prettyMonth(g.period)}</option>
                ))}
              </select>
            </label>
          )}
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
          <button className="btn-primary" disabled={!title.trim() || !period} onClick={save}>
            {isNew ? 'Add goal' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
