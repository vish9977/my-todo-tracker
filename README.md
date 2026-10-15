# MyTodoTracker

A minimal, offline goals and tasks app for Windows (Mac and Linux also build). Built with Tauri, React and SQLite. Free, no account, all data stays on your computer.

## What it does

- **Goals:** monthly goals, broken into weekly goals, broken into dated tasks. Each goal shows its progress.
- **Tasks:** date, time, reminder, priority (P1–P4), area, goal, notes and a checklist.
- **Repeat:** every day, every weekday, weekly, monthly or custom days. Completing a repeating task creates the next one.
- **Reminders:** desktop notifications at the set time, plus an optional morning summary. The app keeps running in the system tray when you close the window and starts with your computer, so reminders still arrive.
- **Views:** Today (with overdue and this month's goals), Next 7 days, Calendar (month), Goals, one page per area, Search with filters.
- **Areas:** Websites, YouTube, Blogging, Health, Home and Personal to start; rename, recolor, add or delete them in Settings.
- **Quick add:** type naturally, e.g. `Edit video tomorrow 6pm #youtube !1`, `Take medicine every day 9pm #health`, `Blood test 20 oct 8am #health`.
- **Backup:** save and restore a JSON backup, or export tasks to CSV.
- Light and dark theme, undo for complete and delete, keyboard shortcuts (`N` new task, `/` search, `1`–`4` switch views, `Esc` close).

## Install (Windows)

Every push to `main` builds a Windows installer on GitHub Actions. Open the repository's **Actions** tab, pick the latest **Build** run, download **MyTodoTracker-windows-installer**, unzip it and run the `.exe`.

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
