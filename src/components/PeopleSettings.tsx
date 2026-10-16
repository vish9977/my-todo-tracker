import { useState } from 'react'
import { useStore, uid } from '../store'
import { Icon } from './Icon'

/** People you can assign tasks to. */
export function PeopleSettings() {
  const { data, updateSettings, updateTask } = useStore()
  const people = data.settings.people
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const add = () => {
    if (!name.trim() || !validEmail) return
    updateSettings({ people: [...people, { id: uid(), name: name.trim(), email: email.trim() }] })
    setName('')
    setEmail('')
  }

  const remove = (id: string) => {
    const assigned = data.tasks.filter((t) => t.assigneeId === id)
    const person = people.find((p) => p.id === id)
    if (assigned.length && !confirm(`${person?.name} has ${assigned.length} assigned task(s). Remove them anyway? The tasks are kept, just unassigned.`)) return
    for (const t of assigned) updateTask(t.id, { assigneeId: null, remindAssignee: false })
    updateSettings({ people: people.filter((p) => p.id !== id) })
  }

  return (
    <div>
      <div className="space-y-1">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-hover">
            <Icon name="user" size={14} className="text-muted" />
            <span className="text-sm">{p.name}</span>
            <span className="flex-1 truncate text-xs text-muted">{p.email}</span>
            <span className="text-xs text-muted">{data.tasks.filter((t) => t.assigneeId === p.id && !t.done).length} open</span>
            <button className="btn text-muted hover:text-danger" title="Remove person" onClick={() => remove(p.id)}>
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className="field"
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn border border-line shrink-0" disabled={!name.trim() || !validEmail} onClick={add}>
          <Icon name="plus" size={14} /> Add
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Assign tasks to these people from a task's details, and email them the task.</p>
    </div>
  )
}
