import type { Update } from '@tauri-apps/plugin-updater'
import { inDesktopApp } from './storage'

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'none' }
  | { kind: 'available'; update: Update }
  | { kind: 'downloading'; percent: number | null }
  | { kind: 'error'; message: string }

const LAST_CHECK_KEY = 'last-update-check'
const DAY_MS = 86_400_000

export async function appVersion(): Promise<string> {
  if (!inDesktopApp) return 'browser preview'
  const { getVersion } = await import('@tauri-apps/api/app')
  return getVersion()
}

export async function checkForUpdate(): Promise<Update | null> {
  if (!inDesktopApp) return null
  const { check } = await import('@tauri-apps/plugin-updater')
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()))
  } catch {
    /* only used to avoid checking too often */
  }
  return check()
}

/** True when it's been a day since the last automatic check. */
export function dueForAutoCheck(): boolean {
  if (!inDesktopApp) return false
  try {
    return Date.now() - Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0) > DAY_MS
  } catch {
    return true
  }
}

/**
 * Downloads and installs the update, then restarts the app. Your data is untouched:
 * it lives in its own folder, and a copy is saved before the new version first opens it.
 */
export async function installUpdate(update: Update, onProgress: (percent: number | null) => void) {
  let total = 0
  let received = 0
  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') total = event.data.contentLength ?? 0
    if (event.event === 'Progress') {
      received += event.data.chunkLength
      onProgress(total ? Math.round((received / total) * 100) : null)
    }
  })
  const { relaunch } = await import('@tauri-apps/plugin-process')
  await relaunch()
}
