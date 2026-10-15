import { useEffect, useState } from 'react'
import { useStore, uid } from '../store'
import { inDesktopApp } from '../lib/storage'
import { backupName, openTextFile, parseBackup, saveTextFile, toBackup, toCsv } from '../lib/backup'
import type { Settings, Theme } from '../types'
import { Icon } from '../components/Icon'

const AREA_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#ca8a04', '#64748b']

export function SettingsView() {
  const { data, updateSettings, saveArea, deleteArea, replaceAll } = useStore()
  const s = data.settings
  const [message, setMessage] = useState('')

  const doExport = async (kind: 'json' | 'csv') => {
    try {
      const ok = await saveTextFile(backupName(kind), kind === 'json' ? toBackup(data) : toCsv(data), kind)
      if (ok) setMessage(kind === 'json' ? 'Backup saved.' : 'CSV saved.')
    } catch (e) {
      setMessage(`Could not save: ${e}`)
    }
  }
  const doImport = async () => {
    try {
      const text = await openTextFile()
      if (!text) return
      const next = parseBackup(text)
      if (!confirm(`Restore this backup? It has ${next.tasks.length} tasks and ${next.goals.length} goals, and will replace everything currently in the app.`)) return
      await replaceAll(next)
      setMessage('Backup restored.')
    } catch (e) {
      setMessage(`Could not restore: ${e instanceof Error ? e.message : e}`)
    }
  }

  return (
    <div className="max-w-xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <Group title="Appearance">
        <Row label="Theme">
          <select className="field w-40" value={s.theme} onChange={(e) => updateSettings({ theme: e.target.value as Theme })}>
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Row>
        <Row label="Week starts on">
          <select className="field w-40" value={s.weekStartsOn} onChange={(e) => updateSettings({ weekStartsOn: Number(e.target.value) as Settings['weekStartsOn'] })}>
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
          </select>
        </Row>
      </Group>

      <Group title="Reminders">
        <Row label="Daily plan notification" hint="A morning summary of today's tasks.">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={s.dailySummaryTime !== null} onChange={(e) => updateSettings({ dailySummaryTime: e.target.checked ? '09:00' : null })} />
            <input type="time" className="field w-32" disabled={s.dailySummaryTime === null} value={s.dailySummaryTime ?? ''} onChange={(e) => e.target.value && updateSettings({ dailySummaryTime: e.target.value })} />
          </div>
        </Row>
        <Row label="Default reminder" hint="Used when you give a task a time.">
          <select
            className="field w-40"
            value={s.defaultRemindBefore ?? ''}
            onChange={(e) => updateSettings({ defaultRemindBefore: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">No reminder</option>
            <option value={0}>At time of task</option>
            <option value={5}>5 min before</option>
            <option value={10}>10 min before</option>
            <option value={15}>15 min before</option>
            <option value={30}>30 min before</option>
          </select>
        </Row>
        {inDesktopApp && <AutostartRow />}
        <p className="mt-2 text-xs text-muted">
          Closing the window keeps MyTodoTracker running in the system tray so reminders still arrive. Use Quit from the tray icon to stop it.
        </p>
      </Group>

      <Group title="Areas">
        <div className="space-y-1.5">
          {data.areas.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <ColorPicker color={a.color} onChange={(color) => saveArea({ ...a, color })} />
              <input className="field" defaultValue={a.name} onBlur={(e) => e.target.value.trim() && e.target.value !== a.name && saveArea({ ...a, name: e.target.value.trim() })} />
              <button
                className="btn text-muted hover:text-danger"
                title="Delete area"
                onClick={() => confirm(`Delete "${a.name}"? Its tasks and goals are kept without an area.`) && deleteArea(a.id)}
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn mt-2 text-accent"
          onClick={() => saveArea({ id: uid(), name: 'New area', color: AREA_COLORS[data.areas.length % AREA_COLORS.length], sort: data.areas.length })}
        >
          <Icon name="plus" size={14} /> Add area
        </button>
        <p className="mt-1 text-xs text-muted">Tip: type #areaname in quick add, e.g. #youtube.</p>
      </Group>

      <Group title="Your data">
        <p className="mb-3 text-sm text-muted">
          Everything is stored only on this computer. Save a backup now and then, and before reinstalling.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn border border-line" onClick={() => doExport('json')}>Save backup (.json)</button>
          <button className="btn border border-line" onClick={doImport}>Restore backup</button>
          <button className="btn border border-line" onClick={() => doExport('csv')}>Export tasks (.csv)</button>
        </div>
        {message && <p className="mt-2 text-sm">{message}</p>}
      </Group>

      <Group title="Keyboard shortcuts">
        <ul className="space-y-1 text-sm text-muted">
          <li><Kbd>N</Kbd> new task</li>
          <li><Kbd>/</Kbd> search</li>
          <li><Kbd>1</Kbd>–<Kbd>4</Kbd> Today, Next 7 days, Calendar, Goals</li>
          <li><Kbd>Esc</Kbd> close task details</li>
          <li><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save a goal</li>
        </ul>
      </Group>
    </div>
  )
}

function AutostartRow() {
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => {
    import('@tauri-apps/plugin-autostart').then((m) => m.isEnabled()).then(setOn).catch(() => setOn(false))
  }, [])
  const toggle = async (next: boolean) => {
    const m = await import('@tauri-apps/plugin-autostart')
    await (next ? m.enable() : m.disable())
    setOn(await m.isEnabled())
  }
  return (
    <Row label="Start with my computer" hint="Needed for reminders after a restart.">
      <input type="checkbox" disabled={on === null} checked={!!on} onChange={(e) => toggle(e.target.checked)} />
    </Row>
  )
}

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button className="grid size-8 place-items-center rounded-md border border-line" onClick={() => setOpen(!open)}>
        <span className="size-3 rounded-full" style={{ background: color }} />
      </button>
      {open && (
        <div className="absolute top-9 left-0 z-10 grid grid-cols-5 gap-1 rounded-md border border-line bg-bg p-1.5 shadow-lg">
          {AREA_COLORS.map((c) => (
            <button key={c} className="size-6 rounded-full" style={{ background: c }} onClick={() => { onChange(c); setOpen(false) }} />
          ))}
        </div>
      )}
    </div>
  )
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="mb-3 border-b border-line pb-1.5 text-[13px] font-semibold">{title}</h2>
    {children}
  </section>
)

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-4 py-1.5">
    <div className="flex-1">
      <div className="text-sm">{label}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
    {children}
  </div>
)

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-xs text-ink">{children}</kbd>
)
