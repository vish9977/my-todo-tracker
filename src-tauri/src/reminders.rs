//! Fires task reminders from the Rust side, so they arrive on time even while
//! the window is hidden in the tray. The frontend sends the full list of
//! upcoming reminders whenever tasks change.

use std::collections::HashSet;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Deserialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_notification::NotificationExt;

use crate::email::{self, EmailConfig, OutgoingEmail, Outbox};

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
    /// Also send this reminder by email.
    #[serde(default)]
    pub email: bool,
    /// Other people to email this reminder to (e.g. the person a task is assigned to).
    #[serde(default)]
    pub also_email: Vec<String>,
}

#[derive(Default)]
pub struct ReminderState {
    pending: Mutex<Vec<Reminder>>,
    fired: Mutex<HashSet<String>>,
    email: Mutex<Option<EmailConfig>>,
    outbox: Outbox,
}

#[tauri::command]
pub fn sync_reminders(state: State<'_, ReminderState>, reminders: Vec<Reminder>, email: Option<EmailConfig>) {
    *state.pending.lock().unwrap() = reminders;
    *state.email.lock().unwrap() = email;
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
    let notify_app = app.clone();
    std::thread::spawn(move || loop {
        let state = notify_app.state::<ReminderState>();
        let now = now_ms();
        let due = take_due(&state, now);
        let emailing = state.email.lock().unwrap().is_some();
        for r in due {
            let _ = notify_app
                .notification()
                .builder()
                .title(&r.title)
                .body(&r.body)
                .show();
            if emailing {
                let own = r.email.then_some(None);
                let others = r.also_email.iter().map(|a| Some(a.clone()));
                for to in own.into_iter().chain(others) {
                    state.outbox.queue.lock().unwrap().push(OutgoingEmail {
                        to,
                        subject: format!("Reminder: {}", r.title),
                        body: format!("{}\n\n{}\n\nSent by MyTodoTracker", r.title, r.body),
                        due_ms: r.at_ms,
                        next_try_ms: now,
                    });
                }
            }
        }
        std::thread::sleep(TICK);
    });

    // Emails go out on their own thread so a slow or offline mail server never delays notifications.
    std::thread::spawn(move || loop {
        let state = app.state::<ReminderState>();
        let config = state.email.lock().unwrap().clone();
        email::flush(&state.outbox, config.as_ref(), now_ms());
        std::thread::sleep(TICK);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn reminder(key: &str, at_ms: i64) -> Reminder {
        Reminder { key: key.into(), title: "t".into(), body: "b".into(), at_ms, email: false, also_email: vec![] }
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
