import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { appVersion, checkForUpdate, dueForAutoCheck, installUpdate, type UpdateState } from '../lib/updates'
import { inDesktopApp } from '../lib/storage'
import { Icon } from './Icon'

interface Updates {
  state: UpdateState
  version: string
  check: () => Promise<void>
  install: () => Promise<void>
}

const Ctx = createContext<Updates | null>(null)
const useUpdates = () => useContext(Ctx)!

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })
  const [version, setVersion] = useState('')

  const check = async () => {
    setState({ kind: 'checking' })
    try {
      const update = await checkForUpdate()
      setState(update ? { kind: 'available', update } : { kind: 'none' })
    } catch (e) {
      setState({ kind: 'error', message: String(e) })
    }
  }

  const install = async () => {
    if (state.kind !== 'available') return
    const { update } = state
    setState({ kind: 'downloading', percent: 0 })
    try {
      await installUpdate(update, (percent) => setState({ kind: 'downloading', percent }))
    } catch (e) {
      setState({ kind: 'error', message: String(e) })
    }
  }

  useEffect(() => {
    appVersion().then(setVersion).catch(() => setVersion(''))
    // Quietly look for a new version once a day; errors (e.g. offline) are ignored here.
    if (dueForAutoCheck()) {
      checkForUpdate()
        .then((update) => update && setState({ kind: 'available', update }))
        .catch(() => {})
    }
  }, [])

  return <Ctx.Provider value={{ state, version, check, install }}>{children}</Ctx.Provider>
}

/** Small notice in the sidebar when a new version is ready. */
export function UpdateBanner() {
  const { state, install } = useUpdates()
  if (state.kind !== 'available' && state.kind !== 'downloading') return null
  return (
    <div className="mb-2 rounded-md bg-accent-soft p-2.5 text-xs">
      {state.kind === 'available' ? (
        <>
          <div className="font-medium text-accent">Version {state.update.version} is available</div>
          <button className="btn-primary mt-2 w-full justify-center py-1 text-xs" onClick={install}>Update now</button>
        </>
      ) : (
        <div className="text-accent">Updating… {state.percent !== null ? `${state.percent}%` : ''}</div>
      )}
    </div>
  )
}

/** "App version" section in Settings. */
export function UpdateSettings() {
  const { state, version, check, install } = useUpdates()
  if (!inDesktopApp) return <p className="text-sm text-muted">Updates work in the desktop app.</p>
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm">MyTodoTracker {version && `v${version}`}</span>
        <button className="btn ml-auto border border-line" disabled={state.kind === 'checking' || state.kind === 'downloading'} onClick={check}>
          <Icon name="repeat" size={14} /> {state.kind === 'checking' ? 'Checking…' : 'Check for updates'}
        </button>
      </div>
      {state.kind === 'none' && <p className="text-sm text-muted">You have the latest version.</p>}
      {state.kind === 'error' && <p className="text-sm text-danger">Couldn't check for updates: {state.message}</p>}
      {state.kind === 'available' && (
        <div className="rounded-md border border-line p-3">
          <div className="text-sm font-medium">Version {state.update.version} is available</div>
          {state.update.body && <p className="mt-1 text-xs whitespace-pre-wrap text-muted">{state.update.body}</p>}
          <button className="btn-primary mt-2" onClick={install}>Download and install</button>
        </div>
      )}
      {state.kind === 'downloading' && (
        <p className="text-sm text-accent">Downloading… {state.percent !== null ? `${state.percent}%` : ''} The app restarts when it's done.</p>
      )}
      <p className="text-xs text-muted">Updating keeps all your goals, tasks and settings. A backup copy is saved automatically before each new version starts.</p>
    </div>
  )
}
