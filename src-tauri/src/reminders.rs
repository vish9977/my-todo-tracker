//! Fires task reminders from the Rust side, so they arrive on time even while
//! the window is hidden in the tray. The frontend sends the full list of
//! upcoming reminders whenever tasks change.

use std::collections::HashSet;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Deserialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_notification::NotificationExt;

/// Reminders this far in the past are still shown (e.g. the PC woke from sleep).
const GRACE_MS: i64 = 10 * 60 * 1000;
const TICK: Duration = Duration::from_secs(15);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    /// Unique per occurrence, e.g. "<taskId>@<timestamp>".
    pub key: String,
    pub title: String,
    pub body: String,
    pub at_ms: i64,
}

#[derive(Default)]
pub struct ReminderState {
    pending: Mutex<Vec<Reminder>>,
    fired: Mutex<HashSet<String>>,
}

#[tauri::command]
pub fn sync_reminders(state: State<'_, ReminderState>, reminders: Vec<Reminder>) {
    *state.pending.lock().unwrap() = reminders;
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Returns the reminders that are due now and not yet shown, marking them shown.
fn take_due(state: &ReminderState, now: i64) -> Vec<Reminder> {
    let pending = state.pending.lock().unwrap();
    let mut fired = state.fired.lock().unwrap();
    pending
        .iter()
        .filter(|r| r.at_ms <= now && now - r.at_ms <= GRACE_MS)
        .filter(|r| fired.insert(r.key.clone()))
        .cloned()
        .collect()
}

pub fn start(app: AppHandle) {
    std::thread::spawn(move || loop {
        let due = take_due(&app.state::<ReminderState>(), now_ms());
        for r in due {
            let _ = app
                .notification()
                .builder()
                .title(&r.title)
                .body(&r.body)
                .show();
        }
        std::thread::sleep(TICK);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn reminder(key: &str, at_ms: i64) -> Reminder {
        Reminder { key: key.into(), title: "t".into(), body: "b".into(), at_ms }
    }

    #[test]
    fn fires_due_reminders_once() {
        let state = ReminderState::default();
        *state.pending.lock().unwrap() = vec![
            reminder("past-too-old", 0),
            reminder("due", 1_000_000),
            reminder("future", 2_000_000),
        ];
        let first = take_due(&state, 1_000_500);
        assert_eq!(first.iter().map(|r| r.key.as_str()).collect::<Vec<_>>(), vec!["due"]);
        assert!(take_due(&state, 1_000_600).is_empty());
        let later = take_due(&state, 2_000_000);
        assert_eq!(later.len(), 1);
        assert_eq!(later[0].key, "future");
    }
}
