import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Goal } from './types'

export type View =
  | { kind: 'today' }
  | { kind: 'upcoming' }
  | { kind: 'calendar' }
  | { kind: 'goals' }
  | { kind: 'area'; id: string }
  | { kind: 'search' }
  | { kind: 'settings' }

/** Goal being edited: an existing goal, or a draft for a new one. */
export type GoalDraft = Partial<Goal> & Pick<Goal, 'level' | 'period'>

interface UI {
  view: View
  setView: (v: View) => void
  selectedTaskId: string | null
  selectTask: (id: string | null) => void
  goalDraft: GoalDraft | null
  editGoal: (g: GoalDraft | null) => void
}

const Ctx = createContext<UI | null>(null)

export function useUI() {
  const ui = useContext(Ctx)
  if (!ui) throw new Error('useUI outside UIProvider')
  return ui
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<View>({ kind: 'today' })
  const [selectedTaskId, selectTask] = useState<string | null>(null)
  const [goalDraft, editGoal] = useState<GoalDraft | null>(null)
  const setView = (v: View) => {
    setViewState(v)
    selectTask(null)
  }
  return (
    <Ctx.Provider value={{ view, setView, selectedTaskId, selectTask, goalDraft, editGoal }}>
      {children}
    </Ctx.Provider>
  )
}
