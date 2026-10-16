import type { AppData, Goal, Task } from '../types'

/** The goal plus every goal under it, at any depth. */
export function goalAndDescendants(goal: Goal, data: AppData): Set<string> {
  const ids = new Set([goal.id])
  let added = true
  while (added) {
    added = false
    for (const g of data.goals) {
      if (g.parentId && ids.has(g.parentId) && !ids.has(g.id)) {
        ids.add(g.id)
        added = true
      }
    }
  }
  return ids
}

/** Tasks that count toward a goal: its own tasks plus tasks of all goals under it. */
export function tasksForGoal(goal: Goal, data: AppData): Task[] {
  const ids = goalAndDescendants(goal, data)
  return data.tasks.filter((t) => t.goalId && ids.has(t.goalId))
}

export function goalProgress(goal: Goal, data: AppData) {
  const tasks = tasksForGoal(goal, data)
  const done = tasks.filter((t) => t.done).length
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
}

/** Orders open tasks: by date, then time (untimed last), then priority. */
export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1
  const da = a.date ?? '9999', db = b.date ?? '9999'
  if (da !== db) return da < db ? -1 : 1
  const ta = a.time ?? '99', tb = b.time ?? '99'
  if (ta !== tb) return ta < tb ? -1 : 1
  if (a.priority !== b.priority) return a.priority - b.priority
  return a.sort - b.sort
}
