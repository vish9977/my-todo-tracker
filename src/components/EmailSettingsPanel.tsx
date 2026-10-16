import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { EmailSettings } from '../types'
import { inDesktopApp } from '../lib/storage'
import { hasEmailPassword, saveEmailPassword, sendTestEmail } from '../lib/mail'

const PRESETS: { name: string; host: string; port: number }[] = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 465 },
  { name: 'Outlook / Hotmail', host: 'smtp-mail.outlook.com', port: 587 },
  { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 465 },
  { name: 'Zoho', host: 'smtp.zoho.in', port: 465 },
]

/** Email reminder setup: address, mail server and app password (stored in the system credential store). */
export function EmailSettingsPanel() {
  const { data, updateSettings } = useStore()
  const e = data.settings.email
  const set = (patch: Partial<EmailSettings>) => updateSettings({ email: { ...e, ...patch } })
  const [password, setPassword] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const preset = PRESETS.find((p) => p.host === e.smtpHost)?.name ?? 'Other'

  useEffect(() => {
    hasEmailPassword().then(setHasPassword).catch(() => setHasPassword(false))
  }, [])

  if (!inDesktopApp) return <p className="text-sm text-muted">Email reminders work in the desktop app.</p>

  const savePassword = async () => {
    try {
      await saveEmailPassword(password.replace(/\s+/g, ''))
      setPassword('')
      setHasPassword(true)
      setStatus({ ok: true, text: 'Password saved securely in Windows Credential Manager.' })
    } catch (err) {
      setStatus({ ok: false, text: `Could not save the password: ${err}` })
    }
  }

  const test = async () => {
    setBusy(true)
    setStatus(null)
    try {
      await sendTestEmail(e)
      setStatus({ ok: true, text: `Test email sent to ${e.to}. Check your inbox (and spam).` })
    } catch (err) {
      setStatus({ ok: false, text: String(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={e.enabled} onChange={(ev) => set({ enabled: ev.target.checked })} />
        Email me my reminders as well
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span className="label">Your email address</span>
          <input
            className="field"
            type="email"
            placeholder="you@gmail.com"
            defaultValue={e.to}
            onBlur={(ev) => ev.target.value.trim() !== e.to && set({ to: ev.target.value.trim(), username: e.username || ev.target.value.trim() })}
          />
        </label>
        <label>
          <span className="label">Email provider</span>
          <select
            className="field"
            value={preset}
            onChange={(ev) => {
              const p = PRESETS.find((x) => x.name === ev.target.value)
              if (p) set({ smtpHost: p.host, smtpPort: p.port })
            }}
          >
            {PRESETS.map((p) => <option key={p.name}>{p.name}</option>)}
            <option>Other</option>
          </select>
        </label>
        <label>
          <span className="label">Send from (login)</span>
          <input
            className="field"
            placeholder="Same as your address"
            defaultValue={e.username}
            onBlur={(ev) => ev.target.value.trim() !== e.username && set({ username: ev.target.value.trim() })}
          />
        </label>
        {preset === 'Other' && (
          <>
            <label>
              <span className="label">SMTP server</span>
              <input className="field" defaultValue={e.smtpHost} onBlur={(ev) => set({ smtpHost: ev.target.value.trim() })} />
            </label>
            <label>
              <span className="label">Port</span>
              <input className="field" type="number" defaultValue={e.smtpPort} onBlur={(ev) => set({ smtpPort: Number(ev.target.value) || 465 })} />
            </label>
          </>
        )}
        <label className="col-span-2">
          <span className="label">App password {hasPassword && <span className="font-normal text-accent">· saved</span>}</span>
          <div className="flex gap-2">
            <input
              className="field"
              type="password"
              placeholder={hasPassword ? 'Enter a new one to replace it' : '16-letter app password'}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
            <button className="btn border border-line shrink-0" disabled={!password.trim()} onClick={savePassword}>Save</button>
          </div>
        </label>
      </div>

      {preset === 'Gmail' && (
        <details className="rounded-md bg-panel p-3 text-xs text-muted">
          <summary className="cursor-pointer text-ink">How to get a Gmail app password</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Turn on 2-Step Verification for your Google account, if it isn't already.</li>
            <li>Open myaccount.google.com/apppasswords.</li>
            <li>Type "MyTodoTracker" as the app name and click Create.</li>
            <li>Copy the 16-letter password Google shows and paste it above. Your normal Gmail password won't work here.</li>
          </ol>
        </details>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={e.dailySummary} disabled={!e.enabled} onChange={(ev) => set({ dailySummary: ev.target.checked })} />
        Also email the morning plan summary
      </label>

      <div className="flex items-center gap-2">
        <button className="btn border border-line" disabled={busy || !e.to || !hasPassword} onClick={test}>
          {busy ? 'Sending…' : 'Send a test email'}
        </button>
        {status && <span className={`text-sm ${status.ok ? 'text-accent' : 'text-danger'}`}>{status.text}</span>}
      </div>
      <p className="text-xs text-muted">
        Emails are sent from your own account while this computer is on. If you're offline at reminder time, the email is sent as soon as you're back online (for up to 6 hours).
      </p>
    </div>
  )
}
