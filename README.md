# MyTodoTracker

A minimal, offline goals and tasks app for Windows (Mac and Linux also build). Built with Tauri, React and SQLite. Free, no account, all data stays on your computer.

## What it does

- **Goals:** yearly, 6-month, quarterly, monthly, weekly or custom-date goals. Any goal can sit under a bigger one (year → quarter → month → week) and holds dated tasks. Each goal shows progress across everything under it.
- **Tasks:** date, time, reminder, priority (P1–P4), area, goal, notes and a checklist.
- **Repeat:** every day, every weekday, weekly, monthly or custom days. Completing a repeating task creates the next one.
- **Reminders:** as many per task as you like (preset, custom "N minutes/hours/days before", or an exact date and time), optional "repeat until done", plus a morning summary. The app keeps running in the system tray and starts with your computer, so reminders still arrive.
- **Email:** reminders (and the morning summary) can also go to your inbox through your own Gmail/Outlook account using an app password, stored in Windows Credential Manager.
- **People:** assign a task to someone, email them the task, and optionally email them its reminders.
- **Views:** Today (with overdue and this month's goals), Next 7 days, Calendar (month), Goals, one page per area, Search with filters.
- **Areas:** Websites, YouTube, Blogging, Health, Home and Personal to start; rename, recolor, add or delete them in Settings.
- **Quick add:** type naturally, e.g. `Edit video tomorrow 6pm #youtube !1`, `Take medicine every day 9pm #health`, `Blood test 20 oct 8am #health`.
- **Backup:** save and restore a JSON backup, or export tasks to CSV.
- Light and dark theme, undo for complete and delete, keyboard shortcuts (`N` new task, `/` search, `1`–`4` switch views, `Esc` close).

## Install and update (Windows)

Download the latest `MyTodoTracker_x.y.z_x64-setup.exe` from [Releases](https://github.com/vish9977/my-todo-tracker/releases/latest) and run it. After that, update from inside the app: **Settings → App version → Check for updates** (the app also checks once a day and shows an "Update now" button).

Updating never touches your data. It lives in `%APPDATA%\com.vikas.mytodotracker`, and the app copies `tracker.db` to `backups\tracker-before-vX.Y.Z.db` before a new version first opens it (the last 10 are kept).

### Publishing a new version

Bump `version` in `src-tauri/tauri.conf.json`, `package.json` and `src-tauri/Cargo.toml`, then merge to `main`. The **Release** workflow builds a signed installer and `latest.json` and publishes them as a GitHub Release, which the in-app updater picks up. It needs the `TAURI_SIGNING_PRIVATE_KEY` repository secret; keep a safe copy of that key, because without it you can't ship updates to existing installs.

Windows may warn that the app is from an unknown publisher because it is not code-signed. Choose **More info → Run anyway**.

## Develop

Needs Node 20+ and Rust (https://rustup.rs). On Windows, also the "Desktop development with C++" tools from Visual Studio Build Tools.

```bash
npm install
npm run app:dev     # run the desktop app with hot reload
npm test            # unit tests
npm run app:build   # build an installer for this computer
```

`npm run dev` opens the UI in a normal browser. It saves to the browser's local storage instead of SQLite and has no notifications, which is handy for UI work.

## How it's put together

- `src/` React UI. `store.tsx` holds app state and saves every change; `lib/storage.ts` talks to SQLite (or localStorage in the browser); `lib/quickAdd.ts` parses quick-add text; `lib/reminders.ts` works out upcoming notifications.
- `src-tauri/` the desktop shell. `lib.rs` sets up the database tables, tray, close-to-tray and autostart; `reminders.rs` fires notifications on time from a background thread, so they work while the window is hidden.
- Data lives in `tracker.db` in the app's data folder (`%APPDATA%\com.vikas.mytodotracker` on Windows).

## Later

Android app from the same code (Tauri mobile), sync between laptop and phone, habits and streaks, focus timer, weekly review and stats, task templates, earnings log per area.
